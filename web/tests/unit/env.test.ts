import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/env';

describe('environment', () => {
  it('has no defaults: a missing API address stops startup with a readable message', () => {
    expect(() => parseEnv({})).toThrow(/API_BASE_URL/);
  });
  it('rejects values that are not a full http(s) URL', () => {
    expect(() => parseEnv({ API_BASE_URL: 'localhost:8080' })).toThrow(/API_BASE_URL/);
    expect(() => parseEnv({ API_BASE_URL: 'ftp://api.example.com' })).toThrow(/http/);
  });
  it('in production requires https and real operator/contact details, naming only the variables', () => {
    const prod = { NODE_ENV: 'production', API_BASE_URL: 'https://api.example.com', OPERATOR_NAME: 'Example Ltd', SUPPORT_EMAIL: 'help@example.com' };
    expect(parseEnv(prod)).toMatchObject({ OPERATOR_NAME: 'Example Ltd', SUPPORT_EMAIL: 'help@example.com' });
    expect(() => parseEnv({ ...prod, API_BASE_URL: 'http://localhost:8080' })).toThrow(/API_BASE_URL must use https in production/);
    expect(() => parseEnv({ ...prod, OPERATOR_NAME: '' })).toThrow(/OPERATOR_NAME is required/);
    expect(() => parseEnv({ ...prod, SUPPORT_EMAIL: undefined })).toThrow(/SUPPORT_EMAIL is required/);
    expect(() => parseEnv({ ...prod, SUPPORT_EMAIL: 'not-an-email' })).toThrow(/SUPPORT_EMAIL must be an email/);
    try { parseEnv({ ...prod, API_BASE_URL: 'http://secret-host.internal' }); } catch (e) { expect(String(e)).not.toContain('secret-host'); }
  });
  it('validates the optional admin app address', () => {
    const prod = { NODE_ENV: 'production', API_BASE_URL: 'https://api.example.com', OPERATOR_NAME: 'Example Ltd', SUPPORT_EMAIL: 'help@example.com' };
    expect(parseEnv(prod).ADMIN_APP_URL).toBeUndefined();
    expect(parseEnv({ ...prod, ADMIN_APP_URL: 'https://admin.example.com' }).ADMIN_APP_URL).toBe('https://admin.example.com');
    expect(() => parseEnv({ ...prod, ADMIN_APP_URL: 'http://admin.example.com' })).toThrow(/ADMIN_APP_URL must use https/);
    expect(() => parseEnv({ API_BASE_URL: 'http://localhost:8080', ADMIN_APP_URL: 'admin' })).toThrow(/ADMIN_APP_URL must be a full URL/);
  });
  it('outside production leaves operator details optional (the page says they are not configured)', () => {
    const env = parseEnv({ API_BASE_URL: 'http://localhost:8080' });
    expect(env.OPERATOR_NAME).toBeUndefined();
    expect(env.SUPPORT_EMAIL).toBeUndefined();
  });
  it('accepts an origin and removes trailing slashes', () => {
    expect(parseEnv({ API_BASE_URL: 'https://api.example.com//' }).API_BASE_URL).toBe('https://api.example.com');
  });
});
