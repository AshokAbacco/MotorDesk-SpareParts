// server/src/auth/auth.validation.js
import { z } from 'zod';
import { INVENTORY_TYPES } from '../utils/inventoryType.js';

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short'),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    phone: phone.optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['CUSTOMER', 'VENDOR']).default('CUSTOMER'),
    // Vendor-only fields
    shopName: z.string().trim().min(2).optional(),
    gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN').optional().or(z.literal('')),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Invalid pincode').optional().or(z.literal('')),
    addressLine: z.string().trim().optional(),
    inventoryType: z.enum(INVENTORY_TYPES, { message: 'Choose Car, Bike or Both' }).optional(),
    signupId: z.string().uuid().optional(), // paid plan from the /pricing page (required for shops when payments are on)
  })
  .superRefine((d, ctx) => {
    if (d.role === 'VENDOR') {
      if (!d.shopName) ctx.addIssue({ code: 'custom', path: ['shopName'], message: 'Shop name is required' });
      if (!d.state) ctx.addIssue({ code: 'custom', path: ['state'], message: 'State is required for GST' });
      if (!d.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Phone is required for shops' });
      if (!d.inventoryType) ctx.addIssue({ code: 'custom', path: ['inventoryType'], message: 'Select what your shop sells: Car, Bike or Both' });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});