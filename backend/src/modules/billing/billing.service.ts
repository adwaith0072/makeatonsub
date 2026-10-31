import { prisma } from '../../database/client.ts';

export interface BillingRunResult {
  processed: number;
  invoicesCreated: number;
  skipped: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}

export function advanceBillingDate(date: Date, period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'): Date {
  const next = new Date(date);
  switch (period) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export function calculatePaymentDueDays(paymentTerms: string): number {
  const lower = paymentTerms.toLowerCase().trim();
  if (lower.includes('15')) return 15;
  if (lower.includes('30')) return 30;
  if (lower.includes('45')) return 45;
  if (lower.includes('60')) return 60;
  return 0; // Immediate
}

export async function runBillingEngine(runDate = new Date()): Promise<BillingRunResult> {
  const today = new Date(runDate);
  today.setHours(23, 59, 59, 999);

  // 1. Find all active subscriptions due for billing
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      nextBillingDate: {
        lte: today,
      },
    },
    include: {
      plan: true,
      customer: true,
      discount: true,
      lines: {
        include: {
          product: true,
          variant: true,
          tax: true,
        },
      },
    },
  });

  const result: BillingRunResult = {
    processed: dueSubscriptions.length,
    invoicesCreated: 0,
    skipped: 0,
    errors: [],
  };

  for (const sub of dueSubscriptions) {
    if (!sub.nextBillingDate) continue;

    try {
      const periodStart = new Date(sub.nextBillingDate);
      const periodEnd = advanceBillingDate(periodStart, sub.plan.billingPeriod as any);

      // Check idempotency: does an invoice already exist for this subscription and periodStart?
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          subscriptionId_billingPeriodStart: {
            subscriptionId: sub.id,
            billingPeriodStart: periodStart,
          },
        },
      });

      if (existingInvoice) {
        // Already billed for this period, advance date safely and skip
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: periodEnd },
        });
        result.skipped++;
        continue;
      }

      // Calculate lines, taxes, and discounts
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      // Check discount eligibility
      let activeDiscount = sub.discount;
      let isDiscountValid = false;

      if (activeDiscount && activeDiscount.isActive) {
        const afterStart = new Date(activeDiscount.startDate) <= today;
        const beforeEnd = !activeDiscount.endDate || new Date(activeDiscount.endDate) >= today;
        const withinLimit = activeDiscount.usageLimit === null || activeDiscount.usageCount < activeDiscount.usageLimit;

        if (afterStart && beforeEnd && withinLimit) {
          isDiscountValid = true;
        }
      }

      // First pass: line amounts and taxes
      const invoiceLinesData: Array<{
        productId: string;
        variantId: string | null;
        description: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        taxRate: number;
        taxAmount: number;
        lineTotal: number;
      }> = [];

      for (const line of sub.lines) {
        const basePrice = Number(line.unitPrice);
        const qty = line.quantity;
        const lineGross = basePrice * qty;
        subtotal += lineGross;

        // Discount for this specific product if scoped to product
        let lineDiscount = 0;
        if (
          isDiscountValid &&
          activeDiscount &&
          activeDiscount.scope === 'PRODUCT' &&
          activeDiscount.productId === line.productId
        ) {
          if (activeDiscount.type === 'PERCENTAGE') {
            lineDiscount = (lineGross * Number(activeDiscount.value)) / 100;
          } else {
            lineDiscount = Math.min(Number(activeDiscount.value), lineGross);
          }
          totalDiscount += lineDiscount;
        }

        const netAfterLineDiscount = Math.max(0, lineGross - lineDiscount);
        const taxRate = line.tax ? Number(line.tax.rate) : 0;
        const taxAmount = (netAfterLineDiscount * taxRate) / 100;
        totalTax += taxAmount;

        const lineTotal = netAfterLineDiscount + taxAmount;

        const desc = line.variant
          ? `${line.product.name} (${line.variant.attribute}: ${line.variant.value})`
          : line.product.name;

        invoiceLinesData.push({
          productId: line.productId,
          variantId: line.variantId,
          description: desc,
          quantity: qty,
          unitPrice: basePrice,
          discountAmount: lineDiscount,
          taxRate,
          taxAmount,
          lineTotal,
        });
      }

      // If discount is scoped to whole SUBSCRIPTION
      if (isDiscountValid && activeDiscount && activeDiscount.scope === 'SUBSCRIPTION') {
        const meetsMinAmount = !activeDiscount.minPurchaseAmount || subtotal >= Number(activeDiscount.minPurchaseAmount);
        const totalItems = sub.lines.reduce((acc, l) => acc + l.quantity, 0);
        const meetsMinQty = !activeDiscount.minQuantity || totalItems >= activeDiscount.minQuantity;

        if (meetsMinAmount && meetsMinQty) {
          if (activeDiscount.type === 'PERCENTAGE') {
            totalDiscount = (subtotal * Number(activeDiscount.value)) / 100;
          } else {
            totalDiscount = Math.min(Number(activeDiscount.value), subtotal);
          }
        }
      }

      const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

      // Due date calculation
      const dueDays = calculatePaymentDueDays(sub.paymentTerms);
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + dueDays);

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Execute in atomic transaction
      await prisma.$transaction(async (tx) => {
        // 1. Create invoice
        await tx.invoice.create({
          data: {
            number: invoiceNumber,
            subscriptionId: sub.id,
            customerId: sub.customerId,
            status: 'CONFIRMED',
            invoiceDate,
            dueDate,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            customerName: sub.customer.name,
            customerEmail: sub.customer.email,
            billingAddress: sub.customer.billingAddress,
            subtotal,
            discountTotal: totalDiscount,
            taxTotal: totalTax,
            grandTotal,
            lines: {
              create: invoiceLinesData,
            },
          },
        });

        // 2. Increment discount usage count if used
        if (isDiscountValid && activeDiscount && totalDiscount > 0) {
          await tx.discount.update({
            where: { id: activeDiscount.id },
            data: {
              usageCount: { increment: 1 },
            },
          });
        }

        // 3. Advance subscription next billing date
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            nextBillingDate: periodEnd,
          },
        });
      });

      result.invoicesCreated++;
    } catch (err: any) {
      result.errors.push({
        subscriptionId: sub.id,
        error: err.message || 'Unknown billing error',
      });
    }
  }

  return result;
}
