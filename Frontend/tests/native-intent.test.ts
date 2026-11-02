import { describe, expect, it } from 'vitest';
import { guardNativeIntent } from '@/lib/navigation/native-intent';

describe('incoming native links', () => {
  it('preserves valid password-reset, OAuth-return and planner links', () => {
    for (const path of ['medianavigator://reset-password?token=abc_123-test', 'medianavigator://connect/instagram?oauth=success', '/planner/123', '/connect/facebook?error=Please%20try%20again']) expect(guardNativeIntent(path)).toBe(path);
  });
  it('rejects malformed escapes, invalid UTF-8, controls and unbounded input before permissive decoding', () => {
    for (const path of ['/reset-password?token=%', '/?x=%FE%FF', '/?x=%E0%A4', '/?x=' + '%FE'.repeat(1200), '/?x=' + 'a'.repeat(5000), '/\u0000']) expect(guardNativeIntent(path)).toBe('/');
  });
});
