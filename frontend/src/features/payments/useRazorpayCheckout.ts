import { useState, useCallback } from 'react';

export interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CreateOrderOptions {
  /** Amount in smallest currency subunit (paise, e.g., 50000 = ₹500.00) */
  amount: number;
  /** Unique receipt or invoice number */
  receipt: string;
  /** Optional Invoice UUID or number to settle in the database */
  invoiceId?: string;
  /** Currency code (default: "INR") */
  currency?: string;
  /** Optional key-value metadata notes */
  notes?: Record<string, string>;
  /** Optional customer prefill details for the checkout modal */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Optional merchant/company display name */
  merchantName?: string;
  /** Optional description shown in Razorpay modal */
  description?: string;
  /** Optional Bearer token if user is authenticated */
  token?: string;
  /** Optional callback invoked after signature verification succeeds */
  onSuccess?: (result: VerifyOrderResponse) => void;
  /** Optional callback invoked when order creation, modal, or verification fails */
  onError?: (error: Error) => void;
}

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyOrderResponse {
  verified: boolean;
  message: string;
  orderId: string;
  paymentId: string;
  payment?: unknown;
  invoice?: unknown;
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export function useRazorpayCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<VerifyOrderResponse | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setPaymentResult(null);
    setIsLoading(false);
  }, []);

  const initiatePayment = useCallback(async (options: CreateOrderOptions) => {
    setIsLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      // 1. Load Razorpay Checkout SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
      }

      // 2. Call backend POST /api/payment/create-order
      const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: options.amount,
          receipt: options.receipt,
          invoiceId: options.invoiceId,
          currency: options.currency || 'INR',
          notes: options.notes,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(
          orderData?.error?.message || 'Failed to create Razorpay payment order.'
        );
      }

      const { id: order_id, amount, currency, key_id } = orderData as CreateOrderResponse;

      // 3. Configure and open Razorpay Checkout modal
      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: options.merchantName || 'Brightloop Subscriptions',
        description: options.description || `Payment for ${options.receipt}`,
        order_id,
        prefill: options.prefill || {},
        notes: options.notes || {},
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
        handler: async (response: RazorpaySuccessPayload) => {
          try {
            // 4. Verify signature on the backend
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoiceId: options.invoiceId,
                receipt: options.receipt,
                // Convert paise to major currency units if settling an invoice
                amount: Number((amount / 100).toFixed(2)),
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(
                verifyData?.error?.message || 'Payment signature verification failed.'
              );
            }

            setPaymentResult(verifyData as VerifyOrderResponse);
            setIsLoading(false);
            options.onSuccess?.(verifyData as VerifyOrderResponse);
          } catch (verifyErr: any) {
            const errObj =
              verifyErr instanceof Error
                ? verifyErr
                : new Error(verifyErr?.message || 'Payment verification failed');
            setError(errObj.message);
            setIsLoading(false);
            options.onError?.(errObj);
          }
        },
      });

      rzp.on('payment.failed', (failure: any) => {
        const msg =
          failure?.error?.description ||
          failure?.error?.reason ||
          'Payment failed in Razorpay Checkout.';
        setError(msg);
        setIsLoading(false);
        options.onError?.(new Error(msg));
      });

      rzp.open();
    } catch (err: any) {
      const errObj = err instanceof Error ? err : new Error(err?.message || 'Payment error');
      setError(errObj.message);
      setIsLoading(false);
      options.onError?.(errObj);
    }
  }, []);

  return {
    initiatePayment,
    isLoading,
    error,
    paymentResult,
    reset,
  };
}

