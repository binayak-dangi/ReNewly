import { z } from 'zod';

/** Mirrors backend CommonRules so most mistakes are caught before a round-trip. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(256, 'Email is too long.')
  .pipe(z.email('Enter a valid email address.'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .refine(p => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain at least one letter and one number.');

export const codeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.').max(120, 'Name is too long.'),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  code: codeSchema,
  newPassword: passwordSchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
