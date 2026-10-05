// server/src/payments/payments.service.js
import crypto from 'node:crypto';
import { env, isRazorpayConfigured } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { RAZORPAY_KEY_ID, razorpay } from '../config/razorpay.js';
import { notifyOrders } from '../notifications/notifications.service.js';
import { activateSubscription } from '../subscriptions/subscriptions.service.js';
import { ApiError } from '../utils/ApiError.js';

const APP_NAME = 'MotorDesk';
export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

export function ensureRazorpay() {
  if (!razorpay) throw new ApiError(503, 'Online payments are not configured. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in server/.env');
}

export const getConfig = () => ({ razorpayEnabled: isRazorpayConfigured, keyId: isRazorpayConfigured ? RAZORPAY_KEY_ID : null });

/** Data the browser needs to open Razorpay Checkout */
function checkoutPayload(payment, user, description) {
  return {
    paymentId: payment.id,
    keyId: RAZORPAY_KEY_ID,
    razorpayOrderId: payment.razorpayOrderId,
    amount: payment.amount,
    currency: payment.currency,
    name: APP_NAME,
    description,
    prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
  };
}

/** Creates the Razorpay order + our Payment row */
export async function createPayment({ user, amountRupees, purpose, receipt, description, vendorId, planId, orderIds = [] }) {
  ensureRazorpay();
  const amount = toPaise(amountRupees);
  if (amount < 100) throw ApiError.badRequest('Minimum online payment is ₹1');

  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes: { purpose, userId: user.id, ...(planId && { planId }) },
    });
  } catch (err) {
    console.error('Razorpay order create failed:', err?.error ?? err);
    throw new ApiError(502, 'Could not start payment with Razorpay. Please try again.');
  }

  const payment = await prisma.payment.create({
    data: {
      purpose, userId: user.id, vendorId, planId, amount, currency: 'INR', razorpayOrderId: rzpOrder.id,
      ...(orderIds.length && { orders: { connect: orderIds.map((id) => ({ id })) } }),
    },
  });
  return checkoutPayload(payment, user, description);
}

// ─────────────── signature checks ───────────────

const safeEqual = (a, b) => {
  const x = Buffer.from(a ?? '');
  const y = Buffer.from(b ?? '');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function isValidCheckoutSignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

export function isValidWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

// ─────────────── releasing reserved stock ───────────────

/** Deletes never-paid orders of a payment and puts their stock back */
async function releaseReservedOrders(tx, paymentId) {
  const orders = await tx.order.findMany({ where: { paymentId, status: 'AWAITING_PAYMENT' }, include: { items: true } });
  for (const o of orders) {
    for (const i of o.items) await tx.inventory.update({ where: { id: i.inventoryId }, data: { stock: { increment: i.quantity } } });
  }
  await tx.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
  return orders.length;
}

export async function failPayment(paymentId, reason) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.status !== 'PENDING') return p;
    await releaseReservedOrders(tx, p.id);
    return tx.payment.update({ where: { id: p.id }, data: { status: 'FAILED', failureReason: reason } });
  });
}

/** Customer closed the Razorpay window without paying */
export async function cancelByUser(userId, paymentId) {
  const p = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
  if (!p) throw ApiError.notFound('Payment not found');
  if (p.status === 'PAID') throw ApiError.badRequest('This payment is already completed');
  await failPayment(p.id, 'Cancelled by customer');
  return { released: true };
}

/** Background sweep: release stock held by payments nobody completed */
export async function releaseExpired() {
  const cutoff = new Date(Date.now() - env.PAYMENT_HOLD_MINUTES * 60 * 1000);
  const stale = await prisma.payment.findMany({ where: { status: 'PENDING', createdAt: { lt: cutoff } }, select: { id: true } });
  for (const { id } of stale) await failPayment(id, 'Payment window expired');
  return stale.length;
}

// ─────────────── success ───────────────

/**
 * Marks a Razorpay order as paid. Idempotent — called by both the browser
 * callback (/verify) and the webhook, whichever arrives first.
 */
