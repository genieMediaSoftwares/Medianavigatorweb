// Client-side checks for fast feedback. They mirror backend/src/validators/index.ts;
// the server remains the source of truth and re-validates every request.
import { passwordFitsBcrypt, PASSWORD_BYTE_MESSAGE } from '../../../../shared/passwordPolicy';

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (!passwordFitsBcrypt(password)) return PASSWORD_BYTE_MESSAGE;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return null;
}

export function validateFullName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Name is required.';
  if (value.length > 120) return 'Name must be at most 120 characters.';
  return null;
}
