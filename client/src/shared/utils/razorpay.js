const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

/** Loads Razorpay Checkout once, on demand (keeps it out of the main bundle) */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  loading ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay Checkout for a payment created by the server.
 * Resolves (never rejects on user action) with:
 *   { status: 'success', response }          → send response to /payments/razorpay/verify
 *   { status: 'dismissed', error? }          → customer closed the window (error = last failure reason)
 */
export async function openRazorpayCheckout(payment) {
  if (!(await loadRazorpay())) throw new Error('Could not load Razorpay. Check your internet connection and try again.');

  return new Promise((resolve) => {
    let lastError;
    const rzp = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: payment.description,
      prefill: payment.prefill,
      theme: { color: '#2563eb' },
      handler: (response) => resolve({ status: 'success', response }),
      modal: { ondismiss: () => resolve({ status: 'dismissed', error: lastError }), confirm_close: true },
    });
    // Razorpay lets the customer retry inside the same window, so only remember the reason
    rzp.on('payment.failed', (r) => { lastError = r.error?.description; });
    rzp.open();
  });
}