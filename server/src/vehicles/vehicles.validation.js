// server/src/vehicles/vehicles.validation.js
import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z.object({
  type: z.enum(['CAR', 'BIKE']),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1980).max(currentYear + 1),
});

// Brand / model names: letters, numbers, spaces and - . & ' / + ( )  e.g. "Royal Enfield", "FZ-S V3", "Scorpio-N (Z8)"
const vehicleName = (what) =>
  z.string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ' '))
    .pipe(z.string().min(1, `Enter the ${what}`).max(40, `${what} is too long`).regex(/^[\p{L}\p{N} .&'/+()-]+$/u, `Use letters and numbers only in the ${what}`));

/** Adds a model for a range of years — used by "Add new brand / Add new model" in Vehicle fitment */
export const bulkCreateVehicleSchema = z.object({
  type: z.enum(['CAR', 'BIKE']),
  brand: vehicleName('brand name'),
  model: vehicleName('model name'),
  yearFrom: z.coerce.number().int().min(1980, 'Year must be 1980 or later'),
  yearTo: z.coerce.number().int().max(currentYear + 1, `Year can't be after ${currentYear + 1}`),
})
  .refine((d) => d.yearTo >= d.yearFrom, { message: '"To" year must be the same or after "From" year', path: ['yearTo'] })
  .refine((d) => d.yearTo - d.yearFrom < 40, { message: 'Year range can be at most 40 years', path: ['yearFrom'] });

export const listVehiclesQuery = z.object({
  type: z.enum(['CAR', 'BIKE']).optional(),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
});