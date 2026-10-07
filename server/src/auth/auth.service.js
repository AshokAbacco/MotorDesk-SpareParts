// server/src/auth/auth.service.js
import { isRazorpayConfigured } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { activateSubscription } from '../subscriptions/subscriptions.service.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  vendor: u.vendor
    ? {
        id: u.vendor.id,
        shopName: u.vendor.shopName,
        status: u.vendor.status,
        state: u.vendor.state,
        inventoryType: u.vendor.inventoryType, // CAR | BIKE | BOTH → decides the Car / Bike sidebar menus
      }
    : null,
});

export async function register(data) {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] },
    select: { email: true },
  });
  if (exists) throw ApiError.conflict(exists.email === data.email ? 'Email already registered' : 'Phone already registered');

  // Shops must buy a plan on /pricing first (skipped only when Razorpay isn't set up, e.g. local dev)
  let signup = null;
  if (data.role === 'VENDOR' && (isRazorpayConfigured || data.signupId)) {
    if (!data.signupId) throw new ApiError(402, 'Buy a plan on the Pricing page before registering your shop');
    signup = await prisma.vendorSignupPayment.findUnique({ where: { id: data.signupId }, include: { plan: true } });
    if (!signup) throw ApiError.badRequest('Plan payment not found — buy a plan on the Pricing page first');
    if (signup.usedAt) throw ApiError.conflict('This plan payment was already used to create a shop account — please log in');
    if (signup.email.toLowerCase() !== data.email.toLowerCase()) {
      throw ApiError.badRequest(`Use the email you paid with (${signup.email})`);
    }
  }

  const password = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password,
        role: data.role,
        ...(data.role === 'VENDOR' && {
          vendor: {
            create: {
              shopName: data.shopName,
              gstin: data.gstin || null,
              phone: data.phone,
              city: data.city,
              state: data.state,
              pincode: data.pincode || null,
              addressLine: data.addressLine,
              inventoryType: data.inventoryType,
            },
          },
        }),
      },
      include: { vendor: true },
    });

    if (signup) {
      // Use the paid sign-up exactly once (guards against two registrations racing with the same payment)
      const used = await tx.vendorSignupPayment.updateMany({
        where: { id: signup.id, usedAt: null },
        data: { usedAt: new Date(), vendorId: user.vendor.id },
      });
      if (used.count !== 1) throw ApiError.conflict('This plan payment was already used to create a shop account — please log in');
      // Record the payment in the shop's billing and start its plan
      const payment = await tx.payment.create({
        data: {
          purpose: 'SUBSCRIPTION', userId: user.id, vendorId: user.vendor.id, planId: signup.planId,
          amount: signup.amount, currency: 'INR', status: 'PAID', paidAt: signup.paidAt,
          razorpayOrderId: signup.razorpayOrderId, razorpayPaymentId: signup.razorpayPaymentId,
        },
      });
      await activateSubscription(tx, user.vendor.id, signup.plan, payment.id);
    }

    return { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
  });
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: { vendor: true } });
  // Same message for both cases so emails can't be enumerated
  if (!user || !(await comparePassword(password, user.password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account disabled. Contact support.');

  return { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { vendor: true } });
  if (!user) throw ApiError.notFound('User not found');
  return publicUser(user);
}