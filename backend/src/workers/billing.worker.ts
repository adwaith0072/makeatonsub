import { runBillingEngine } from '../modules/billing/billing.service.ts';

declare var self: Worker;

console.log('[Billing Worker] Background worker initialized.');

// Listen for trigger messages or run scheduled jobs
if (typeof self !== 'undefined' && self.onmessage !== undefined) {
  self.onmessage = async (event: MessageEvent) => {
    if (event.data?.type === 'RUN_BILLING') {
      try {
        const result = await runBillingEngine(new Date(event.data.targetDate || Date.now()));
        self.postMessage({ type: 'BILLING_COMPLETE', result });
      } catch (err: any) {
        self.postMessage({ type: 'BILLING_ERROR', error: err.message });
      }
    }
  };
}
