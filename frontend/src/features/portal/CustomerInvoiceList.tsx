import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  Receipt,
} from 'lucide-react';
import type { CustomerInvoice, InvoiceStatus, UserProfile } from '../../types/rbac';

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  receipt?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpayHandlerResponse) => void;
}

const RAZORPAY_SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically injects Razorpay's checkout.js script if not already loaded.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(`script[src="${RAZORPAY_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Dummy/Test Razorpay Key ID (can be overridden via VITE_RAZORPAY_KEY_ID)
const DUMMY_RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ||
  'rzp_test_1DP5mmOlF5G5ag';

const INITIAL_CUSTOMER_INVOICES: CustomerInvoice[] = [
  {
    id: 'c8b5e3f0-9012-4a2b-8d1a-100000000101',
    number: 'INV-2026-1042',
    subscriptionNumber: 'SUB-004192',
    planName: 'Brightloop Growth Cloud — Monthly',
    billingPeriod: '01 Oct 2026 – 31 Oct 2026',
    issueDate: '01 Oct 2026',
    dueDate: '05 Nov 2026',
    subtotal: 13500,
    discountTotal: 1000,
    taxTotal: 2250,
    grandTotal: 14750,
    status: 'CONFIRMED',
  },
  {
    id: 'c8b5e3f0-9012-4a2b-8d1a-100000000102',
    number: 'INV-2026-1089',
    subscriptionNumber: 'SUB-004510',
    planName: 'Odoo Connector Add-On — Monthly',
    billingPeriod: '15 Oct 2026 – 14 Nov 2026',
    issueDate: '15 Oct 2026',
    dueDate: '10 Nov 2026',
    subtotal: 4200,
    discountTotal: 0,
    taxTotal: 756,
    grandTotal: 4956,
    status: 'CONFIRMED',
  },
  {
    id: 'c8b5e3f0-9012-4a2b-8d1a-100000000098',
    number: 'INV-2026-0914',
    subscriptionNumber: 'SUB-004192',
    planName: 'Brightloop Growth Cloud — Monthly',
    billingPeriod: '01 Sep 2026 – 30 Sep 2026',
    issueDate: '01 Sep 2026',
    dueDate: '16 Sep 2026',
    subtotal: 13500,
    discountTotal: 1000,
    taxTotal: 2250,
    grandTotal: 14750,
    status: 'PAID',
    paymentId: 'pay_P8x9LmK20vQ1aZ',
    paidAt: '04 Sep 2026',
  },
  {
    id: 'c8b5e3f0-9012-4a2b-8d1a-100000000075',
    number: 'INV-2026-0803',
    subscriptionNumber: 'SUB-004192',
    planName: 'Brightloop Growth Cloud — Monthly',
    billingPeriod: '01 Aug 2026 – 31 Aug 2026',
    issueDate: '01 Aug 2026',
    dueDate: '16 Aug 2026',
    subtotal: 13500,
    discountTotal: 0,
    taxTotal: 2430,
    grandTotal: 15930,
    status: 'PAID',
    paymentId: 'pay_P1k7RtY82mW9cB',
    paidAt: '03 Aug 2026',
  },
];

const STATUS_STYLES: Record<
  InvoiceStatus,
  { label: string; badgeClass: string }
> = {
  CONFIRMED: {
    label: 'CONFIRMED • Payment Due',
    badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
  },
  PAID: {
    label: 'PAID',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  },
  DRAFT: {
    label: 'DRAFT',
    badgeClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300/60',
  },
  CANCELLED: {
    label: 'CANCELLED',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  },
};

interface CustomerInvoiceListProps {
  customer: UserProfile;
}

