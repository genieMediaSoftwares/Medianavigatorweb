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
  it('accepts an origin and removes trailing slashes', () => {
    expect(parseEnv({ API_BASE_URL: 'https://api.example.com//' }).API_BASE_URL).toBe('https://api.example.com');
  });
});
