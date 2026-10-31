import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';

export const paymentsRouter = new Elysia({ prefix: '/payments' })
  .use(authPlugin)

  // GET /payments - list payments
  .get(
    '/',
    async ({ user, query }) => {
      const auth = user as AuthUser;
      const page = Math.max(1, parseInt(query.page || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25')));
      const skip = (page - 1) * pageSize;

      const where: any = {};

      if (auth.role === 'CUSTOMER') {
        where.invoice = { customerId: auth.id };
      } else if (query.customerId) {
        where.invoice = { customerId: query.customerId };
      }

      if (query.invoiceId) {
        where.invoiceId = query.invoiceId;
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                grandTotal: true,
                amountPaid: true,
                status: true,
                customer: { select: { id: true, name: true, email: true } },
              },
            },
            recordedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
      ]);

      return {
        data: payments,
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
        invoiceId: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
      }),
    }
  )

  // POST /payments - record a payment (Admin / Staff)
  .post(
    '/',
    async ({ user, body, set }) => {
      const guard = requireStaffOrAdmin(user as AuthUser);
      if (guard) {
        set.status = guard.status;
        return guard.response;
      }

      const { invoiceId, method, amount, paymentDate, reference, notes } = body;

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (!invoice) {
        set.status = 404;
        return { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } };
      }

      if (invoice.status === 'CANCELLED') {
        set.status = 409;
        return { error: { code: 'INVALID_STATUS', message: 'Cannot record payment for a cancelled invoice.' } };
      }

      const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

      // Transaction: create payment, update invoice amountPaid, flip to PAID if settled
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId,
            method: method as any,
            amount,
            paymentDate: parsedPaymentDate,
            reference: reference || null,
            notes: notes || null,
            recordedById: (user as AuthUser).id,
          },
        });

        // Compute new amountPaid
        const currentPaid = Number(invoice.amountPaid) + amount;
        const grandTotal = Number(invoice.grandTotal);
        const isFullyPaid = currentPaid >= grandTotal;

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: currentPaid,
            status: isFullyPaid ? 'PAID' : invoice.status,
          },
        });

        return { payment, invoice: updatedInvoice };
      });

      set.status = 201;
      return {
        message: 'Payment recorded successfully.',
        payment: result.payment,
        invoice: result.invoice,
      };
    },
    {
      body: t.Object({
        invoiceId: t.String(),
        method: t.Union([
          t.Literal('CASH'),
          t.Literal('BANK_TRANSFER'),
          t.Literal('CARD'),
          t.Literal('UPI'),
          t.Literal('OTHER'),
        ]),
        amount: t.Number({ minimum: 0.01 }),
        paymentDate: t.Optional(t.String()),
        reference: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  );
