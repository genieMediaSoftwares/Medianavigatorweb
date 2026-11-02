import { describe, expect, it } from 'vitest';
import { secureDatabaseTransport } from '../src/config/databaseTransport.js';
import { buildConfig } from '../src/config/env.js';

describe('production database transport', () => {
  it.each([
    'mongodb+srv://test:test@cluster.invalid/test',
    'mongodb://test:test@a.invalid:27017,b.invalid:27017/test?tls=true',
    'mongodb://test:test@a.invalid/test?ssl=true&tlsAllowInvalidCertificates=false',
  ])('accepts verified TLS: %s', uri => expect(secureDatabaseTransport(uri)).toBe(true));
  it.each([
    'mongodb://localhost/test',
    'mongodb+srv://test:test@cluster.invalid/test?tls=false',
    'mongodb+srv://test:test@cluster.invalid/test?ssl=false',
    'mongodb+srv://test:test@cluster.invalid/test?tls=true&TLS=false',
    ...['tlsInsecure', 'tlsAllowInvalidHostnames', 'tlsAllowInvalidCertificates'].map(key => `mongodb+srv://test:test@cluster.invalid/test?${key}=true`),
  ])('rejects insecure transport: %s', uri => expect(secureDatabaseTransport(uri)).toBe(false));
  it('rejects before connecting without exposing credentials in errors', () => {
    const source = { ...process.env, NODE_ENV: 'production', MONGODB_URI: 'mongodb://synthetic-user:synthetic-password@host.invalid/test' };
    try { buildConfig(source); throw new Error('Expected rejection'); } catch (error) {
      expect(String(error)).toContain('MONGODB_URI must enable TLS');
      expect(String(error)).not.toMatch(/synthetic-user|synthetic-password|host.invalid/);
    }
    expect(buildConfig({ ...source, MONGODB_URI: 'mongodb+srv://test:test@cluster.invalid/test' }).server.isProduction).toBe(true);
  });
});
