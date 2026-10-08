/** Form schemas that mirror the API's own rules (backend/src/validators), so mistakes are caught while typing. */
import { z } from 'zod';

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .max(254, 'That email is too long')
  .refine((v) => v.includes('@'), 'Add an @ to your email')
  .pipe(z.email({ error: 'Check your email address, it looks incomplete' }));

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'At least one letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'number', label: 'At least one number', test: (v: string) => /\d/.test(v) },
] as const;

export const newPasswordField = z
  .string()
  .max(128, 'Use 128 characters or fewer')
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), 'Your password needs at least 8 characters, including a letter and a number');

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const createAccountSchema = z.object({
  fullName: z.string().trim().min(1, 'Tell us your name').max(120, 'Use 120 characters or fewer'),
  email: emailField,
  password: newPasswordField,
  organization: z.string().trim().max(160, 'Use 160 characters or fewer'),
  accountType: z.string().max(60),
  consent: z.boolean().refine((v) => v, 'Please agree to the Terms and Privacy policy to continue'),
});

export const resetSchema = z
  .object({ newPassword: newPasswordField, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: "The passwords don't match" });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: newPasswordField, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: "The passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password different from your current one' });

/** Only same-site relative paths may be used as a post-sign-in destination. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/** Every IANA time zone the browser knows, for the time zone picker. */
export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}

export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
