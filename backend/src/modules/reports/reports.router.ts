import { Elysia, t } from 'elysia';
import { authPlugin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';
import { ReportsService } from './reports.service.ts';

export const reportsRouter = new Elysia({ prefix: '/reports' })
  .use(authPlugin)
  .onBeforeHandle(({ user, set }) => {
    const guard = requireStaffOrAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }
  })

  // =========================================================================
  // 1. GET /reports/dashboard - Executive Summary View for Finance Lead
  // =========================================================================
  .get(
    '/dashboard',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      return ReportsService.getExecutiveDashboard({
        startDate: query.startDate,
        endDate: query.endDate,
        customerId: query.customerId,
        planId: query.planId,
      });
    },
    {
      detail: {
        summary: 'Executive Finance Dashboard Summary',
        description:
          'High-performance aggregation returning active subscriptions count & plan breakdown, collected revenue & method breakdown, total outstanding on confirmed invoices, and overdue metrics.',
        tags: ['Reports'],
      },
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        planId: t.Optional(t.String()),
      }),
    }
  )

  // =========================================================================
  // 2. GET /reports/subscriptions - Active & Filtered Subscriptions List
  // =========================================================================
  .get(
    '/subscriptions',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      return ReportsService.getActiveSubscriptions({
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 25,
        status: query.status,
        planId: query.planId,
        customerId: query.customerId,
        startDate: query.startDate,
        endDate: query.endDate,
        search: query.search,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as any,
      });
    },
    {
      detail: {
        summary: 'Filterable Active Subscriptions Report',
        description:
          'List active (or status-filtered) subscriptions with customer snapshots, recurring contract value, plan details, and indexed pagination.',
        tags: ['Reports'],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        status: t.Optional(t.String()),
        planId: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.Union([
          t.Literal('startDate'),
          t.Literal('createdAt'),
          t.Literal('nextBillingDate'),
          t.Literal('number'),
        ])),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    }
  )

  // =========================================================================
  // 3. GET /reports/revenue & GET /reports/payments - Payments & Revenue Stream
  // =========================================================================
  .get(
    '/payments',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      return ReportsService.getPaymentsLedger({
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 25,
        startDate: query.startDate,
        endDate: query.endDate,
        method: query.method,
        minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
        maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
        customerId: query.customerId,
        invoiceId: query.invoiceId,
        search: query.search,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as any,
      });
    },
    {
      detail: {
        summary: 'Revenue & Payments Ledger Report',
        description:
          'List collected payments with payment methods, invoice references, recorded by staff, date filters, amount ranges, and summary totals.',
        tags: ['Reports'],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        method: t.Optional(t.String()),
        minAmount: t.Optional(t.String()),
        maxAmount: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        invoiceId: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.Union([
          t.Literal('paymentDate'),
          t.Literal('amount'),
          t.Literal('createdAt'),
        ])),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    }
  )

  // Alias /revenue to /payments for API convenience
  .get(
    '/revenue',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      return ReportsService.getPaymentsLedger({
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 25,
        startDate: query.startDate,
        endDate: query.endDate,
        method: query.method,
        minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
        maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
        customerId: query.customerId,
        invoiceId: query.invoiceId,
        search: query.search,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as any,
      });
    },
    {
      detail: {
        summary: 'Revenue Collections Report',
        description: 'Alias to /reports/payments with summary revenue metrics.',
        tags: ['Reports'],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        method: t.Optional(t.String()),
        minAmount: t.Optional(t.String()),
        maxAmount: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        invoiceId: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.Union([
          t.Literal('paymentDate'),
          t.Literal('amount'),
          t.Literal('createdAt'),
        ])),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    }
  )

  // =========================================================================
  // 4. GET /reports/overdue - Overdue Invoices Ledger with Aging & Balance
  // =========================================================================
  .get(
    '/overdue',
    async ({ user, query, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      return ReportsService.getOverdueInvoices({
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 25,
        customerId: query.customerId,
        dueDateStart: query.dueDateStart,
        dueDateEnd: query.dueDateEnd,
        minDaysOverdue: query.minDaysOverdue ? parseInt(query.minDaysOverdue, 10) : undefined,
        maxDaysOverdue: query.maxDaysOverdue ? parseInt(query.maxDaysOverdue, 10) : undefined,
        search: query.search,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as any,
      });
    },
    {
      detail: {
        summary: 'Overdue Invoices Ledger Report',
        description:
          'List confirmed invoices past their due date (due_date < today) with computed days overdue, outstanding balance (grand_total - amount_paid), customer details, and aging filters.',
        tags: ['Reports'],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        dueDateStart: t.Optional(t.String()),
        dueDateEnd: t.Optional(t.String()),
        minDaysOverdue: t.Optional(t.String()),
        maxDaysOverdue: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.Union([
          t.Literal('dueDate'),
          t.Literal('outstandingAmount'),
          t.Literal('invoiceDate'),
        ])),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    }
  );
