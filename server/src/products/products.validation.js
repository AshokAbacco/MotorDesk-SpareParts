// server/src/products/products.validation.js
import { z } from 'zod';

export const productBody = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  subCategory: z.string().trim().optional(),
  brand: z.string().trim().min(1),
  oemNumber: z.string().trim().toUpperCase().min(2),
  description: z.string().trim().optional(),
  images: z.array(z.string().url()).max(6).default([]),
  hsnCode: z.string().trim().optional(),
  gstRate: z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v), 'GST must be 0, 5, 12, 18 or 28').default(18),
  isActive: z.boolean().optional(),
  vehicleIds: z.array(z.string().uuid()).default([]),
});

export const createProductSchema = productBody;
export const updateProductSchema = productBody.partial();

export const listProductsQuery = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  subCategory: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  vehicleType: z.enum(['CAR', 'BIKE']).optional(),
  vehicleBrand: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  year: z.coerce.number().int().optional(),
  vehicleId: z.string().uuid().optional(),
  includeInactive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(), // admin only
  owner: z.enum(['MASTER', 'VENDOR', 'MINE']).optional(), // MASTER = admin catalog, VENDOR = shop-added (admin), MINE = my shop's (vendor)
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});

export const setVehiclesSchema = z.object({ vehicleIds: z.array(z.string().uuid()) });