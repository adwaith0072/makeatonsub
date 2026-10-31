import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import {
  authPlugin,
  requireAdmin,
  requireStaffOrAdmin,
  type AuthUser,
} from '../../middleware/auth.ts';
import { securityPlugin } from '../../middleware/security.ts';
import { validatePassword } from '../auth/auth.router.ts';

export const usersRouter = new Elysia({ prefix: '/users' })
  .use(securityPlugin)
  .use(authPlugin)

  // =========================================================================
  // 1. GENERAL USER LISTING & SEARCH (Admin & Staff)
  // =========================================================================
  .get(
    '/',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.role) {
        where.role = query.role.toUpperCase();
      }
      if (query.isActive !== undefined) {
        where.isActive = query.isActive === 'true';
      }
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { companyName: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            companyName: true,
            phone: true,
            billingAddress: true,
            taxNumber: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                subscriptions: true,
                invoices: true,
                paymentsRecorded: true,
              },
            },
          },
        }),
      ]);

      return {
        data: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        role: t.Optional(t.String()),
        isActive: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )

  // =========================================================================
  // 2. STAFF MANAGEMENT (Admin Only)
  // =========================================================================

  // GET /users/staff - List all internal staff members
  .get('/staff', async ({ user, set }) => {
    const guard = requireAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }

    const staffMembers = await prisma.user.findMany({
      where: { role: 'STAFF' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            paymentsRecorded: true,
          },
        },
      },
    });

    return {
      data: staffMembers,
      total: staffMembers.length,
    };
  })

  // POST /users/staff - Create new staff user (Admin Only)
  .post(
    '/staff',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, email, password, phone } = body;
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

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        set.status = 409;
        return {
          error: {
            code: 'CONFLICT',
            message: 'A user with this email already exists.',
          },
        };
      }

      const passwordHash = await Bun.password.hash(password);

      const staffUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: 'STAFF',
          phone: phone || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });

      set.status = 201;
      return {
        message: 'Staff member created successfully.',
        user: staffUser,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        password: t.String(),
        phone: t.Optional(t.String()),
      }),
    }
  )

  // PATCH /users/staff/:id - Update staff profile or active status (Admin Only)
  .patch(
    '/staff/:id',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const staff = await prisma.user.findFirst({
        where: { id: params.id, role: 'STAFF' },
      });

      if (!staff) {
        set.status = 404;
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Staff member not found.',
          },
        };
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: {
          name: body.name !== undefined ? body.name : undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
          isActive: body.isActive !== undefined ? body.isActive : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Staff profile updated successfully.',
        user: updated,
      };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          phone: t.String(),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  // POST /users/staff/:id/reset-password - Force reset staff password (Admin Only)
  .post(
    '/staff/:id/reset-password',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const staff = await prisma.user.findFirst({
        where: { id: params.id, role: 'STAFF' },
      });

      if (!staff) {
        set.status = 404;
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Staff member not found.',
          },
        };
      }

      const pwdError = validatePassword(body.newPassword);
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

      const passwordHash = await Bun.password.hash(body.newPassword);

      await prisma.user.update({
        where: { id: params.id },
        data: { passwordHash },
      });

      return {
        message: `Password for staff member ${staff.name} (${staff.email}) has been reset successfully.`,
      };
    },
    {
      body: t.Object({
        newPassword: t.String(),
      }),
    }
  )

  // DELETE /users/staff/:id - Deactivate staff member (Admin Only)
  .delete('/staff/:id', async ({ user, params, set }) => {
    const guard = requireAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }

    const staff = await prisma.user.findFirst({
      where: { id: params.id, role: 'STAFF' },
    });

    if (!staff) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Staff member not found.' } };
    }

    // Soft-deactivate to preserve historical payment/audit logs
    const deactivated = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, isActive: true },
    });

    return {
      message: `Staff member ${deactivated.name} has been deactivated.`,
      user: deactivated,
    };
  })

  // =========================================================================
  // 3. CUSTOMER MANAGEMENT (Admin & Staff)
  // =========================================================================

  // GET /users/customers - List customers with active subscription counts
  .get(
    '/customers',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = { role: 'CUSTOMER' };
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { companyName: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [total, customers] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            phone: true,
            billingAddress: true,
            taxNumber: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                subscriptions: true,
                invoices: true,
              },
            },
          },
        }),
      ]);

      return {
        data: customers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )

  // POST /users/customers - Create new customer by Staff or Admin
  .post(
    '/customers',
    async ({ user, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, email, password, companyName, phone, billingAddress, taxNumber } = body;
      const normalizedEmail = email.trim().toLowerCase();

      // Check if password provided or generate random secure temporary password
      const initialPassword = password || `TempPass!${Math.floor(1000 + Math.random() * 9000)}`;
      const pwdError = validatePassword(initialPassword);
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

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        set.status = 409;
        return {
          error: {
            code: 'CONFLICT',
            message: 'A user with this email already exists.',
          },
        };
      }

      const passwordHash = await Bun.password.hash(initialPassword);

      const customer = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: 'CUSTOMER',
          companyName: companyName || null,
          phone: phone || null,
          billingAddress: billingAddress || null,
          taxNumber: taxNumber || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          phone: true,
          billingAddress: true,
          taxNumber: true,
          isActive: true,
          createdAt: true,
        },
      });

      set.status = 201;
      return {
        message: 'Customer account created successfully.',
        customer,
        initialPassword: password ? undefined : initialPassword, // Provide temp password only if auto-generated
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        password: t.Optional(t.String()),
        companyName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        billingAddress: t.Optional(t.String()),
        taxNumber: t.Optional(t.String()),
      }),
    }
  )

  // PATCH /users/customers/:id - Update customer details (Staff & Admin)
  .patch(
    '/customers/:id',
    async ({ user, params, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const customer = await prisma.user.findFirst({
        where: { id: params.id, role: 'CUSTOMER' },
      });

      if (!customer) {
        set.status = 404;
        return { error: { code: 'NOT_FOUND', message: 'Customer not found.' } };
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: {
          name: body.name !== undefined ? body.name : undefined,
          companyName: body.companyName !== undefined ? body.companyName : undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
          billingAddress: body.billingAddress !== undefined ? body.billingAddress : undefined,
          taxNumber: body.taxNumber !== undefined ? body.taxNumber : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          phone: true,
          billingAddress: true,
          taxNumber: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Customer details updated successfully.',
        customer: updated,
      };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          companyName: t.String(),
          phone: t.String(),
          billingAddress: t.String(),
          taxNumber: t.String(),
        })
      ),
    }
  )

  // PATCH /users/customers/:id/status - Suspend or reactivate customer (Admin Only)
  .patch(
    '/customers/:id/status',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const customer = await prisma.user.findFirst({
        where: { id: params.id, role: 'CUSTOMER' },
      });

      if (!customer) {
        set.status = 404;
        return { error: { code: 'NOT_FOUND', message: 'Customer not found.' } };
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
        select: { id: true, name: true, email: true, isActive: true },
      });

      return {
        message: `Customer account ${updated.isActive ? 'activated' : 'suspended'}.`,
        customer: updated,
      };
    },
    {
      body: t.Object({
        isActive: t.Boolean(),
      }),
    }
  )

  // =========================================================================
  // 4. USER PROFILE BY ID
  // =========================================================================
  .get('/:id', async ({ user, params, set }) => {
    const auth = user as AuthUser;
    if (auth.role === 'CUSTOMER' && auth.id !== params.id) {
      set.status = 403;
      return {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: You may only view your own user profile.',
        },
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        phone: true,
        billingAddress: true,
        taxNumber: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
            paymentsRecorded: true,
          },
        },
      },
    });

    if (!targetUser) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'User not found.' } };
    }

    return { user: targetUser };
  });
