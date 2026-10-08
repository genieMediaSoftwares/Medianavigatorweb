import { z } from 'zod';

/** These mirror the API rules so people see the problem as they type, not after a round trip. */
export const emailField = z.string().trim().min(1, 'Enter your email').pipe(z.email('Add an @ and a domain, like name@company.com'));
export const passwordField = z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer');

export const signInSchema = z.object({ email: emailField, password: z.string().min(1, 'Enter your password') });
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Tell us your name').max(120, 'That name is too long'),
  email: emailField,
  password: passwordField,
  organization: z.string().trim().max(160, 'Keep it under 160 characters').optional(),
  accountType: z.string().optional(),
  consent: z.literal(true, { error: 'Please agree to the Terms and Privacy Policy to continue' }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({ newPassword: passwordField, confirm: z.string() }).refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The two passwords do not match' });

export const passwordRules = [
  { id: 'len', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'mix', label: 'A mix of letters and numbers (recommended)', test: (v: string) => /[a-zA-Z]/.test(v) && /\d/.test(v) },
];
