import { prisma } from '../config/prisma.js';
import { createPayment } from '../payments/payments.service.js';
import { ApiError } from '../utils/ApiError.js';

export const listActivePlans = () => prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });

export const listAllPlans = () =>
  prisma.plan.findMany({
    orderBy: { price: 'asc' },
    include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } },
  });

export const createPlan = (data) => prisma.plan.create({ data });
export const updatePlan = (id, data) => prisma.plan.update({ where: { id }, data });
export const deactivatePlan = (id) => prisma.plan.update({ where: { id }, data: { isActive: false } });

export async function current(vendorId) {
  // Expire lapsed subscriptions lazily
  await prisma.subscription.updateMany({ where: { vendorId, status: 'ACTIVE', endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } });
  const [active, history] = await Promise.all([
    prisma.subscription.findFirst({ where: { vendorId, status: 'ACTIVE' }, include: { plan: true }, orderBy: { endDate: 'desc' } }),
    prisma.subscription.findMany({ where: { vendorId }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return { active, history };
}

/** Cancels the current plan and starts a new one (used for free plans and after a verified payment) */
export async function activateSubscription(tx, vendorId, plan, paymentId = null) {
  await tx.subscription.updateMany({ where: { vendorId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
  const endDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  return tx.subscription.create({ data: { vendorId, planId: plan.id, endDate, paymentId }, include: { plan: true } });
}

/**
 * Free plan  → activated immediately.
 * Paid plan  → returns a Razorpay checkout; the plan activates in payments.service
 *              only after the payment signature (or webhook) is verified.
 */
export async function subscribe(user, vendorId, planId) {
  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw ApiError.notFound('Plan not found');

  const skuCount = await prisma.inventory.count({ where: { vendorId } });
  if (skuCount > plan.maxSkus) throw ApiError.badRequest(`You have ${skuCount} SKUs; this plan allows ${plan.maxSkus}`);

  if (Number(plan.price) <= 0) {
    const subscription = await prisma.$transaction((tx) => activateSubscription(tx, vendorId, plan));
    return { subscription, payment: null };
  }

  const payment = await createPayment({
    user,
    amountRupees: plan.price,
    purpose: 'SUBSCRIPTION',
    receipt: `SUB-${vendorId.slice(0, 8)}-${Date.now()}`,
    description: `${plan.name} plan · ${plan.durationDays} days`,
    vendorId,
    planId: plan.id,
  });
  return { subscription: null, payment };
}