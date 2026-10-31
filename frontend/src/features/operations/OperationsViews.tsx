import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  ArrowRight,
  Package,
  Layers,
  Percent,
  TicketPercent,
  Users,
  Repeat,
  FileText,
  CreditCard,
} from 'lucide-react';
import type { UserRole, ViewId } from '../../types/rbac';

interface OperationsViewProps {
  view: ViewId;
  role: UserRole;
}

export const OperationsViews: React.FC<OperationsViewProps> = ({ view, role }) => {
  const [subs, setSubs] = useState([
    {
      number: 'SUB-004192',
      customer: 'Acme Cloud Pvt. Ltd.',
      plan: 'Growth Cloud (Monthly)',
      nextBilling: '01 Nov 2026',
      status: 'ACTIVE',
      amount: 14750,
    },
    {
      number: 'SUB-004208',
      customer: 'Bluewave FinTech',
      plan: 'Enterprise ERP (Yearly)',
      nextBilling: '14 Nov 2026',
      status: 'QUOTATION',
      amount: 59000,
    },
    {
      number: 'SUB-004215',
      customer: 'Kiteworks Studio',
      plan: 'Starter Suite (Monthly)',
      nextBilling: '05 Nov 2026',
      status: 'CONFIRMED',
      amount: 8900,
    },
  ]);

  const [invoices, setInvoices] = useState([
    {
      number: 'INV-2026-1042',
      customer: 'Acme Cloud Pvt. Ltd.',
      dueDate: '05 Nov 2026',
      total: 14750,
      status: 'CONFIRMED',
    },
    {
      number: 'INV-840219',
      customer: 'Vertex Logistics Ltd.',
      dueDate: '19 Oct 2026',
      total: 48500,
      status: 'CONFIRMED',
    },
    {
      number: 'INV-841088',
      customer: 'Bluewave FinTech',
      dueDate: '28 Oct 2026',
      total: 59000,
      status: 'PAID',
    },
  ]);

  const advanceSubStatus = (number: string) => {
    const nextMap: Record<string, string> = {
      DRAFT: 'QUOTATION',
      QUOTATION: 'CONFIRMED',
      CONFIRMED: 'ACTIVE',
      ACTIVE: 'CLOSED',
    };
    setSubs((prev) =>
      prev.map((s) =>
        s.number === number && nextMap[s.status]
          ? { ...s, status: nextMap[s.status] }
          : s
      )
    );
  };

  const markInvoicePaid = (number: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.number === number ? { ...inv, status: 'PAID' } : inv
      )
    );
  };

  if (view === 'subscriptions') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Subscriptions</h2>
            <p className="mt-1 text-sm text-slate-500">
              State machine transitions: Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed ({role} access).
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
            <Repeat className="h-3.5 w-3.5" />
            {subs.length} Active Records
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Subscription #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Next Billing</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">State Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((s) => (
                <tr key={s.number} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {s.number}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{s.customer}</td>
                  <td className="px-6 py-4 text-slate-600">{s.plan}</td>
                  <td className="px-6 py-4 text-slate-500">{s.nextBilling}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900 tabular-nums">
                    ₹{s.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {s.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => advanceSubStatus(s.number)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Advance State
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === 'invoices') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customer Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage Draft, Confirmed, and Paid invoices across all customers ({role} access).
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            <FileText className="h-3.5 w-3.5" />
            Snapshotted Tax &amp; Discount Ledger
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.number} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {inv.number}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{inv.customer}</td>
                  <td className="px-6 py-4 text-slate-500">{inv.dueDate}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900 tabular-nums">
                    ₹{inv.total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status !== 'PAID' ? (
                      <button
                        type="button"
                        onClick={() => markInvoicePaid(inv.number)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Record Payment
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Generic clean cards for Payments, Products, Plans, Taxes, Discounts, and Staff Accounts
  const CATALOG_CONFIG: Record<
    string,
    {
      title: string;
      subtitle: string;
      cta: string;
      icon: React.ComponentType<{ className?: string }>;
      rows: Array<{ primary: string; secondary: string; meta: string; pill: string }>;
    }
  > = {
    payments: {
      title: 'Payments Ledger',
      subtitle: 'Immutable payment records across Razorpay UPI, Cards, and Bank Transfers.',
      cta: 'Record Offline Payment',
      icon: CreditCard,
      rows: [
        {
          primary: 'pay_P9mK82xZa10 • INV-2026-1040',
          secondary: 'Acme Cloud Pvt. Ltd. • Razorpay UPI',
          meta: '₹14,750',
          pill: 'VERIFIED',
        },
        {
          primary: 'pay_P8x9LmK20vQ • INV-841088',
          secondary: 'Bluewave FinTech • Razorpay Card',
          meta: '₹59,000',
          pill: 'VERIFIED',
        },
      ],
    },
    products: {
      title: 'Products & Variants',
      subtitle: 'Admin-only catalog items with variant attribute extra pricing (e.g., Brand: Odoo +₹560).',
      cta: 'New Product',
      icon: Package,
      rows: [
        {
          primary: 'Brightloop Core Platform Seat',
          secondary: 'Variant: Brand = Odoo (+₹560 extra price)',
          meta: '₹2,500 / unit',
          pill: 'ACTIVE',
        },
        {
          primary: 'Real-Time Webhook & ERP Sync',
          secondary: 'Add-on Module • Standard SKU',
          meta: '₹4,200 / unit',
          pill: 'ACTIVE',
        },
      ],
    },
    plans: {
      title: 'Billing Plans',
      subtitle: 'Configure Daily, Weekly, Monthly, and Yearly plans with lifecycle flags.',
      cta: 'Create Plan',
      icon: Layers,
      rows: [
        {
          primary: 'Growth Cloud — Monthly',
          secondary: 'Pausable • Renewable • Early-Closable',
          meta: '₹13,500 / mo',
          pill: 'MONTHLY',
        },
        {
          primary: 'Enterprise ERP — Yearly',
          secondary: 'Auto-close off • Renewable • Min Qty: 5',
          meta: '₹59,000 / yr',
          pill: 'YEARLY',
        },
      ],
    },
    taxes: {
      title: 'Tax Rules',
      subtitle: 'Admin-defined GST & tax percentages snapshotted onto invoice lines at billing time.',
      cta: 'Add Tax Rule',
      icon: Percent,
      rows: [
        {
          primary: 'Standard SaaS GST (18%)',
          secondary: 'Applies to: All SaaS Subscriptions',
          meta: '18.00%',
          pill: 'ACTIVE',
        },
        {
          primary: 'Reduced Digital Advisory Tax (12%)',
          secondary: 'Applies to: Onboarding Services',
          meta: '12.00%',
          pill: 'ACTIVE',
        },
      ],
    },
    discounts: {
      title: 'Discount Rules',
      subtitle: 'Automatic percentage & fixed discounts bounded by date windows and usage limits.',
      cta: 'Create Discount',
      icon: TicketPercent,
      rows: [
        {
          primary: 'LAUNCH1000 — Fixed ₹1,000 Off',
          secondary: 'Scope: Whole Subscription • Usage: 42 / 100',
          meta: '-₹1,000',
          pill: 'ACTIVE',
        },
        {
          primary: 'ANNUAL15 — 15% Yearly Saver',
          secondary: 'Scope: Yearly Plans • Usage: 100 / 100',
          meta: '15% OFF',
          pill: 'EXHAUSTED',
        },
      ],
    },
    staff: {
      title: 'Internal Staff Accounts',
      subtitle: 'Admin-exclusive directory to provision STAFF operators with RBAC boundaries.',
      cta: 'Create Staff User',
      icon: Users,
      rows: [
        {
          primary: 'Riya Sharma (riya.staff@brightloop.io)',
          secondary: 'Role: STAFF • Subscriptions, Invoices & Payments',
          meta: 'Active today',
          pill: 'STAFF',
        },
        {
          primary: 'Kabir Nair (kabir.ops@brightloop.io)',
          secondary: 'Role: STAFF • Billing & Customer Support',
          meta: 'Active 2h ago',
          pill: 'STAFF',
        },
      ],
    },
  };

  const section = CATALOG_CONFIG[view] || CATALOG_CONFIG.payments;
  const SectionIcon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{section.subtitle}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {section.cta}
        </button>
      </div>

      <div className="space-y-3">
        {section.rows.map((row) => (
          <div
            key={row.primary}
            className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <SectionIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {row.primary}
                </p>
                <p className="text-xs text-slate-500">{row.secondary}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {row.meta}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {row.pill}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default OperationsViews;

