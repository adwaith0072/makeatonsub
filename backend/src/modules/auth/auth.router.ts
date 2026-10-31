import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin } from '../../middleware/auth.ts';
import { securityPlugin } from '../../middleware/security.ts';
import { EmailService } from '../../services/email/email.service.ts';

// Password requirement: more than 8 characters (so >= 9), with at least one uppercase, one lowercase, and one special character
export function validatePassword(password: string): string | null {
  if (!password || password.length <= 8) {
    return 'Password must be more than 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

export const authRouter = new Elysia({ prefix: '/auth' })
  .use(securityPlugin)
  .use(authPlugin)

  // POST /auth/bootstrap-admin - Initial system administrator setup (allowed only if 0 admins exist)
  .post(
    '/bootstrap-admin',
    async ({ body, set, jwt, deviceFingerprint }) => {
      const existingAdmins = await prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (existingAdmins > 0) {
        set.status = 403;
        return {
          error: {
            code: 'FORBIDDEN',
            message: 'An administrator account already exists. Bootstrap setup is disabled.',
          },
        };
      }

      const { email, password, name } = body;
      const normalizedEmail = email.trim().toLowerCase();

      const pwdError = validatePassword(password);
      if (pwdError) {
        set.status = 400;
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: pwdError,
            fields: { password: pwdError },
          },
        };
      }

      const passwordHash = await Bun.password.hash(password);

      const adminUser = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { role: 'ADMIN', passwordHash },
        create: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const token = await jwt.sign({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        fp: deviceFingerprint,
      });

      set.status = 201;
      return {
        message: 'Master administrator account initialized successfully.',
        user: adminUser,
        token,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    }
  )

  // POST /auth/signup
  .post(
    '/signup',
    async ({ body, set, jwt, deviceFingerprint }) => {
      const { email, password, name, companyName, phone, billingAddress } = body;
      const normalizedEmail = email.trim().toLowerCase();

      // Check password rules
      const pwdError = validatePassword(password);
      if (pwdError) {
        set.status = 400;
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: pwdError,
            fields: { password: pwdError },
          },
        };
      }

      // Check email uniqueness
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        set.status = 409;
        return {
          error: {
            code: 'CONFLICT',
            message: 'An account with this email already exists.',
            fields: { email: 'already in use' },
          },
        };
      }

      const passwordHash = await Bun.password.hash(password);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: 'CUSTOMER',
          companyName: companyName || null,
          phone: phone || null,
          billingAddress: billingAddress || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          phone: true,
          billingAddress: true,
          createdAt: true,
        },
      });

      // Bind device fingerprint to the JWT token
      const token = await jwt.sign({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fp: deviceFingerprint,
      });

      // Dispatch welcome email and internal staff notification asynchronously
      EmailService.sendWelcomeEmail(newUser).catch((err) =>
        console.error('[EmailService] Failed to send welcome email:', err)
      );
      EmailService.sendStaffNotification({
        title: 'New Customer Registered',
        badge: 'NEW SIGNUP',
        badgeColor: 'blue',
        message: `${newUser.name} registered a new account on Brightloop Software.`,
        details: [
          { label: 'Customer Name', value: newUser.name },
          { label: 'Email', value: newUser.email },
          { label: 'Company', value: newUser.companyName || 'Individual' },
          { label: 'Phone', value: newUser.phone || '-' },
        ],
      }).catch((err) =>
        console.error('[EmailService] Failed to send staff signup alert:', err)
      );

      set.status = 201;
      return {
        message: 'Account created successfully.',
        user: newUser,
        token,
        deviceFingerprint,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        password: t.String(),
        companyName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        billingAddress: t.Optional(t.String()),
        // Honeypot fields for bot traps
        _hp_trap: t.Optional(t.String()),
        _bot_check: t.Optional(t.String()),
        website_url_hp: t.Optional(t.String()),
      }),
    }
  )

  // POST /auth/login
  .post(
    '/login',
    async ({ body, set, jwt, deviceFingerprint }) => {
      const { email, password } = body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user || !user.isActive) {
        set.status = 401;
        return {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        };
      }

      const isMatch = await Bun.password.verify(password, user.passwordHash);
      if (!isMatch) {
        set.status = 401;
        return {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        };
      }

      // Bind device fingerprint to the JWT token
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        fp: deviceFingerprint,
      });

      return {
        message: 'Login successful.',
        token,
        deviceFingerprint,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
        // Honeypot fields for bot traps
        _hp_trap: t.Optional(t.String()),
        _bot_check: t.Optional(t.String()),
      }),
    }
  )

  // GET /auth/me
  .get('/me', async ({ user, set, deviceFingerprint }) => {
    if (!user) {
      set.status = 401;
      return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        phone: true,
        billingAddress: true,
        taxNumber: true,
        createdAt: true,
      },
    });

    return { user: dbUser, currentDeviceFingerprint: deviceFingerprint };
  })

  // POST /auth/logout
  .post('/logout', () => {
    return { message: 'Logged out successfully.' };
  })

  // POST /auth/forgot-password
  .post(
    '/forgot-password',
    async ({ body }) => {
      const { email } = body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        const resetToken = crypto.randomUUID();
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken,
            resetTokenExpiry,
          },
        });

        // Dispatch password reset email with token link
        EmailService.sendPasswordResetEmail(user, resetToken).catch((err) =>
          console.error('[EmailService] Failed to send password reset email:', err)
        );
      }

      return {
        message: 'If that email address is registered, password reset instructions have been sent.',
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        _hp_trap: t.Optional(t.String()),
      }),
    }
  )

  // POST /auth/reset-password
  .post(
    '/reset-password',
    async ({ body, set }) => {
      const { token, newPassword } = body;

      const pwdError = validatePassword(newPassword);
      if (pwdError) {
        set.status = 400;
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: pwdError,
            fields: { password: pwdError },
          },
        };
      }

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        set.status = 400;
        return {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired password reset link.',
          },
        };
      }

      const passwordHash = await Bun.password.hash(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return {
        message: 'Password has been reset successfully. You can now log in.',
      };
    },
    {
      body: t.Object({
        token: t.String(),
        newPassword: t.String(),
      }),
    }
  );
