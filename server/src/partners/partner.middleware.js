// server/src/partners/partner.middleware.js
//
// Partner apps (Motor Konnect) call /api/v1/partner/* from THEIR server, never from a phone:
//   X-Partner-Key:     must equal PARTNER_API_KEY
//   X-Customer-Phone:  the partner's logged-in user (10-digit Indian mobile) — required for order routes
//   X-Customer-Name:   URI-encoded display name (optional)
//   X-Customer-Email:  optional; used for the account only if no one else has it
//
// The user is matched to a MotorDesk CUSTOMER account by phone (created on first order), so their
// orders, notifications and "My orders" behave exactly like a website customer's.
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/hash.js';

export const PARTNER_SOURCE = 'MOTOR_KONNECT';

const userSelect = { id: true, name: true, email: true, phone: true, role: true, isActive: true };

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

export function partnerKey(req, _res, next) {
  const key = env.PARTNER_API_KEY;
  if (!key) return next(ApiError.forbidden('Partner API is not enabled on this server'));
  const got = Buffer.from(String(req.get('x-partner-key') || ''));
  const want = Buffer.from(key);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    return next(ApiError.unauthorized('Invalid partner key'));
  }
  req.partner = PARTNER_SOURCE;
  next();
}

export async function partnerCustomer(req, _res, next) {
  const phone = String(req.get('x-customer-phone') || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return next(ApiError.badRequest('A valid 10-digit mobile number is needed on your profile to order parts'));
  }
  const name = safeDecode(String(req.get('x-customer-name') || '')).trim().slice(0, 80) || 'Motor Konnect customer';
  const email = safeDecode(String(req.get('x-customer-email') || '')).trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { phone }, select: userSelect });

  if (!user) {
    const emailFree = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !(await prisma.user.findUnique({ where: { email }, select: { id: true } }));
    try {
      user = await prisma.user.create({
        data: {
          name,
          phone,
          email: emailFree ? email : `mk-${phone}@customers.motorkonnect.app`,
          // Partner customers never log in to MotorDesk directly; they can use "Forgot password" later
          password: await hashPassword(crypto.randomBytes(24).toString('hex')),
          role: 'CUSTOMER',
        },
        select: userSelect,
      });
    } catch (err) {
      // Two requests for a new user at the same time → the other one created it
      if (err?.code !== 'P2002') throw err;
      user = await prisma.user.findUnique({ where: { phone }, select: userSelect });
      if (!user) return next(ApiError.conflict('Could not set up your parts account — please try again'));
    }
  }

  if (user.role !== 'CUSTOMER') {
    return next(ApiError.forbidden('This mobile number is registered as a shop on MotorDesk — use a different number to order parts'));
  }
  if (!user.isActive) return next(ApiError.forbidden('Your parts account is disabled — contact support'));

  req.user = user;
  next();
}
