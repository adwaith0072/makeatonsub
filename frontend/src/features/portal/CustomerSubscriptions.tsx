import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Repeat, Calendar, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import type { CustomerSubscription, UserProfile } from '../../types/rbac';

const INITIAL_SUBSCRIPTIONS: CustomerSubscription[] = [
  {
    id: 'sub-4192',
    number: 'SUB-004192',
    planName: 'Brightloop Growth Cloud — Monthly',
    productSummary: '5x Core Seats + Brand Variant: Odoo (+₹560)',
    billingPeriod: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '01 Jun 2026',
    nextBillingDate: '01 Nov 2026',
    amount: 14750,
    pausable: true,
    renewable: true,
  },
  {
    id: 'sub-4510',
    number: 'SUB-004510',
    planName: 'Odoo Connector Add-On — Monthly',
    productSummary: '1x Real-time Inventory & Webhook Bridge',
    billingPeriod: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '15 Sep 2026',
    nextBillingDate: '15 Nov 2026',
    amount: 4956,
    pausable: true,
    renewable: true,
  },
];

interface CustomerSubscriptionsProps {
  customer: UserProfile;
}

export const CustomerSubscriptions: React.FC<CustomerSubscriptionsProps> = ({
  customer,
}) => {
  const [subs, setSubs] = useState<CustomerSubscription[]>(INITIAL_SUBSCRIPTIONS);

  const togglePause = (id: string) => {
    setSubs((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : s
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Customer Self-Service • {customer.companyName || customer.name}
        </div>
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
          My Subscriptions
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Active recurring plans and upcoming billing dates exclusively linked to your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {subs.map((sub, idx) => {
          const isActive = sub.status === 'ACTIVE';
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <Repeat className="h-3.5 w-3.5" />
                    {sub.number}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {sub.planName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{sub.productSummary}</p>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Next Billing: <strong>{sub.nextBillingDate}</strong>
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    ₹{sub.amount.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      /{sub.billingPeriod.toLowerCase()}
                    </span>
                  </span>
                </div>
              </div>

              {sub.pausable && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => togglePause(sub.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {isActive ? (
                      <>
                        <PauseCircle className="h-4 w-4 text-amber-600" />
                        Pause Subscription
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 text-emerald-600" />
                        Resume Subscription
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerSubscriptions;

