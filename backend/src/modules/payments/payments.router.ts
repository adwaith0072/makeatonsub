import { Elysia, t } from 'elysia';
import { prisma } from '../../database/client.ts';
import { authPlugin, requireStaffOrAdmin, type AuthUser } from '../../middleware/auth.ts';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  ConfigurationError,
  BadRequestError,
  ServiceUnavailableError,
  ContractMismatchError,
} from '../../lib/razorpay.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleCreateRazorpayOrder({
  body,
  set,
}: {
  body: {
    amount: number;
    receipt?: string;
    receiptId?: string;
    invoiceId?: string;
    currency?: string;
    notes?: Record<string, string>;
  };
  set: any;
}) {
  const receipt = (body.receipt || body.receiptId || body.invoiceId || '').trim();
  if (!receipt) {
    set.status = 400;
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A receipt ID (receipt, receiptId, or invoiceId) is required.',
      },
    };
  }

  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    set.status = 400;
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number (in smallest currency subunit, e.g., paise).',
      },
    };
  }

  try {
    const notes: Record<string, string> = { ...(body.notes || {}) };
    if (body.invoiceId) {
      notes.invoiceId = body.invoiceId;
    }

    const order = await createRazorpayOrder({
      amount: body.amount,
      currency: body.currency || 'INR',
      receipt,
      notes,
    });

    set.status = 200;
    return order;
  } catch (err: any) {
    if (err instanceof ConfigurationError) {
      set.status = 500;
      return { error: { code: 'CONFIGURATION_ERROR', message: err.message } };
    }
    if (err instanceof BadRequestError) {
      set.status = 400;
      return {
        error: {
          code: 'BAD_REQUEST',
          message: err.description || err.message,
        },
      };
    }
    if (err instanceof ServiceUnavailableError) {
      set.status = 503;
      return { error: { code: 'SERVICE_UNAVAILABLE', message: err.message } };
    }
    if (err instanceof ContractMismatchError) {
      set.status = 502;
      return { error: { code: 'CONTRACT_MISMATCH', message: err.message } };
    }
    set.status = 500;
    return {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'Failed to create Razorpay order.',
      },
    };
  }
}

async function handleVerifyRazorpayPayment({
  user,
  body,
  set,
}: {
  user: AuthUser | null;
  body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    invoiceId?: string;
    receipt?: string;
    amount?: number;
    method?: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'UPI' | 'OTHER';
  };
  set: any;
}) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    invoiceId,
    receipt,
    amount,
    method,
  } = body;

  let isValid = false;
  try {
    isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
  } catch (err: any) {
    if (err instanceof ConfigurationError) {
      set.status = 500;
      return { error: { code: 'CONFIGURATION_ERROR', message: err.message } };
    }
    set.status = 400;
    return {
      verified: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: err?.message || 'Failed to verify Razorpay signature.',
      },
    };
  }

  if (!isValid) {
    set.status = 400;
    return {
      verified: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Razorpay payment signature verification failed.',
      },
    };
  }

  // Signature is valid -> update database status if matching invoice exists
  const targetLookup = (invoiceId || receipt || '').trim();
  let updatedRecord: { payment: any; invoice: any } | null = null;

  if (targetLookup) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: UUID_REGEX.test(targetLookup)
          ? { OR: [{ id: targetLookup }, { number: targetLookup }] }
          : { number: targetLookup },
      });

      if (invoice && invoice.status !== 'CANCELLED') {
        updatedRecord = await prisma.$transaction(async (tx: any) => {
          // Idempotency check: see if payment with this razorpay_payment_id already exists
          const existingPayment = await tx.payment.findFirst({
            where: {
              invoiceId: invoice.id,
              reference: razorpay_payment_id,
            },
          });

          if (existingPayment) {
            const currentInvoice = await tx.invoice.findUnique({
              where: { id: invoice.id },
            });
            return { payment: existingPayment, invoice: currentInvoice };
          }

          // Determine payment amount in major currency units (Invoice stores Decimal(12, 2))
          // If client passed amount in paise or didn't pass amount, fall back to remaining invoice balance
          const remainingBalance = Math.max(
            0,
            Number(invoice.grandTotal) - Number(invoice.amountPaid)
          );
          const recordedAmount =
            typeof amount === 'number' && amount > 0
              ? amount
              : remainingBalance > 0
                ? remainingBalance
                : Number(invoice.grandTotal);

          const payment = await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              method: (method || 'CARD') as any,
              amount: recordedAmount,
              paymentDate: new Date(),
              reference: razorpay_payment_id,
              notes: `Razorpay Order: ${razorpay_order_id}`,
              recordedById: user?.id || null,
            },
          });

          const newAmountPaid = Number(invoice.amountPaid) + recordedAmount;
          const isFullyPaid = newAmountPaid >= Number(invoice.grandTotal);

          const updatedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              status: isFullyPaid ? 'PAID' : invoice.status,
            },
          });

          return { payment, invoice: updatedInvoice };
        });
      }
    } catch (dbErr) {
      console.error('[Razorpay Verify] Database update error:', dbErr);
    }
  }

  set.status = 200;
  return {
    verified: true,
    message: 'Payment verified successfully.',
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    ...(updatedRecord
      ? { payment: updatedRecord.payment, invoice: updatedRecord.invoice }
      : {}),
  };
}

const createOrderSchema = {
  body: t.Object({
    amount: t.Number({ minimum: 1 }),
    receipt: t.Optional(t.String()),
    receiptId: t.Optional(t.String()),
    invoiceId: t.Optional(t.String()),
    currency: t.Optional(t.String()),
    notes: t.Optional(t.Record(t.String(), t.String())),
  }),
};

const verifyOrderSchema = {
  body: t.Object({
    razorpay_order_id: t.String({ minLength: 1 }),
    razorpay_payment_id: t.String({ minLength: 1 }),
    razorpay_signature: t.String({ minLength: 1 }),
    invoiceId: t.Optional(t.String()),
    receipt: t.Optional(t.String()),
    amount: t.Optional(t.Number()),
    method: t.Optional(
      t.Union([
        t.Literal('CASH'),
        t.Literal('BANK_TRANSFER'),
        t.Literal('CARD'),
        t.Literal('UPI'),
        t.Literal('OTHER'),
      ])
    ),
  }),
};

// POST /api/payment/create-order and POST /api/payment/verify
export const razorpayPaymentRouter = new Elysia({ prefix: '/api/payment' })
  .use(authPlugin)
  .post('/create-order', ({ body, set }) => handleCreateRazorpayOrder({ body, set }), createOrderSchema)
  .post(
    '/verify',
    ({ user, body, set }) => handleVerifyRazorpayPayment({ user: user as AuthUser | null, body, set }),
    verifyOrderSchema
  );

export const paymentsRouter = new Elysia({ prefix: '/payments' })
  .use(authPlugin)

  // POST /payments/create-order - create a Razorpay order
  .post('/create-order', ({ body, set }) => handleCreateRazorpayOrder({ body, set }), createOrderSchema)

  // POST /payments/verify - verify Razorpay signature and update invoice/payment status
  .post(
    '/verify',
    ({ user, body, set }) => handleVerifyRazorpayPayment({ user: user as AuthUser | null, body, set }),
    verifyOrderSchema
  )

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
      const result = await prisma.$transaction(async (tx: any) => {
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
