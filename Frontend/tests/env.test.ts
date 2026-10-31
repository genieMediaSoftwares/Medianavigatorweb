import { describe, expect, it } from 'vitest';

import { parseApiBaseUrl } from '@/config/env';
import eas from '../eas.json';

describe('mobile API origin', () => {
  it('has no fallback when the variable is missing', () => {
    expect(() => parseApiBaseUrl(undefined, true)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
    expect(() => parseApiBaseUrl('  ', false)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });
  it('requires https in release builds but allows a local http server in development builds', () => {
    expect(() => parseApiBaseUrl('http://192.168.1.10:8080', false)).toThrow(/release builds must use https/);
    expect(parseApiBaseUrl('http://192.168.1.10:8080', true)).toBe('http://192.168.1.10:8080');
    expect(parseApiBaseUrl('https://medianavigator-api.onrender.com/', false)).toBe('https://medianavigator-api.onrender.com');
  });
  it('does not echo the rejected value', () => {
    expect(() => parseApiBaseUrl('ftp://internal-host', false)).toThrow(/^(?!.*internal-host)/);
  });
  it('pins the Render API origin in every EAS build profile that produces an installable app', () => {
    for (const profile of [eas.build.preview, eas.build.production]) {
      expect(profile.env.EXPO_PUBLIC_API_BASE_URL).toBe('https://medianavigator-api.onrender.com');
    }
  });
});
