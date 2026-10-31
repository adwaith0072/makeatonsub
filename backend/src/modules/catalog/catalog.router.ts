import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, requireAdmin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';

export const catalogRouter = new Elysia()
  .use(authPlugin)

  // ==================== PRODUCTS ====================

  // GET /products - list products
  .get(
    '/products',
    async ({ query }) => {
      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.isActive !== undefined) {
        where.isActive = query.isActive === 'true';
      }
      if (query.type) {
        where.type = query.type;
      }
      if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
      }

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            variants: { where: { isActive: true } },
            tax: true,
          },
          orderBy: { name: 'asc' },
        }),
      ]);

      return {
        data: products,
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
        isActive: t.Optional(t.String()),
        type: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )

  // POST /products - create product (ADMIN ONLY)
  .post(
    '/products',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, type, salesPrice, costPrice, notes, taxId } = body;

      const product = await prisma.product.create({
        data: {
          name,
          type,
          salesPrice,
          costPrice: costPrice ?? 0,
          notes: notes || null,
          taxId: taxId || null,
        },
        include: {
          tax: true,
        },
      });

      set.status = 201;
      return {
        message: 'Product created successfully.',
        product,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        type: t.String({ minLength: 1 }),
        salesPrice: t.Number({ minimum: 0 }),
        costPrice: t.Optional(t.Number({ minimum: 0 })),
        notes: t.Optional(t.String()),
        taxId: t.Optional(t.String()),
      }),
    }
  )

  // GET /products/:id
  .get('/products/:id', async ({ params, set }) => {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        tax: true,
      },
    });

    if (!product) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    return { product };
  })

  // PATCH /products/:id (ADMIN ONLY)
  .patch(
    '/products/:id',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const updated = await prisma.product.update({
        where: { id: params.id },
        data: body,
        include: { variants: true, tax: true },
      });

      return { message: 'Product updated successfully.', product: updated };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          type: t.String({ minLength: 1 }),
          salesPrice: t.Number({ minimum: 0 }),
          costPrice: t.Number({ minimum: 0 }),
          notes: t.String(),
          taxId: t.String(),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  // POST /products/:id/variants - add variant to product (e.g. Brand: Odoo +560)
  .post(
    '/products/:id/variants',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { attribute, value, extraPrice } = body;

      const variant = await prisma.productVariant.create({
        data: {
          productId: params.id,
          attribute,
          value,
          extraPrice: extraPrice ?? 0,
        },
      });

      set.status = 201;
      return {
        message: 'Product variant created successfully.',
        variant,
      };
    },
    {
      body: t.Object({
        attribute: t.String({ minLength: 1 }),
        value: t.String({ minLength: 1 }),
        extraPrice: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )

  // ==================== PLANS ====================

  // GET /plans - list plans
  .get(
    '/plans',
    async ({ query }) => {
      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.billingPeriod) {
        where.billingPeriod = query.billingPeriod.toUpperCase();
      }
      if (query.isActive !== undefined) {
        where.isActive = query.isActive === 'true';
      }

      const [total, plans] = await Promise.all([
        prisma.plan.count({ where }),
        prisma.plan.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { price: 'asc' },
        }),
      ]);

      return {
        data: plans,
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
        billingPeriod: t.Optional(t.String()),
        isActive: t.Optional(t.String()),
      }),
    }
  )

  // POST /plans - create plan (ADMIN ONLY)
  .post(
    '/plans',
    async ({ user, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const {
        name,
        description,
        price,
        billingPeriod,
        minQuantity,
        availableFrom,
        availableTo,
        autoClose,
        allowEarlyClose,
        allowPause,
        allowRenewal,
      } = body;

      const plan = await prisma.plan.create({
        data: {
          name,
          description: description || null,
          price,
          billingPeriod: billingPeriod as any,
          minQuantity: minQuantity ?? 1,
          availableFrom: availableFrom ? new Date(availableFrom) : null,
          availableTo: availableTo ? new Date(availableTo) : null,
          autoClose: autoClose ?? false,
          allowEarlyClose: allowEarlyClose ?? true,
          allowPause: allowPause ?? true,
          allowRenewal: allowRenewal ?? true,
        },
      });

      set.status = 201;
      return {
        message: 'Plan created successfully.',
        plan,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        price: t.Number({ minimum: 0 }),
        billingPeriod: t.Union([
          t.Literal('DAILY'),
          t.Literal('WEEKLY'),
          t.Literal('MONTHLY'),
          t.Literal('YEARLY'),
        ]),
        minQuantity: t.Optional(t.Number({ minimum: 1 })),
        availableFrom: t.Optional(t.String()),
        availableTo: t.Optional(t.String()),
        autoClose: t.Optional(t.Boolean()),
        allowEarlyClose: t.Optional(t.Boolean()),
        allowPause: t.Optional(t.Boolean()),
        allowRenewal: t.Optional(t.Boolean()),
      }),
    }
  )

  // GET /plans/:id
  .get('/plans/:id', async ({ params, set }) => {
    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Plan not found.' } };
    }

    return { plan };
  })

  // PATCH /plans/:id (ADMIN ONLY)
  .patch(
    '/plans/:id',
    async ({ user, params, body, set }) => {
      const guard = requireAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const updated = await prisma.plan.update({
        where: { id: params.id },
        data: {
          name: body.name,
          description: body.description,
          price: body.price,
          minQuantity: body.minQuantity,
          availableFrom: body.availableFrom ? new Date(body.availableFrom) : undefined,
          availableTo: body.availableTo ? new Date(body.availableTo) : undefined,
          autoClose: body.autoClose,
          allowEarlyClose: body.allowEarlyClose,
          allowPause: body.allowPause,
          allowRenewal: body.allowRenewal,
          isActive: body.isActive,
        },
      });

      return { message: 'Plan updated successfully.', plan: updated };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ minLength: 1 }),
          description: t.String(),
          price: t.Number({ minimum: 0 }),
          minQuantity: t.Number({ minimum: 1 }),
          availableFrom: t.String(),
          availableTo: t.String(),
          autoClose: t.Boolean(),
          allowEarlyClose: t.Boolean(),
          allowPause: t.Boolean(),
          allowRenewal: t.Boolean(),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  // ==================== QUOTATION TEMPLATES ====================

  // GET /quotation-templates
  .get('/quotation-templates', async () => {
    const templates = await prisma.quotationTemplate.findMany({
      where: { isActive: true },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return { data: templates };
  })

  // POST /quotation-templates (ADMIN / STAFF)
  .post(
    '/quotation-templates',
    async ({ user, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { name, planId, validityDays, description, lines } = body;

      const template = await prisma.quotationTemplate.create({
        data: {
          name,
          planId,
          validityDays: validityDays ?? 30,
          description: description || null,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity ?? 1,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      set.status = 201;
      return {
        message: 'Quotation template created successfully.',
        template,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        planId: t.String(),
        validityDays: t.Optional(t.Number({ minimum: 1 })),
        description: t.Optional(t.String()),
        lines: t.Array(
          t.Object({
            productId: t.String(),
            variantId: t.Optional(t.String()),
            quantity: t.Optional(t.Number({ minimum: 1 })),
            unitPrice: t.Number({ minimum: 0 }),
          })
        ),
      }),
    }
  );
