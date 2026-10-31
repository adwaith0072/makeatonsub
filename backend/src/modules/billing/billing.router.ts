import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, ensureCustomerAccess, requireAdmin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';
import { runBillingEngine } from './billing.service.ts';

export const billingRouter = new Elysia()
  .use(authPlugin)

  // ==================== INVOICES ====================

  // GET /invoices - list invoices
  .get(
    '/invoices',
    async ({ user, query }) => {
      const auth = user as AuthUser;
      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};

      // Security hard rule: Customer can ONLY see their own invoices
      if (auth.role === 'CUSTOMER') {
        where.customerId = auth.id;
      } else if (query.customerId) {
        where.customerId = query.customerId;
      }

      if (query.status) {
        where.status = query.status.toUpperCase();
      }

      if (query.isOverdue === 'true') {
        where.status = { not: 'PAID' };
        where.dueDate = { lt: new Date() };
      }

      const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            customer: { select: { id: true, name: true, email: true, companyName: true } },
            subscription: { select: { id: true, number: true } },
            payments: true,
          },
          orderBy: { invoiceDate: 'desc' },
        }),
      ]);

      return {
        data: invoices,
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
        status: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        isOverdue: t.Optional(t.String()),
      }),
    }
  )

  // GET /invoices/:id - single invoice details
  .get('/invoices/:id', async ({ user, params, set }) => {
    const auth = user as AuthUser;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        subscription: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } };
    }

    const accessError = ensureCustomerAccess(auth, invoice.customerId);
    if (accessError) {
      set.status = accessError.status;
      return accessError.response;
    }

    return { invoice };
  })

  // POST /invoices/:id/confirm (Admin / Staff)
  .post('/invoices/:id/confirm', async ({ user, params, set }) => {
    const guard = requireStaffOrAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } };
    }

    if (invoice.status !== 'DRAFT') {
      set.status = 409;
      return {
        error: {
          code: 'INVALID_STATUS',
          message: `Only draft invoices can be confirmed. Current status: ${invoice.status}`,
        },
      };
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: 'CONFIRMED' },
    });

    return { message: 'Invoice confirmed.', invoice: updated };
  })

  // POST /invoices/:id/cancel (Admin / Staff)
  .post('/invoices/:id/cancel', async ({ user, params, set }) => {
    const guard = requireStaffOrAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } };
    }

    if (invoice.status === 'PAID') {
      set.status = 409;
      return {
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot cancel an invoice that has already been paid.',
        },
      };
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Invoice cancelled.', invoice: updated };
  })

  // ==================== TAXES ====================

  // GET /taxes
  .get('/taxes', async () => {
    const taxes = await prisma.tax.findMany({
      where: { isActive: true },
      orderBy: { rate: 'asc' },
    });
    return { data: taxes };
  })

  // POST /taxes (ADMIN ONLY)
  .post(
    '/taxes',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, rate } = body;
      const tax = await prisma.tax.create({
        data: { name, rate },
      });

      set.status = 201;
      return { message: 'Tax rule created.', tax };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        rate: t.Number({ minimum: 0, maximum: 100 }),
      }),
    }
  )

  // PATCH /taxes/:id (ADMIN ONLY)
  .patch(
    '/taxes/:id',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const updated = await prisma.tax.update({
        where: { id: params.id },
        data: {
          name: body.name,
          rate: body.rate,
          isActive: body.isActive,
        },
      });

      return { message: 'Tax rule updated.', tax: updated };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          rate: t.Number({ minimum: 0, maximum: 100 }),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  // ==================== DISCOUNTS ====================

  // GET /discounts
  .get('/discounts', async ({ user, set }) => {
    const guard = requireStaffOrAdmin(user as AuthUser);
    if (guard) {
      set.status = guard.status;
      return guard.response;
    }

    const discounts = await prisma.discount.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: discounts };
  })

  // POST /discounts (ADMIN ONLY)
  .post(
    '/discounts',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const {
        name,
        code,
        type,
        value,
        scope,
        productId,
        minPurchaseAmount,
        minQuantity,
        startDate,
        endDate,
        usageLimit,
      } = body;

      const discount = await prisma.discount.create({
        data: {
          name,
          code: code ? code.toUpperCase() : null,
          type: type as any,
          value,
          scope: scope as any,
          productId: scope === 'PRODUCT' ? productId : null,
          minPurchaseAmount: minPurchaseAmount ?? null,
          minQuantity: minQuantity ?? null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          usageLimit: usageLimit ?? null,
        },
      });

      set.status = 201;
      return { message: 'Discount rule created.', discount };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        code: t.Optional(t.String()),
        type: t.Union([t.Literal('FIXED'), t.Literal('PERCENTAGE')]),
        value: t.Number({ minimum: 0 }),
        scope: t.Union([t.Literal('SUBSCRIPTION'), t.Literal('PRODUCT')]),
        productId: t.Optional(t.String()),
        minPurchaseAmount: t.Optional(t.Number({ minimum: 0 })),
        minQuantity: t.Optional(t.Number({ minimum: 1 })),
        startDate: t.String(),
        endDate: t.Optional(t.String()),
        usageLimit: t.Optional(t.Number({ minimum: 1 })),
      }),
    }
  )

  // PATCH /discounts/:id (ADMIN ONLY)
  .patch(
    '/discounts/:id',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const updated = await prisma.discount.update({
        where: { id: params.id },
        data: {
          name: body.name,
          code: body.code ? body.code.toUpperCase() : undefined,
          value: body.value,
          minPurchaseAmount: body.minPurchaseAmount,
          minQuantity: body.minQuantity,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          usageLimit: body.usageLimit,
          isActive: body.isActive,
        },
      });

      return { message: 'Discount rule updated.', discount: updated };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          code: t.String(),
          value: t.Number({ minimum: 0 }),
          minPurchaseAmount: t.Number({ minimum: 0 }),
          minQuantity: t.Number({ minimum: 1 }),
          endDate: t.String(),
          usageLimit: t.Number({ minimum: 1 }),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  // ==================== BILLING RUN ====================

  // POST /billing/run - run recurring billing engine (Admin / Staff)
  .post(
    '/billing/run',
    async ({ user, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const targetDate = body?.targetDate ? new Date(body.targetDate) : new Date();
      const result = await runBillingEngine(targetDate);

      return {
        message: 'Billing run completed.',
        summary: result,
      };
    },
    {
      body: t.Optional(
        t.Object({
          targetDate: t.Optional(t.String()),
        })
      ),
    }
  );
