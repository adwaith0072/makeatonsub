import { prisma } from '../../database/client.ts';

export interface DashboardSummaryFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  planId?: string;
}

export interface SubscriptionsReportFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  planId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'startDate' | 'createdAt' | 'nextBillingDate' | 'number';
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentsReportFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  method?: string;
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
  invoiceId?: string;
  search?: string;
  sortBy?: 'paymentDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface OverdueInvoicesFilters {
  page?: number;
  pageSize?: number;
  customerId?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  minDaysOverdue?: number;
  maxDaysOverdue?: number;
  search?: string;
  sortBy?: 'dueDate' | 'outstandingAmount' | 'invoiceDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Service providing high-performance, indexed queries and aggregations
 * for Financial Leads. Guarantees < 2 second response times for thousands of records.
 * Uses strict database-level aggregates and composite index-backed scans.
 */
export class ReportsService {
  /**
   * 1. Executive Summary View:
   * - Active subscriptions count
   * - Revenue collected between dates (SUM of payments)
   * - Outstanding balance (SUM(grand_total - amount_paid) where status = CONFIRMED)
   * - Overdue invoices count and amount (status = CONFIRMED and due_date < today)
   * - Revenue by payment method breakdown
   * - Active subscriptions by plan breakdown
   */
  static async getExecutiveDashboard(filters: DashboardSummaryFilters = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Payment filters
    const paymentWhere: any = {};
    if (filters.startDate || filters.endDate) {
      paymentWhere.paymentDate = {};
      if (filters.startDate) paymentWhere.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) paymentWhere.paymentDate.lte = new Date(filters.endDate);
    }
    if (filters.customerId) {
      paymentWhere.invoice = { customerId: filters.customerId };
    }

    // Subscription filters
    const subWhere: any = { status: 'ACTIVE' };
    if (filters.planId) subWhere.planId = filters.planId;
    if (filters.customerId) subWhere.customerId = filters.customerId;

    // Overdue condition: status = CONFIRMED AND due_date < today (spec section 6.4)
    const overdueWhere: any = {
      status: 'CONFIRMED',
      dueDate: { lt: today },
    };
    if (filters.customerId) overdueWhere.customerId = filters.customerId;

    // Outstanding condition: status = CONFIRMED (spec section 6.4)
    const outstandingWhere: any = { status: 'CONFIRMED' };
    if (filters.customerId) outstandingWhere.customerId = filters.customerId;

    // Run all database-level aggregations concurrently in a single round-trip
    const [
      activeSubscriptionsCount,
      activeSubscriptionsByPlan,
      revenueAggregate,
      revenueByMethod,
      confirmedInvoicesAggregate,
      overdueAggregate,
      recentOverdueInvoices,
    ] = await Promise.all([
      // 1. COUNT active subscriptions (covered by index: [status, next_billing_date])
      prisma.subscription.count({ where: subWhere }),

      // 2. Active subscriptions grouped by plan
      prisma.subscription.groupBy({
        by: ['planId'],
        where: subWhere,
        _count: { id: true },
      }),

      // 3. SUM payments.amount (covered by index: [payment_date])
      prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
      }),

