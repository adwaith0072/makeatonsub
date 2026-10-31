import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { prisma } from '../database/client.ts';

export const JWT_NAME = 'jwt';
export const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-super-secret-jwt-key-2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  companyName: string | null;
}

export const PUBLIC_PATHS = [
  '/health',
  '/swagger',
  '/swagger/json',
  '/auth/signup',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/payment/create-order',
  '/api/payment/verify',
];

export function isPublicRoute(path: string): boolean {
  if (path === '/' || path === '') return true;
  if (path.startsWith('/swagger')) return true;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export const authPlugin = new Elysia({ name: 'auth-plugin' })
  .use(
    jwt({
      name: JWT_NAME,
      secret: JWT_SECRET,
      exp: '7d',
    })
  )
  .derive({ as: 'global' }, async ({ request, jwt }): Promise<{ user: AuthUser | null }> => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return { user: null };
    }

    try {
      const payload = (await jwt.verify(token)) as { id?: string; email?: string } | null;
      if (!payload || !payload.id) {
        return { user: null };
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          isActive: true,
        },
      });

      if (!dbUser || !dbUser.isActive) {
        return { user: null };
      }

      return {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role as 'ADMIN' | 'STAFF' | 'CUSTOMER',
          companyName: dbUser.companyName,
        },
      };
    } catch {
      return { user: null };
    }
  })
  .onBeforeHandle({ as: 'global' }, ({ path, user, set }) => {
    // 1. Check if public route
    if (isPublicRoute(path)) {
      return;
    }

    // 2. Default protection: all other endpoints require authenticated user
    if (!user) {
      set.status = 401;
      return {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
        },
      };
    }
  });

// Role Guard Helpers
export function requireAdmin(user: AuthUser | null) {
  if (!user || user.role !== 'ADMIN') {
    return {
      status: 403,
      response: {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Admin privileges required.',
        },
      },
    };
  }
  return null;
}

export function requireStaffOrAdmin(user: AuthUser | null) {
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return {
      status: 403,
      response: {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Staff or Admin privileges required.',
        },
      },
    };
  }
  return null;
}

export function ensureCustomerAccess(user: AuthUser | null, customerId: string) {
  if (!user) {
    return {
      status: 401,
      response: {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      },
    };
  }

  // Admin and Staff can view any customer
  if (user.role === 'ADMIN' || user.role === 'STAFF') {
    return null;
  }

  // Customer can only access their own data
  if (user.role === 'CUSTOMER' && user.id !== customerId) {
    return {
      status: 403,
      response: {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: You may only access your own data.',
        },
      },
    };
  }

  return null;
}
