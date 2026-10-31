import React from 'react';
import {
  useRazorpayCheckout,
  type CreateOrderOptions,
  type VerifyOrderResponse,
} from './useRazorpayCheckout';

export interface RazorpayCheckoutButtonProps extends Omit<CreateOrderOptions, 'onSuccess' | 'onError'> {
  label?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (result: VerifyOrderResponse) => void;
  onError?: (error: Error) => void;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  receipt,
  invoiceId,
  currency = 'INR',
  notes,
  prefill,
  merchantName,
  description,
  token,
  label,
  className,
  disabled,
  onSuccess,
  onError,
}) => {
  const { initiatePayment, isLoading, error, paymentResult } = useRazorpayCheckout();

  const formattedAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency,
  });

  const handleClick = () => {
    initiatePayment({
      amount,
      receipt,
      invoiceId,
      currency,
      notes,
      prefill,
      merchantName,
      description,
      token,
      onSuccess,
      onError,
    });
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={className}
        style={
          className
            ? undefined
            : {
                padding: '0.65rem 1.25rem',
                backgroundColor: isLoading ? '#818cf8' : '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
              }
        }
      >
        {isLoading ? 'Processing Payment...' : label || `Pay ${formattedAmount}`}
      </button>

      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }} role="alert">
          {error}
        </p>
      )}

      {paymentResult?.verified && (
        <p style={{ color: '#16a34a', fontSize: '0.85rem', margin: 0 }}>
          Payment verified! ID: {paymentResult.paymentId}
        </p>
      )}
    </div>
  );
};

export default RazorpayCheckoutButton;

