// server/src/onboarding/onboarding.validation.js
import { z } from 'zod';

const gstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The "Buy plan" payment form (nothing is saved until Razorpay confirms the payment) */
export const signupCheckoutSchema = z.object({
  planId: z.string().uuid('Choose a plan'),
  shopName: z.string().trim().min(2, 'Shop name is too short').max(100),
  ownerName: z.string().trim().min(2, 'Owner name is too short').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(5, 'Enter the shop address').max(250),
  gstin: z.string().trim().toUpperCase().regex(gstin, 'Invalid GST number').optional().or(z.literal('')),
});

export const signupVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});