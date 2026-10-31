import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';

export const reportsRouter = new Elysia({ prefix: '/reports' })
  .use(authPlugin)

  // GET /reports/dashboard - finance metrics
  .get(
    '/dashboard',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const today = new Date();

      // Date range filters for revenue
      const paymentWhere: any = {};
      if (query.startDate) {
        paymentWhere.paymentDate = { gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        paymentWhere.paymentDate = {
          ...paymentWhere.paymentDate,
          lte: new Date(query.endDate),
        };
      }

      // 1. Active subscriptions count
      const activeSubscriptionsPromise = prisma.subscription.count({
        where: { status: 'ACTIVE' },
      });

      // 2. Total revenue collected (Sum of payments)
      const revenueAggregatePromise = prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
        _count: { id: true },
      });

      // 3. Outstanding balance on unsettled invoices
      const outstandingInvoicesPromise = prisma.invoice.findMany({
        where: {
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
        select: {
          grandTotal: true,
          amountPaid: true,
        },
      });

      // 4. Overdue invoices (due_date < today AND status != PAID)
      const overdueInvoicesPromise = prisma.invoice.findMany({
        where: {
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { lt: today },
        },
        include: {
          customer: { select: { id: true, name: true, email: true, companyName: true } },
          subscription: { select: { id: true, number: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      });

      const [
        activeSubscriptionsCount,
        revenueAggregate,
        unsettledInvoices,
        overdueInvoices,
      ] = await Promise.all([
        activeSubscriptionsPromise,
        revenueAggregatePromise,
        outstandingInvoicesPromise,
        overdueInvoicesPromise,
      ]);

      // Calculate total outstanding
      const outstandingAmount = unsettledInvoices.reduce(
        (acc, inv) => acc + (Number(inv.grandTotal) - Number(inv.amountPaid)),
        0
      );

      return {
        summary: {
          activeSubscriptionsCount,
          totalRevenue: Number(revenueAggregate._sum.amount || 0),
          paymentsCount: revenueAggregate._count.id,
          outstandingAmount,
          overdueInvoicesCount: overdueInvoices.length,
        },
        overdueInvoices,
      };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  );
