import { z } from 'zod';
import validator from 'validator';

// Custom escape for common XSS characters but keeping some safe ones for rich text if needed.
// For now, full escape is safer for name and message fields.
const sanitizeString = (val: string) => validator.escape(val.trim());
const sanitizeAddress = (val: string) => val.trim();

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is too short').transform(sanitizeString),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name is too short').transform(sanitizeString).optional(),
  customerName: z.string().transform(sanitizeAddress).optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-]{10,15}$/, 'Invalid phone number format').optional(),
  addressLine1: z.string().transform(sanitizeAddress).optional(),
  addressLine2: z.string().transform(sanitizeAddress).optional(),
  city: z.string().transform(sanitizeAddress).optional(),
  state: z.string().transform(sanitizeAddress).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
});

export const orderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
  })).min(1, 'Order must contain at least one item'),
  totalAmount: z.number(),
  discountAmount: z.number().optional(),
  shippingCharge: z.number().optional(),
  couponCode: z.string().nullable().optional(),
  customerName: z.string().min(2, 'Customer name is required').transform(sanitizeAddress),
  phoneNumber: z.string().regex(/^\+?[\d\s\-]{10,15}$/, 'Invalid phone number format'),
  addressLine1: z.string().min(5, 'Address Line 1 is required').transform(sanitizeAddress),
  addressLine2: z.string().transform(sanitizeAddress).optional().nullable(),
  city: z.string().min(2, 'City is required').transform(sanitizeAddress),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const syncCartSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    variantId: z.string(),
    weight: z.string(),
    quantity: z.number().int().positive(),
  })),
});

export const updateCartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  weight: z.string(),
  quantity: z.number().int(), // Can be 0 or negative for deletion
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  frontendUrl: z.string().url('Invalid URL format').optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
