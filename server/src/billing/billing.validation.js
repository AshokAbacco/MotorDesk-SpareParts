// server/src/billing/billing.validation.js
import { z } from 'zod';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const rangeQuery = z
  .object({ from: ymd.optional(), to: ymd.optional() })
  .refine((d) => !d.from || !d.to || d.from <= d.to, { message: '"From" date must be before "To" date', path: ['from'] });

export const walkinListQuery = z.object({
  from: ymd.optional(),
  to: ymd.optional(),
  q: z.string().trim().optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD']).optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});

export const onlineListQuery = z.object({
  from: ymd.optional(),
  to: ymd.optional(),
  q: z.string().trim().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});