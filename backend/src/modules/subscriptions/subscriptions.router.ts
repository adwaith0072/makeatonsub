import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, ensureCustomerAccess, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';

// Allowed state transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUOTATION', 'CLOSED'],
  QUOTATION: ['CONFIRMED', 'CLOSED'],
  CONFIRMED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  CLOSED: [], // terminal state
};

export const subscriptionsRouter = new Elysia({ prefix: '/subscriptions' })
  .use(authPlugin)

  // GET /subscriptions - list subscriptions
  .get(
    '/',
    async ({ user, query }) => {
      const auth = user as AuthUser;
      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};

      // Security hard rule: Customer can ONLY see their own subscriptions
      if (auth.role === 'CUSTOMER') {
        where.customerId = auth.id;
      } else if (query.customerId) {
        where.customerId = query.customerId;
      }

      if (query.status) {
        where.status = query.status.toUpperCase();
      }

      const [total, subscriptions] = await Promise.all([
        prisma.subscription.count({ where }),
        prisma.subscription.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            plan: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              },
            },
            discount: true,
            lines: {
              include: {
                product: true,
                variant: true,
                tax: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        data: subscriptions,
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
      }),
    }
  )

  // POST /subscriptions - create subscription (Admin / Staff)
  .post(
    '/',
    async ({ user, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const {
        customerId,
        planId,
        templateId,
        discountId,
        startDate,
        expiryDate,
        paymentTerms,
        notes,
        lines,
      } = body;

      const parsedStartDate = new Date(startDate);
      let calculatedLines: Array<{
        productId: string;
        variantId: string | null;
        quantity: number;
        unitPrice: number;
        taxId: string | null;
        amount: number;
      }> = [];

      let quotationValidUntil: Date | null = null;

      // If created from template, copy lines from template if not provided
      if (templateId) {
        const template = await prisma.quotationTemplate.findUnique({
          where: { id: templateId },
          include: { lines: { include: { product: true } } },
        });

        if (template) {
          quotationValidUntil = new Date(parsedStartDate.getTime() + template.validityDays * 24 * 60 * 60 * 1000);

          if (!lines || lines.length === 0) {
            calculatedLines = template.lines.map((tl) => {
              const amount = Number(tl.unitPrice) * tl.quantity;
              return {
                productId: tl.productId,
                variantId: tl.variantId,
                quantity: tl.quantity,
                unitPrice: Number(tl.unitPrice),
                taxId: tl.product.taxId,
                amount,
              };
            });
          }
        }
      }

      // If explicit lines provided, use them
      if (lines && lines.length > 0) {
        calculatedLines = lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: l.quantity ?? 1,
          unitPrice: l.unitPrice,
          taxId: l.taxId || null,
          amount: l.unitPrice * (l.quantity ?? 1),
        }));
      }

      // Generate unique subscription number: SUB-YYYYMMDD-XXXX
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const subNumber = `SUB-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      const subscription = await prisma.subscription.create({
        data: {
          number: subNumber,
          customerId,
          planId,
          templateId: templateId || null,
          discountId: discountId || null,
          status: 'DRAFT',
          quotationValidUntil,
          startDate: parsedStartDate,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          nextBillingDate: parsedStartDate,
          paymentTerms: paymentTerms || 'Immediate',
          notes: notes || null,
          lines: {
            create: calculatedLines,
          },
        },
        include: {
          plan: true,
          customer: {
            select: { id: true, name: true, email: true, companyName: true },
          },
          discount: true,
          lines: {
            include: { product: true, variant: true, tax: true },
          },
        },
      });

      set.status = 201;
      return {
        message: 'Subscription created successfully.',
        subscription,
      };
    },
    {
      body: t.Object({
        customerId: t.String(),
        planId: t.String(),
        templateId: t.Optional(t.String()),
        discountId: t.Optional(t.String()),
        startDate: t.String(),
        expiryDate: t.Optional(t.String()),
        paymentTerms: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        lines: t.Optional(
          t.Array(
            t.Object({
              productId: t.String(),
              variantId: t.Optional(t.String()),
              quantity: t.Optional(t.Number({ minimum: 1 })),
              unitPrice: t.Number({ minimum: 0 }),
              taxId: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  // GET /subscriptions/:id
  .get('/:id', async ({ user, params, set }) => {
    const auth = user as AuthUser;

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        customer: {
          select: { id: true, name: true, email: true, companyName: true, billingAddress: true },
        },
        discount: true,
        lines: {
          include: { product: true, variant: true, tax: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Subscription not found.' } };
    }

    // Security check
    const accessError = ensureCustomerAccess(auth, subscription.customerId);
    if (accessError) {
      set.status = accessError.status;
      return accessError.response;
    }

    return { subscription };
  })

  // POST /subscriptions/:id/status - transition status (Admin / Staff)
  .post(
    '/:id/status',
    async ({ user, params, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { status: targetStatus } = body;
      const sub = await prisma.subscription.findUnique({
        where: { id: params.id },
      });

      if (!sub) {
        set.status = 404;
        return { error: { code: 'NOT_FOUND', message: 'Subscription not found.' } };
      }

      const currentStatus = sub.status;
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(targetStatus)) {
        set.status = 409;
        return {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition subscription from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedNext.join(', ')}`,
          },
        };
      }

      // Check quotation expiry when moving to CONFIRMED
      if (targetStatus === 'CONFIRMED' && sub.quotationValidUntil) {
        if (new Date() > new Date(sub.quotationValidUntil)) {
          set.status = 409;
          return {
            error: {
              code: 'QUOTATION_EXPIRED',
              message: 'This quotation has expired and cannot be confirmed.',
            },
          };
        }
      }

      const updated = await prisma.subscription.update({
        where: { id: params.id },
        data: { status: targetStatus as any },
        include: {
          plan: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        message: `Subscription transitioned to ${targetStatus}.`,
        subscription: updated,
      };
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal('QUOTATION'),
          t.Literal('CONFIRMED'),
          t.Literal('ACTIVE'),
          t.Literal('PAUSED'),
          t.Literal('CLOSED'),
        ]),
      }),
    }
  );
