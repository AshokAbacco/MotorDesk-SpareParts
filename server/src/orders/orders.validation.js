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

// Pickup orders only need who is collecting the parts
export const pickupContactSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
});

/**
 * fulfilment: DELIVERY (default — shop delivers to shippingAddress) or
 *             PICKUP   (customer collects from the shop; only name + phone needed).
 * paymentMode COD on a PICKUP order means "pay at the shop".
 */
export const createOrderSchema = z
  .object({
    items: z.array(z.object({ inventoryId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(50) })).min(1),
    fulfilment: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
    shippingAddress: z.unknown().optional(),
    paymentMode: z.enum(['COD', 'UPI', 'ONLINE']).default('COD'), // UPI = paid straight to the shop's UPI ID
  })
  .transform((data, ctx) => {
    const schema = data.fulfilment === 'PICKUP' ? pickupContactSchema : shippingAddressSchema;
    const parsed = schema.safeParse(data.shippingAddress ?? {});
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => ctx.addIssue({ ...i, path: ['shippingAddress', ...i.path] }));
      return z.NEVER;
    }
    return { ...data, shippingAddress: parsed.data };
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