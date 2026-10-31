import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, requireAdmin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';
import { validatePassword } from '../auth/auth.router.ts';

export const usersRouter = new Elysia({ prefix: '/users' })
  .use(authPlugin)

  // GET /users - list users (Admin & Staff)
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
        search: t.Optional(t.String()),
      }),
    }
  )

  // POST /users/staff - create staff user (ADMIN ONLY)
  .post(
    '/staff',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, email, password } = body;
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
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
      }),
    }
  )

  // GET /users/:id - get single user
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
      },
    });

    if (!targetUser) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'User not found.' } };
    }

    return { user: targetUser };
  });
