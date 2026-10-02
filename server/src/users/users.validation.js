// server/src/users/users.validation.js
import { z } from 'zod';

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(20).default('Home'), // Home / Work / Shop / anything
  name: z.string().trim().min(2, 'Enter the receiver’s name').max(60),
  phone,
  line1: z.string().trim().min(5, 'Enter house no, street and area').max(200),
  landmark: z.string().trim().max(80).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Enter city').max(60),
  state: z.string().trim().min(2, 'Select state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  isDefault: z.boolean().optional(),
});

// Addresses are managed through /users/me/addresses, not here
export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60).optional(),
  phone: phone.optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});