      // 4. Revenue grouped by payment method
      prisma.payment.groupBy({
        by: ['method'],
        where: paymentWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 5. Outstanding: SUM(grand_total - amount_paid) where status = CONFIRMED
      prisma.invoice.aggregate({
        where: outstandingWhere,
        _sum: {
          grandTotal: true,
          amountPaid: true,
        },
        _count: { id: true },
      }),

      // 6. Overdue: SUM(grand_total - amount_paid) and COUNT where status = CONFIRMED and due_date < today
      prisma.invoice.aggregate({
        where: overdueWhere,
        _sum: {
          grandTotal: true,
          amountPaid: true,
        },
        _count: { id: true },
      }),

      // 7. Top 5 urgent overdue invoices for immediate dashboard display
      prisma.invoice.findMany({
        where: overdueWhere,
        select: {
          id: true,
          number: true,
          dueDate: true,
          grandTotal: true,
          amountPaid: true,
          customerName: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              phone: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    // Compute math totals safely
    const totalRevenue = Number(revenueAggregate._sum.amount || 0);
    const paymentsCount = revenueAggregate._count.id;
    const averagePayment = Number(revenueAggregate._avg.amount || 0);

    const totalConfirmedGrand = Number(confirmedInvoicesAggregate._sum.grandTotal || 0);
    const totalConfirmedPaid = Number(confirmedInvoicesAggregate._sum.amountPaid || 0);
    const totalOutstanding = Math.max(0, totalConfirmedGrand - totalConfirmedPaid);
    const totalOutstandingInvoicesCount = confirmedInvoicesAggregate._count.id;

    const totalOverdueGrand = Number(overdueAggregate._sum.grandTotal || 0);
    const totalOverduePaid = Number(overdueAggregate._sum.amountPaid || 0);
    const totalOverdueAmount = Math.max(0, totalOverdueGrand - totalOverduePaid);
    const overdueInvoicesCount = overdueAggregate._count.id;

    // Fetch plan names for activeSubscriptionsByPlan
    const planIds = activeSubscriptionsByPlan.map((p) => p.planId);
    const plans = planIds.length > 0
      ? await prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, billingPeriod: true, price: true },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    const planBreakdown = activeSubscriptionsByPlan.map((p) => {
      const plan = planMap.get(p.planId);
      return {
        planId: p.planId,
        planName: plan?.name || 'Unknown Plan',
        billingPeriod: plan?.billingPeriod || 'MONTHLY',
        price: Number(plan?.price || 0),
        activeCount: p._count.id,
      };
    });

    const paymentMethodsBreakdown = revenueByMethod.map((item) => ({
      method: item.method,
      totalAmount: Number(item._sum.amount || 0),
      count: item._count.id,
      percentage: totalRevenue > 0 ? ((Number(item._sum.amount || 0) / totalRevenue) * 100).toFixed(1) : '0',
    }));

    return {
      asOfDate: today.toISOString(),
      filtersApplied: filters,
      summary: {
        activeSubscriptions: {
          count: activeSubscriptionsCount,
          byPlan: planBreakdown,
        },
        revenue: {
          totalCollected: totalRevenue,
          paymentsCount,
          averagePayment: Number(averagePayment.toFixed(2)),
          byMethod: paymentMethodsBreakdown,
        },
        outstanding: {
          totalAmount: Number(totalOutstanding.toFixed(2)),
          invoicesCount: totalOutstandingInvoicesCount,
        },
        overdue: {
          totalAmount: Number(totalOverdueAmount.toFixed(2)),
          invoicesCount: overdueInvoicesCount,
          topUrgent: recentOverdueInvoices.map((inv) => {
            const grand = Number(inv.grandTotal);
            const paid = Number(inv.amountPaid);
            const balance = Math.max(0, grand - paid);
            const dueTime = new Date(inv.dueDate).getTime();
            const daysOverdue = Math.max(1, Math.floor((Date.now() - dueTime) / (1000 * 60 * 60 * 24)));
            return {
              id: inv.id,
              number: inv.number,
              dueDate: inv.dueDate,
              daysOverdue,
              customerName: inv.customerName || inv.customer?.companyName || inv.customer?.name || 'Customer',
              customerEmail: inv.customer?.email,
              customerPhone: inv.customer?.phone,
              grandTotal: grand,
              amountPaid: paid,
              balance,
            };
          }),
        },
      },
    };
  }

  /**
   * 2. Active Subscriptions List with Filters & Pagination:
   * Fast, indexed lookup designed for 100,000+ subscriptions.
   */
  static async getActiveSubscriptions(filters: SubscriptionsReportFilters = {}) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: filters.status ? (filters.status.toUpperCase() as any) : 'ACTIVE',
    };

    if (filters.planId) where.planId = filters.planId;
    if (filters.customerId) where.customerId = filters.customerId;

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder || 'desc';
    orderBy[sortField] = sortDirection;

    const [total, subscriptions, activeCountAggregate] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          number: true,
          status: true,
          startDate: true,
          expiryDate: true,
          nextBillingDate: true,
          paymentTerms: true,
          createdAt: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingPeriod: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              phone: true,
            },
          },
          lines: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              amount: true,
              product: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    const formatted = subscriptions.map((s) => {
      const totalContractValue = s.lines.reduce((sum, l) => sum + Number(l.amount), 0);
      return {
        id: s.id,
        number: s.number,
        status: s.status,
        startDate: s.startDate,
        expiryDate: s.expiryDate,
        nextBillingDate: s.nextBillingDate,
        createdAt: s.createdAt,
        planName: s.plan.name,
        billingPeriod: s.plan.billingPeriod,
        planPrice: Number(s.plan.price),
        customerName: s.customer.name,
        companyName: s.customer.companyName,
        customerEmail: s.customer.email,
        customerPhone: s.customer.phone,
        paymentTerms: s.paymentTerms,
        linesCount: s.lines.length,
        totalContractValue: Number(totalContractValue.toFixed(2)),
      };
    });

