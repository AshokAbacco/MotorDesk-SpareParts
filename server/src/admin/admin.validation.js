// server/src/admin/admin.validation.js
import { z } from 'zod';

export const vendorStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING']),
});
export const listVendorsQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});

// ───────────── Customers (admin) ─────────────
export const listCustomersQuery = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  // Optional first delivery address (saved as the default address)
  address: z
    .object({
      line1: z.string().trim().min(3, 'Enter the house / street'),
      landmark: z.string().trim().max(80).optional().or(z.literal('')),
      city: z.string().trim().min(2, 'Enter the city'),
      state: z.string().trim().min(2, 'Select the state'),
      pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
    })
    .optional(),
});

// Edit: same fields; password only when the admin wants to reset it
export const updateCustomerSchema = createCustomerSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional().or(z.literal('')),
});

export const customerStatusSchema = z.object({ isActive: z.boolean() });