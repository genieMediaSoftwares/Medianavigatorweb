import { describe, expect, it } from 'vitest';
import { passwordFitsBcrypt } from '../../shared/passwordPolicy';
import { validateNewPassword } from '@/features/auth/validation';

describe('one password policy for API, website and mobile', () => {
  it('accepts the entire password instead of silently truncating UTF-8 bytes', () => {
    expect(passwordFitsBcrypt('A1' + 'a'.repeat(70))).toBe(true);
    expect(passwordFitsBcrypt('A1' + 'a'.repeat(71))).toBe(false);
    expect(passwordFitsBcrypt('A1' + 'é'.repeat(35))).toBe(true);
    expect(passwordFitsBcrypt('A1' + 'é'.repeat(36))).toBe(false);
    expect(validateNewPassword('A1' + '🔐'.repeat(18))).toContain('72');
  });
});