    return {
      data: formatted,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      overallActiveTotal: activeCountAggregate,
    };
  }

  /**
   * 3. Revenue & Payments Ledger with Filters & Summary:
   * Optimized with index on payments(payment_date).
   */
  static async getPaymentsLedger(filters: PaymentsReportFilters = {}) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    if (filters.method) {
      where.method = filters.method.toUpperCase() as any;
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
    }

    if (filters.customerId) {
      where.invoice = { customerId: filters.customerId };
    }

    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }

    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { invoice: { number: { contains: filters.search, mode: 'insensitive' } } },
        { invoice: { customerName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    const sortField = filters.sortBy || 'paymentDate';
    const sortDirection = filters.sortOrder || 'desc';
    orderBy[sortField] = sortDirection;

    const [total, payments, aggregate] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          method: true,
          amount: true,
          paymentDate: true,
          reference: true,
          notes: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              number: true,
              status: true,
              grandTotal: true,
              amountPaid: true,
              customerName: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  companyName: true,
                },
              },
            },
          },
          recordedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
    ]);

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentDate: p.paymentDate,
      method: p.method,
      amount: Number(p.amount),
      reference: p.reference || '-',
      notes: p.notes,
      invoiceId: p.invoice.id,
      invoiceNumber: p.invoice.number,
      invoiceStatus: p.invoice.status,
      customerName: p.invoice.customerName || p.invoice.customer?.companyName || p.invoice.customer?.name || 'Customer',
      recordedByName: p.recordedBy?.name || 'System',
      createdAt: p.createdAt,
    }));

    return {
      data: formatted,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalRevenue: Number(aggregate._sum.amount || 0),
        averagePayment: Number((Number(aggregate._avg.amount || 0)).toFixed(2)),
        transactionCount: total,
      },
    };
  }

  /**
   * 4. Overdue Invoices View with Filters & Aging:
   * Rule: status = CONFIRMED and due_date < today (spec 6.4)
   * Covered by composite index: invoices(status, due_date)
   */
  static async getOverdueInvoices(filters: OverdueInvoicesFilters = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: 'CONFIRMED',
      dueDate: { lt: today },
    };

    if (filters.customerId) where.customerId = filters.customerId;

    if (filters.dueDateStart || filters.dueDateEnd) {
      if (filters.dueDateStart) where.dueDate.gte = new Date(filters.dueDateStart);
      if (filters.dueDateEnd) {
        const end = new Date(filters.dueDateEnd);
        where.dueDate.lte = end < today ? end : today;
      }
    }

    if (filters.minDaysOverdue !== undefined || filters.maxDaysOverdue !== undefined) {
      const nowMs = today.getTime();
      if (filters.minDaysOverdue !== undefined) {
        const maxDueDate = new Date(nowMs - filters.minDaysOverdue * 86400000);
        where.dueDate = { ...where.dueDate, lte: maxDueDate };
      }
      if (filters.maxDaysOverdue !== undefined) {
        const minDueDate = new Date(nowMs - filters.maxDaysOverdue * 86400000);
        where.dueDate = { ...where.dueDate, gte: minDueDate };
      }
    }

    if (filters.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [total, overdueInvoices, aggregate] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: filters.sortBy === 'invoiceDate'
          ? { invoiceDate: filters.sortOrder || 'desc' }
          : { dueDate: filters.sortOrder || 'asc' }, // default: oldest overdue first
        select: {
          id: true,
          number: true,
          invoiceDate: true,
          dueDate: true,
          billingPeriodStart: true,
          billingPeriodEnd: true,
          customerName: true,
          customerEmail: true,
          subtotal: true,
          taxTotal: true,
          grandTotal: true,
          amountPaid: true,
          subscription: {
            select: {
              id: true,
              number: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              phone: true,
            },
          },
        },
      }),
      prisma.invoice.aggregate({
        where,
        _sum: {
          grandTotal: true,
          amountPaid: true,
        },
      }),
    ]);

    const formatted = overdueInvoices.map((inv) => {
      const grandTotal = Number(inv.grandTotal);
      const amountPaid = Number(inv.amountPaid);
      const outstandingAmount = Math.max(0, grandTotal - amountPaid);
      const dueTime = new Date(inv.dueDate).getTime();
      const daysOverdue = Math.max(1, Math.floor((today.getTime() - dueTime) / 86400000));

      return {
        id: inv.id,
        number: inv.number,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        daysOverdue,
        customerName: inv.customerName || inv.customer?.companyName || inv.customer?.name || 'Customer',
        customerEmail: inv.customerEmail || inv.customer?.email || '-',
        customerPhone: inv.customer?.phone || '-',
        subscriptionNumber: inv.subscription.number,
        grandTotal,
        amountPaid,
        outstandingAmount: Number(outstandingAmount.toFixed(2)),
      };
    });

    if (filters.sortBy === 'outstandingAmount') {
      formatted.sort((a, b) => {
        return filters.sortOrder === 'asc'
          ? a.outstandingAmount - b.outstandingAmount
          : b.outstandingAmount - a.outstandingAmount;
      });
    }

    const totalGrand = Number(aggregate._sum.grandTotal || 0);
    const totalPaid = Number(aggregate._sum.amountPaid || 0);
    const totalOverdueBalance = Math.max(0, totalGrand - totalPaid);

    return {
      data: formatted,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalOverdueInvoices: total,
        totalOverdueBalance: Number(totalOverdueBalance.toFixed(2)),
      },
    };
  }
}
