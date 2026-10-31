export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type ViewId =
  | 'dashboard'
  | 'products'
  | 'plans'
  | 'taxes'
  | 'discounts'
  | 'staff'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'portal-subscriptions'
  | 'portal-invoices';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
  phone?: string;
  avatarInitials: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface CustomerInvoice {
  id: string;
  number: string;
  subscriptionNumber: string;
  planName: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  /** Total in INR (major currency units, e.g., 4999 = ₹4,999.00) */
  grandTotal: number;
  status: InvoiceStatus;
  paymentId?: string;
  paidAt?: string;
}

export interface CustomerSubscription {
  id: string;
  number: string;
  planName: string;
  productSummary: string;
  billingPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  status: 'ACTIVE' | 'PAUSED' | 'CONFIRMED' | 'CLOSED';
  startDate: string;
  nextBillingDate: string;
  amount: number;
  pausable: boolean;
  renewable: boolean;
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => RazorpayInstance;
  }
}
