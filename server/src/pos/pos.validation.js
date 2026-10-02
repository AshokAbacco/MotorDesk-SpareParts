// server/src/pos/pos.validation.js
import { z } from 'zod';

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          inventoryId: z.string().uuid(),
          quantity: z.coerce.number().int().min(1),
          unitPrice: z.coerce.number().nonnegative().optional(), // counter price override (<= MRP)
        })
      )
      .min(1, 'Cart is empty'),
    paymentMode: z.enum(['UPI', 'CASH', 'CARD']),
    garageId: z.string().uuid().optional(),
    customerName: z.string().trim().max(100).optional(),
    customerPhone: z.string().trim().regex(/^[6-9]\d{9}$/).optional().or(z.literal('')),
    customerGstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
    customerState: z.string().trim().optional(),
    discount: z.coerce.number().nonnegative().default(0),
  });

export const quoteSchema = checkoutSchema.pick({ items: true, garageId: true, customerState: true, discount: true });