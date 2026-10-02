import { z } from 'zod';

const money = z.coerce.number().nonnegative().max(10_000_000);

export const addInventorySchema = z
  .object({
    productId: z.string().uuid(),
    costPrice: money.default(0),
    price: money,
    mrp: money,
    stock: z.coerce.number().int().min(0).default(0),
    lowStockThreshold: z.coerce.number().int().min(0).default(5),
    isListed: z.boolean().default(true),
  })
  .refine((d) => d.price <= d.mrp, { message: 'Selling price cannot exceed MRP', path: ['price'] });

export const updateInventorySchema = z.object({
  costPrice: money.optional(),
  price: money.optional(),
  mrp: money.optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  isListed: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  change: z.coerce.number().int().refine((v) => v !== 0, 'Change cannot be 0'),
  reason: z.string().trim().max(200).optional(),
});

export const listInventoryQuery = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  vehicleType: z.enum(['CAR', 'BIKE']).optional(),
  vehicleBrand: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW', 'OUT']).optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});
