import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env';

describe('admin environment', () => {
  it('has no default API origin', () => {
    expect(() => parseEnv({})).toThrow(/API_BASE_URL/);
  });
  it('requires https in production and allows a local http origin in development', () => {
    expect(() => parseEnv({ NODE_ENV: 'production', API_BASE_URL: 'http://localhost:8080' })).toThrow(/https in production/);
    expect(parseEnv({ NODE_ENV: 'production', API_BASE_URL: 'https://api.example.com/' }).API_BASE_URL).toBe('https://api.example.com');
    expect(parseEnv({ NODE_ENV: 'development', API_BASE_URL: 'http://localhost:8080' }).API_BASE_URL).toBe('http://localhost:8080');
  });
});