export const CustomerInvoiceList: React.FC<CustomerInvoiceListProps> = ({
  customer,
}) => {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>(
    INITIAL_CUSTOMER_INVOICES
  );
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'PAID'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentPaidBanner, setRecentPaidBanner] = useState<{
    invoiceNumber: string;
    paymentId: string;
    amount: number;
  } | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'ALL') return true;
    return inv.status === filter;
  });

  const totalDue = invoices
    .filter((i) => i.status === 'CONFIRMED')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const confirmedCount = invoices.filter((i) => i.status === 'CONFIRMED').length;

  /**
   * Loads window.Razorpay and opens the Razorpay Checkout overlay
   * with mock order details (amount in paise, currency: 'INR', dummy Key ID).
   */
  const handlePayNow = async (invoice: CustomerInvoice) => {
    setErrorMessage(null);
    setProcessingId(invoice.id);

    try {
      const sdkReady = await loadRazorpayCheckoutScript();
      if (!sdkReady || !window.Razorpay) {
        throw new Error(
          'Unable to load Razorpay Checkout SDK. Please verify your internet connection.'
        );
      }

      // Amount in smallest currency subunit (paise): ₹1 = 100 paise
      const amountInPaise = Math.round(invoice.grandTotal * 100);

      const options: RazorpayOptions = {
        key: DUMMY_RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Brightloop Subscriptions',
        description: `${invoice.number} • ${invoice.planName}`,
        receipt: invoice.number,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone || '9876543210',
        },
        notes: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          subscriptionNumber: invoice.subscriptionNumber,
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setProcessingId(null);
          },
        },
        handler: (response: RazorpayHandlerResponse) => {
          const paymentId =
            response.razorpay_payment_id || `pay_mock_${Date.now()}`;

          // Flip invoice status from CONFIRMED -> PAID
          setInvoices((prev) =>
            prev.map((item) =>
              item.id === invoice.id
                ? {
                    ...item,
                    status: 'PAID',
                    paymentId,
                    paidAt: 'Just now',
                  }
                : item
            )
          );

          setRecentPaidBanner({
            invoiceNumber: invoice.number,
            paymentId,
            amount: invoice.grandTotal,
          });
          setProcessingId(null);
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', (failure) => {
        setErrorMessage(
          failure?.error?.description ||
            'Payment could not be completed. Please try again.'
        );
        setProcessingId(null);
      });

      razorpayInstance.open();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error launching Razorpay Checkout.';
      setErrorMessage(message);
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Portal Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Strict Tenant Isolation • {customer.companyName || customer.name}
          </div>
          <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            My Invoices &amp; Billing
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review your subscription invoices and settle confirmed balances instantly via Razorpay.
          </p>
        </div>

        {/* Summary Balance Box */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Outstanding ({confirmedCount} Confirmed)
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              ₹{totalDue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Success Notification */}
      <AnimatePresence>
        {recentPaidBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">
                  Payment of ₹{recentPaidBanner.amount.toLocaleString('en-IN')}{' '}
                  successful for {recentPaidBanner.invoiceNumber}!
                </p>
                <p className="text-xs text-emerald-700">
                  Razorpay Payment Reference: <code>{recentPaidBanner.paymentId}</code>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecentPaidBanner(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            {errorMessage}
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-700 hover:underline"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          {(
            [
              { id: 'ALL', label: `All Invoices (${invoices.length})` },
              { id: 'CONFIRMED', label: `Confirmed / Due (${confirmedCount})` },
              {
                id: 'PAID',
                label: `Paid (${invoices.filter((i) => i.status === 'PAID').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          Secured by Razorpay Checkout (INR)
        </span>
      </div>

      {/* Invoice Cards List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice, index) => {
          const statusMeta = STATUS_STYLES[invoice.status];
          const isConfirmed = invoice.status === 'CONFIRMED';
          const isLoadingThis = processingId === invoice.id;

          return (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.06 }}
              className={`rounded-3xl border bg-white p-6 shadow-xs transition-all ${
                isConfirmed
                  ? 'border-indigo-200/90 ring-1 ring-indigo-500/10'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                {/* Left Info */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      {invoice.number}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {invoice.subscriptionNumber}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800">
                    {invoice.planName}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                    <span>Billing Period: {invoice.billingPeriod}</span>
                    <span>Issued: {invoice.issueDate}</span>
                    <span
                      className={
                        isConfirmed ? 'font-semibold text-amber-700' : ''
                      }
                    >
                      Due Date: {invoice.dueDate}
                    </span>
                  </div>
                </div>

                {/* Right Financial Breakdown & Action */}
                <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center lg:border-t-0 lg:pt-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-400">
                      Subtotal ₹{invoice.subtotal.toLocaleString('en-IN')}
                      {invoice.discountTotal > 0 &&
                        ` − Discount ₹${invoice.discountTotal.toLocaleString('en-IN')}`}{' '}
                      + GST ₹{invoice.taxTotal.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">
                      ₹{invoice.grandTotal.toLocaleString('en-IN')}
                    </div>
                    {invoice.status === 'PAID' && invoice.paymentId && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 sm:justify-end">
                        <Receipt className="h-3 w-3" />
                        Paid ({invoice.paidAt}) • {invoice.paymentId}
                      </p>
                    )}
                  </div>

                  {/* Prominent "Pay Now" Button ONLY for CONFIRMED invoices */}
                  {isConfirmed ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      disabled={isLoadingThis}
                      onClick={() => handlePayNow(invoice)}
                      className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <div className="inline-flex min-w-[148px] items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Settled
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerInvoiceList;
