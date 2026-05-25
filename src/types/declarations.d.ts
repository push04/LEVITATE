declare module 'imap-simple';
declare module 'mailparser';

// ── Razorpay browser SDK ─────────────────────────────────────────────────────
interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email?: string; contact?: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (response: RazorpaySubscriptionSuccessPayload) => Promise<void> | void;
  modal: { ondismiss: () => void };
}

interface RazorpaySubscriptionSuccessPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayPaymentFailedPayload {
  error?: { description?: string };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on?: (event: 'payment.failed', callback: (payload: RazorpayPaymentFailedPayload) => void) => void;
}

interface Window {
  Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
}
