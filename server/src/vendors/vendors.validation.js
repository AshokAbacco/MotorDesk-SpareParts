// server/src/vendors/vendors.validation.js
import { z } from 'zod';
import { INVENTORY_TYPES } from '../utils/inventoryType.js';

export const updateShopSchema = z.object({
  shopName: z.string().trim().min(2).optional(),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/).optional(),
  addressLine: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().min(2).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional(),
  logoUrl: z.string().url().optional(),
  inventoryType: z.enum(INVENTORY_TYPES, { message: 'Choose Car, Bike or Both' }).optional(),
});

export const upiSettingsSchema = z.object({
  upiId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/, 'Enter a valid UPI ID, e.g. yourshop@okicici or 9876543210@ybl'),
  upiName: z.string().trim().min(2, 'Enter the name shown on your UPI account').max(50),
  upiNumber: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
});
export const orderSettingsSchema = z.object({
  codEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryCharge: z.coerce.number().min(0, 'Delivery charge cannot be negative').max(5000).default(0),
});
