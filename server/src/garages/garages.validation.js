// server/src/garages/garages.validation.js
import { z } from 'zod';

export const garageSchema = z.object({
  name: z.string().trim().min(2),
  ownerName: z.string().trim().optional(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  address: z.string().trim().optional(),
  state: z.string().trim().optional(),
});

export const updateGarageSchema = garageSchema.partial();

export const listGaragesQuery = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});