export async function markPaid(razorpayOrderId, razorpayPaymentId) {
  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.findUnique({ where: { razorpayOrderId } });
    if (!p) throw ApiError.notFound('Payment not found');
    if (p.status === 'PAID') return { payment: p, alreadyPaid: true };

    // Paid after we had already released the stock (window expired) → refund outside the tx
    if (p.status === 'FAILED' || p.status === 'REFUNDED') return { payment: p, lateCapture: true };

    const payment = await tx.payment.update({
      where: { id: p.id },
      data: { status: 'PAID', razorpayPaymentId, paidAt: new Date(), failureReason: null },
    });

    if (p.purpose === 'MARKETPLACE_ORDER') {
      await tx.order.updateMany({
        where: { paymentId: p.id, status: 'AWAITING_PAYMENT' },
        data: { status: 'PENDING', paymentStatus: 'PAID', statusHistory: [{ status: 'PENDING', at: new Date().toISOString(), note: 'Paid online' }] },
      });
    } else if (p.purpose === 'SUBSCRIPTION') {
      const plan = await tx.plan.findUnique({ where: { id: p.planId } });
      await activateSubscription(tx, p.vendorId, plan, p.id);
    }
    return { payment };
  });

  if (result.lateCapture && razorpayPaymentId) {
    try {
      await razorpay.payments.refund(razorpayPaymentId, { amount: result.payment.amount, notes: { reason: 'Payment received after hold expired' } });
      await prisma.payment.update({
        where: { id: result.payment.id },
        data: { status: 'REFUNDED', razorpayPaymentId, refundedAmount: result.payment.amount },
      });
    } catch (err) {
      console.error('Auto-refund of late payment failed — refund manually in Razorpay:', razorpayPaymentId, err?.error ?? err);
    }
    throw ApiError.conflict('Your payment arrived after the reservation expired. It is being refunded automatically.');
  }

  // First time this payment is marked paid → tell the customer and each shop (webhook + browser callback both land here)
  if (!result.alreadyPaid && result.payment.purpose === 'MARKETPLACE_ORDER') {
    const orders = await prisma.order.findMany({ where: { paymentId: result.payment.id, status: 'PENDING' }, select: { id: true } });
    await notifyOrders(orders.map((o) => o.id), 'PAID_ONLINE');
  }
  return result.payment;
}

/** Browser callback after Razorpay Checkout succeeds */
export async function verifyFromCheckout(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  ensureRazorpay();
  const p = await prisma.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!p || p.userId !== userId) throw ApiError.notFound('Payment not found');
  if (!isValidCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw ApiError.badRequest('Payment signature mismatch — payment not verified');
  }
  const payment = await markPaid(razorpay_order_id, razorpay_payment_id);
  return { id: payment.id, status: payment.status, purpose: payment.purpose };
}

/** Razorpay webhook (source of truth if the browser closes before /verify) */
export async function handleWebhook(rawBody, signature) {
  if (!isValidWebhookSignature(rawBody, signature)) throw ApiError.unauthorized('Invalid webhook signature');
  const event = JSON.parse(rawBody.toString('utf8'));
  const entity = event.payload?.payment?.entity;

  if ((event.event === 'payment.captured' || event.event === 'order.paid') && entity?.order_id) {
    try { await markPaid(entity.order_id, entity.id); } catch (err) { if (err.statusCode !== 409 && err.statusCode !== 404) throw err; }
  } else if (event.event === 'payment.failed' && entity?.order_id) {
    // The customer may retry inside the same Checkout window, so just record the reason
    await prisma.payment.updateMany({
      where: { razorpayOrderId: entity.order_id, status: 'PENDING' },
      data: { failureReason: entity.error_description ?? 'Payment failed' },
    });
  }
  return { received: true };
}

// ─────────────── refunds ───────────────

/** Refunds one shop's order (a payment can cover several orders, so this is a partial refund) */
export async function refundOrder(order) {
  if (order.paymentMode !== 'ONLINE' || order.paymentStatus !== 'PAID') return false;
  ensureRazorpay();
  const payment = await prisma.payment.findUnique({ where: { id: order.paymentId } });
  if (!payment?.razorpayPaymentId) throw ApiError.badRequest('No captured payment found for this order');

  const amount = toPaise(order.grandTotal);
  try {
    await razorpay.payments.refund(payment.razorpayPaymentId, { amount, notes: { orderNumber: order.orderNumber } });
  } catch (err) {
    console.error('Razorpay refund failed:', err?.error ?? err);
    throw new ApiError(502, 'Razorpay refund failed — the order was not cancelled. Try again or refund from the Razorpay dashboard.');
  }
  const refunded = payment.refundedAmount + amount;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { refundedAmount: refunded, ...(refunded >= payment.amount && { status: 'REFUNDED' }) },
  });
  return true;
}

export async function listMine(userId) {
  return prisma.payment.findMany({
    where: { userId }, orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, purpose: true, amount: true, status: true, razorpayPaymentId: true, refundedAmount: true, paidAt: true, createdAt: true },
  });
}