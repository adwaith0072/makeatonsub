import { Elysia } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, type AuthUser } from '../../middleware/auth.ts';

export const portalRouter = new Elysia({ prefix: '/portal' })
  .use(authPlugin)

  // GET /portal/subscriptions - current customer's subscriptions
  .get('/subscriptions', async ({ user, set }) => {
    const auth = user as AuthUser;
    if (!auth) {
      set.status = 401;
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: auth.id },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: subscriptions };
  })

  // GET /portal/invoices - current customer's invoices
  .get('/invoices', async ({ user, set }) => {
    const auth = user as AuthUser;
    if (!auth) {
      set.status = 401;
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };
    }

    const invoices = await prisma.invoice.findMany({
      where: { customerId: auth.id },
      include: {
        lines: true,
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return { data: invoices };
  })

  // GET /portal/payments - current customer's payments
  .get('/payments', async ({ user, set }) => {
    const auth = user as AuthUser;
    if (!auth) {
      set.status = 401;
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };
    }

    const payments = await prisma.payment.findMany({
      where: {
        invoice: {
          customerId: auth.id,
        },
      },
      include: {
        invoice: {
          select: { id: true, number: true, grandTotal: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return { data: payments };
  });
