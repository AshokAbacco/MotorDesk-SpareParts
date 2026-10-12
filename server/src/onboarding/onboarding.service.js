// server/src/onboarding/onboarding.service.js
/**
 * Shop sign-up with a paid plan (Pricing page → payment form → Razorpay → Register).
 *
 *  1. checkout  — validates the form and opens a Razorpay order. The form travels in the Razorpay order's
 *                 `notes`; NOTHING is written to our database yet.
 *  2. verify    — after Razorpay Checkout succeeds: checks the signature, reads the order back from Razorpay
 *                 (amount + form), and only then saves a VendorSignupPayment.
 *     webhook   — same as verify, for when the browser closes before step 2 (see payments.service).
 *  3. register  — auth.service uses the paid sign-up once to create the shop (+ its active plan).
 * If the payment fails or is cancelled, step 2 never happens, so nothing is stored.
 */
import { isRazorpayConfigured } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { RAZORPAY_KEY_ID, razorpay } from '../config/razorpay.js';
import { ensureRazorpay, isValidCheckoutSignature, toPaise } from '../payments/payments.service.js';
import { ApiError } from '../utils/ApiError.js';
import { queueSignupInvoice } from './signupInvoice.js';

const PURPOSE = 'VENDOR_SIGNUP';

/** Plans on the /pricing page (Urban / Rural) */
export const listSignupPlans = async () => ({
  plans: await prisma.plan.findMany({ where: { isActive: true, area: { not: null } }, orderBy: { price: 'desc' } }),
  paymentsEnabled: isRazorpayConfigured,
});

async function assertNotRegistered(email, phone) {
  const user = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { email: true } });
  if (user) {
    throw ApiError.conflict(user.email === email
      ? 'This email already has a MotorDesk account — log in instead'
      : 'This mobile number already has a MotorDesk account — log in instead');
  }
}

export async function checkout(form) {
  ensureRazorpay();
  const plan = await prisma.plan.findFirst({ where: { id: form.planId, isActive: true, area: { not: null } } });
  if (!plan) throw ApiError.notFound('Plan not found');
  await assertNotRegistered(form.email, form.phone);

  const amount = toPaise(plan.price);
  let order;
  try {
    order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `SIGNUP-${Date.now()}`,
      // Razorpay keeps these with the order — read back after payment (max 15 keys × 256 chars)
      notes: {
        purpose: PURPOSE,
        planId: plan.id,
        shopName: form.shopName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        address: form.address.slice(0, 250),
        gstin: form.gstin || '',
      },
    });
  } catch (err) {
    console.error('Razorpay order create failed:', err?.error ?? err);
    throw new ApiError(502, 'Could not start payment with Razorpay. Please try again.');
  }

  return {
    keyId: RAZORPAY_KEY_ID,
    razorpayOrderId: order.id,
    amount,
    currency: 'INR',
    name: 'MotorDesk',
    description: `${plan.name} plan · ${plan.durationDays} days`,
    prefill: { name: form.ownerName, email: form.email, contact: form.phone },
  };
}

const prefillOf = (s) => ({
  signupId: s.id,
  plan: s.plan && { id: s.plan.id, name: s.plan.name, price: s.plan.price, durationDays: s.plan.durationDays, area: s.plan.area },
  shopName: s.shopName, ownerName: s.ownerName, email: s.email, phone: s.phone, address: s.address, gstin: s.gstin ?? '',
  amount: s.amount / 100, // rupees actually paid
  invoiceNumber: s.invoiceNumber,
  paidAt: s.paidAt,
});

/**
 * Saves the paid sign-up from the Razorpay order (idempotent — browser verify and webhook can both call it).
 * Returns null if the order isn't a shop sign-up.
 */
export async function recordPaidSignup(razorpayOrderId, razorpayPaymentId) {
  const existing = await prisma.vendorSignupPayment.findUnique({ where: { razorpayOrderId }, include: { plan: true } });
  if (existing) {
    if (existing.invoiceStatus !== 'SENT') queueSignupInvoice(existing.id); // no-op if already being sent
    return existing;
  }

  const order = await razorpay.orders.fetch(razorpayOrderId);
  const n = order?.notes ?? {};
  if (n.purpose !== PURPOSE) return null;

  const plan = await prisma.plan.findUnique({ where: { id: n.planId } });
  if (!plan) throw ApiError.notFound('Plan not found');

  try {
    const saved = await prisma.vendorSignupPayment.create({
      data: {
        invoiceNextTryAt: new Date(), // invoice number is given when the invoice is actually issued
        planId: plan.id,
        shopName: n.shopName, ownerName: n.ownerName, email: n.email, phone: n.phone, address: n.address, gstin: n.gstin || null,
        amount: Number(order.amount), // what was actually charged (Razorpay is the source of truth)
        razorpayOrderId, razorpayPaymentId,
      },
      include: { plan: true },
    });
    // Payment invoice email (checks with Razorpay that the payment is captured before sending)
    queueSignupInvoice(saved.id);
    return saved;
  } catch (err) {
    if (err.code === 'P2002') return prisma.vendorSignupPayment.findUnique({ where: { razorpayOrderId }, include: { plan: true } });
    throw err;
  }
}

/** Browser callback after Razorpay Checkout succeeds */
export async function verify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  ensureRazorpay();
  if (!isValidCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw ApiError.badRequest('Payment could not be verified — nothing was saved. If money was deducted, contact support with your payment ID.');
  }
  const signup = await recordPaidSignup(razorpay_order_id, razorpay_payment_id);
  if (!signup) throw ApiError.badRequest('This payment is not a shop sign-up');
  return prefillOf(signup);
}

/** Registration page: the paid details to prefill (only until the shop account is created) */
export async function getPaidSignup(id) {
  const s = await prisma.vendorSignupPayment.findUnique({ where: { id }, include: { plan: true } });
  if (!s) throw ApiError.notFound('Sign-up payment not found');
  if (s.usedAt) throw ApiError.conflict('This payment was already used to create a shop account — please log in');
  return prefillOf(s);
}