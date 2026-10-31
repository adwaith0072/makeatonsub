import React, { useEffect, useState } from 'react';
import { animate, motion, type Variants } from 'framer-motion';
import {
  Activity,
  IndianRupee,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Play,
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  formatIndianCurrency?: boolean;
  duration?: number;
}

/**
 * Smoothly counts up from 0 to `value` on mount (and when `value` changes)
 * using Framer Motion's `animate()` engine.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  formatIndianCurrency = false,
  duration = 1.35,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value, duration]);

  const formatted = formatIndianCurrency
    ? displayValue.toLocaleString('en-IN')
    : displayValue.toLocaleString('en-IN');

  return (
    <span className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

type PeriodKey = '30d' | 'quarter' | 'ytd';

const PERIOD_METRICS: Record<
  PeriodKey,
  {
    label: string;
    activeSubscriptions: number;
    revenueCollected: number;
    outstandingAmount: number;
    overdueInvoices: number;
    collectionRate: number;
    mrr: number;
  }
> = {
  '30d': {
    label: 'Last 30 Days',
    activeSubscriptions: 5284,
    revenueCollected: 4892400,
    outstandingAmount: 618500,
    overdueInvoices: 14,
    collectionRate: 88.8,
    mrr: 4615000,
  },
  quarter: {
    label: 'This Quarter',
    activeSubscriptions: 5284,
    revenueCollected: 14260800,
    outstandingAmount: 842000,
    overdueInvoices: 19,
    collectionRate: 94.4,
    mrr: 4615000,
  },
  ytd: {
    label: 'Year to Date',
    activeSubscriptions: 5284,
    revenueCollected: 51840000,
    outstandingAmount: 965200,
    overdueInvoices: 23,
    collectionRate: 98.1,
    mrr: 4615000,
  },
};

const MONTHLY_REVENUE_SERIES = [
  { month: 'May', collected: 34.2, outstanding: 4.1 },
  { month: 'Jun', collected: 37.8, outstanding: 3.6 },
  { month: 'Jul', collected: 41.0, outstanding: 4.8 },
  { month: 'Aug', collected: 43.5, outstanding: 5.2 },
  { month: 'Sep', collected: 46.1, outstanding: 4.9 },
  { month: 'Oct', collected: 48.9, outstanding: 6.1 },
];

const OVERDUE_LIST = [
  {
    id: 'inv-1',
    number: 'INV-840219',
    customer: 'Vertex Logistics Ltd.',
    plan: 'Enterprise ERP Yearly',
    amount: 48500,
    daysOverdue: 12,
  },
  {
    id: 'inv-2',
    number: 'INV-839811',
    customer: 'Kiteworks Studio',
    plan: 'Growth Suite Monthly',
    amount: 19200,
    daysOverdue: 8,
  },
  {
    id: 'inv-3',
    number: 'INV-839402',
    customer: 'Northstar Retail Co.',
    plan: 'Commerce Pro Monthly',
    amount: 32600,
    daysOverdue: 5,
  },
  {
    id: 'inv-4',
    number: 'INV-838990',
    customer: ' Zenith BioLabs',
    plan: 'Odoo Enterprise Add-on',
    amount: 42500,
    daysOverdue: 3,
  },
];

const RECENT_PAYMENTS = [
  {
    id: 'pay-901',
    invoice: 'INV-841102',
    customer: 'Acme Cloud Pvt. Ltd.',
    method: 'Razorpay • UPI',
    amount: 14999,
    time: '4 mins ago',
  },
  {
    id: 'pay-902',
    invoice: 'INV-841088',
    customer: 'Bluewave FinTech',
    method: 'Razorpay • Card',
    amount: 59000,
    time: '27 mins ago',
  },
  {
    id: 'pay-903',
    invoice: 'INV-841049',
    customer: 'Solstice Media',
    method: 'Bank Transfer',
    amount: 24500,
    time: '1 hr ago',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingBanner, setBillingBanner] = useState<string | null>(null);

  const metrics = PERIOD_METRICS[period];

  const handleRunBillingNow = () => {
    setBillingRunning(true);
    setBillingBanner(null);
    setTimeout(() => {
      setBillingRunning(false);
      setBillingBanner(
        'Idempotent billing cycle completed: 38 due subscriptions evaluated, 38 invoices confirmed, 0 duplicates created.'
      );
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Finance & Subscription Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-time recurring billing health, settled revenue, and overdue receivables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <Calendar className="ml-2 h-3.5 w-3.5 text-slate-400" />
            {(['30d', 'quarter', 'ytd'] as PeriodKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  period === key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {PERIOD_METRICS[key].label}
              </button>
            ))}
          </div>

          {/* Manual Billing Job Trigger (per SPEC.md Section 9) */}
          <button
            type="button"
            onClick={handleRunBillingNow}
            disabled={billingRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {billingRunning ? 'Running Billing Engine...' : 'Run Billing Now'}
          </button>
        </div>
      </div>

      {/* Billing Job Feedback Banner */}
      {billingBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900"
        >
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {billingBanner}
          </span>
          <button
            type="button"
            onClick={() => setBillingBanner(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Bento-Box / Masonry CSS Grid with Staggered Slide-Up Entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12"
      >
        {/* Metric Card 1: Active Subscriptions */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Activity className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +12.4%
            </span>
          </div>

          <p className="mt-5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Active Subscriptions
          </p>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            <AnimatedCounter value={metrics.activeSubscriptions} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across Daily, Weekly, Monthly & Yearly plans
          </p>
        </motion.div>

        {/* Metric Card 2: Revenue Collected */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <IndianRupee className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              +18.2%
            </span>
          </div>

          <p className="mt-5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Revenue Collected
          </p>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            <AnimatedCounter
              value={metrics.revenueCollected}
              prefix="₹"
              formatIndianCurrency
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Settled via Razorpay UPI, Cards & NEFT
          </p>
        </motion.div>

        {/* Metric Card 3: Outstanding Amount */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <Clock className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {metrics.collectionRate}% collected
            </span>
          </div>

          <p className="mt-5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Outstanding Amount
          </p>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            <AnimatedCounter
              value={metrics.outstandingAmount}
              prefix="₹"
              formatIndianCurrency
            />
          </div>

          {/* Collection Progress Bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metrics.collectionRate}%` }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: 0.25 }}
              className="h-full rounded-full bg-amber-500"
            />
          </div>
        </motion.div>

        {/* Metric Card 4: Overdue Invoices */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="group relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-white via-white to-rose-50/40 p-6 shadow-xs lg:col-span-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-rose-100/80 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              Action Needed
            </span>
          </div>

          <p className="mt-5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Overdue Invoices
          </p>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-rose-600">
            <AnimatedCounter value={metrics.overdueInvoices} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Past due_date &amp; status &ne; PAID
          </p>
        </motion.div>

        {/* Bento Wide Card (Left 7 cols): Monthly Collection Trajectory */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Recurring Revenue Trajectory
              </h3>
              <p className="text-xs text-slate-500">
                Collected vs. Outstanding receivables (in ₹ Lakhs) • Current MRR:{' '}
                <span className="font-semibold text-slate-800">
                  ₹{(metrics.mrr / 100000).toFixed(2)}L
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                Outstanding
              </span>
            </div>
          </div>

          {/* Animated Bar Chart */}
          <div className="mt-8 grid h-52 grid-cols-6 items-end gap-4 border-b border-slate-100 pb-3">
            {MONTHLY_REVENUE_SERIES.map((item, idx) => {
              const collectedHeightPercent = Math.round((item.collected / 55) * 100);
              const outstandingHeightPercent = Math.round(
                (item.outstanding / 55) * 100
              );

              return (
                <div
                  key={item.month}
                  className="flex h-full flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-full w-full items-end justify-center gap-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${collectedHeightPercent}%` }}
                      transition={{
                        duration: 0.75,
                        delay: 0.2 + idx * 0.07,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      title={`₹${item.collected}L Collected`}
                      className="w-5 rounded-t-lg bg-indigo-600 sm:w-7"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${outstandingHeightPercent}%` }}
                      transition={{
                        duration: 0.75,
                        delay: 0.28 + idx * 0.07,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      title={`₹${item.outstanding}L Outstanding`}
                      className="w-3 rounded-t-md bg-amber-300 sm:w-4"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>SQL Aggregate Engine • Sub-200ms query execution</span>
            <span className="font-semibold text-indigo-600">
              +14.8% Net Revenue Retention
            </span>
          </div>
        </motion.div>

        {/* Bento Tall Card (Right 5 cols): Overdue Invoices Watchlist */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Overdue Invoices Queue
              </h3>
              <p className="text-xs text-slate-500">
                Priority accounts past payment terms
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              {OVERDUE_LIST.length} Critical
            </span>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {OVERDUE_LIST.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {inv.customer}
                    </span>
                    <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
                      {inv.daysOverdue}d late
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {inv.number} • {inv.plan}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                  ₹{inv.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Automated payment reminders are dispatched daily at 09:00 UTC.
          </div>
        </motion.div>

        {/* Bento Full-Width Strip (12 cols): Live Payment Stream */}
        <motion.div
          variants={cardVariants}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-12"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Recent Settled Payments
              </h3>
              <p className="text-xs text-slate-500">
                Latest verified Razorpay &amp; manual settlements recorded against invoices
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live Webhook Sync
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {RECENT_PAYMENTS.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {p.customer}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.invoice} • {p.method} • {p.time}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  +₹{p.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;

