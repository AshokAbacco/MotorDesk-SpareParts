// server/src/orders/orders.validation.js
import { z } from 'zod';

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  line1: z.string().trim().min(3),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Invalid pincode'),
});

export const createOrderSchema = z.object({
  items: z.array(z.object({ inventoryId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(50) })).min(1),
  shippingAddress: shippingAddressSchema,
  paymentMode: z.enum(['COD', 'UPI', 'ONLINE']).default('COD'), // UPI = paid straight to the shop's UPI ID
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export const upiSubmitSchema = z.object({
  utr: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10,22}$/, 'Enter the UPI reference / UTR number shown in your UPI app (usually 12 digits)'),
});

export const verifyPaymentSchema = z.object({ action: z.enum(['CONFIRM', 'REJECT']) });

export const listOrdersQuery = z.object({
  status: z.enum(['AWAITING_PAYMENT', 'PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});