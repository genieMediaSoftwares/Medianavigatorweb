import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '@/env';

const valid = { API_BASE_URL: 'https://api.example.test', COOKIE_SECURE: 'true', OPERATOR_NAME: 'Example Ltd', SUPPORT_EMAIL: 'help@example.test' };

describe('parseEnv', () => {
  it('accepts a complete configuration', () => {
    expect(parseEnv(valid)).toEqual({ apiBaseUrl: 'https://api.example.test', cookieSecure: true, operatorName: 'Example Ltd', supportEmail: 'help@example.test' });
  });

  it('lists every missing variable at once and has no defaults', () => {
    try {
      parseEnv({});
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).problems).toEqual(['API_BASE_URL is required', 'COOKIE_SECURE is required', 'OPERATOR_NAME is required', 'SUPPORT_EMAIL is required']);
    }
  });

  it('rejects blank values', () => {
    expect(() => parseEnv({ ...valid, API_BASE_URL: '   ' })).toThrow(/API_BASE_URL must not be empty/);
  });

  it('rejects an API address with a path, so /api/v1 is never doubled', () => {
    expect(() => parseEnv({ ...valid, API_BASE_URL: 'https://api.example.test/api/v1' })).toThrow(/origin only/);
  });

  it('only accepts "true" or "false" for COOKIE_SECURE', () => {
    expect(() => parseEnv({ ...valid, COOKIE_SECURE: 'yes' })).toThrow(/COOKIE_SECURE/);
    expect(parseEnv({ ...valid, COOKIE_SECURE: 'false' }).cookieSecure).toBe(false);
  });

  it('validates the support email', () => {
    expect(() => parseEnv({ ...valid, SUPPORT_EMAIL: 'not-an-email' })).toThrow(/SUPPORT_EMAIL/);
  });
});
