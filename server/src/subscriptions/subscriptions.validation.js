import { z } from 'zod';

export const planSchema = z.object({
  name: z.string().trim().min(2),
  price: z.coerce.number().nonnegative(),
  durationDays: z.coerce.number().int().min(1),
  maxSkus: z.coerce.number().int().min(1),
  features: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});
export const updatePlanSchema = planSchema.partial();

export const subscribeSchema = z.object({ planId: z.string().uuid() });
