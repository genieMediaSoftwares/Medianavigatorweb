import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetaAuth } from '../src/integrations/meta/metaAuth.js';
import { httpFetch } from '../src/lib/http.js';
vi.mock('../src/lib/http.js', () => ({ httpFetch: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const response = (body: unknown, status = 400) => new Response(JSON.stringify(body), { status });

describe('Meta token validation errors', () => {
  it('explains a provider access block without accepting the token', async () => {
    vi.mocked(httpFetch).mockImplementation(async () => response({ error: { message: 'API access blocked.', code: 200 } }));
    const result = await MetaAuth.validateToken('test-token-not-real');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Meta returned “API access blocked”');
    expect(result.error).toContain('does not identify whether');
    expect(result.error).not.toContain('Most often');
    expect(result.error).not.toContain('test-token-not-real');
  });
  it('still permits a successful Instagram fallback', async () => {
    vi.mocked(httpFetch)
      .mockResolvedValueOnce(response({ error: { message: 'API access blocked.' } }))
      .mockResolvedValueOnce(response({ id: 'ig-123', username: 'creator' }, 200));
    expect((await MetaAuth.validateToken('test-token-not-real')).isValid).toBe(true);
  });
  it('does not mislabel expired tokens as access blocks', async () => {
    vi.mocked(httpFetch).mockImplementation(async () => response({ error: { message: 'Access token expired', code: 190 } }));
    const r = await MetaAuth.validateToken('test-token-not-real');
    expect(r.reason).toBe('token_expired');
    expect(r.error).toMatch(/has expired/);
    expect(r.error).not.toMatch(/blocked/);
  });

  it.each(['instagram', 'facebook'] as const)('accepts a Page token for %s without requesting User-only identity fields', async (platform) => {
    const fields: Array<string | null> = [];
    vi.mocked(httpFetch).mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/me')) {
        fields.push(url.searchParams.get('fields'));
        return url.searchParams.get('fields') === 'id,name'
          ? response({ id: 'page-1', name: 'My Page' }, 200)
          : response({ error: { code: 100, message: 'Unsupported field on Page' } });
      }
      return response({ error: { code: 100, message: 'Unsupported edge on Page' } });
    });
    const result = await MetaAuth.validateToken('page-token-not-real', platform);
    expect(result).toMatchObject({ isValid: true, scopesVerified: false });
    expect(fields).toEqual(['id,name']);
  });

  it('records an empty granted permission list as verified', async () => {
    vi.mocked(httpFetch).mockImplementation(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith('/me')
        ? response({ id: 'user-1', name: 'User' }, 200)
        : response({ data: [] }, 200);
    });
    expect(await MetaAuth.validateToken('user-token-not-real')).toMatchObject({ isValid: true, scopesVerified: true, scopes: [] });
  });

  it('does not validate a Facebook connection through the Instagram API', async () => {
    vi.mocked(httpFetch).mockImplementation(async (input) => new URL(String(input)).hostname === 'graph.instagram.com'
      ? response({ id: 'ig-1', username: 'creator' }, 200)
      : response({ error: { code: 190, message: 'Invalid token' } }));
    expect((await MetaAuth.validateToken('instagram-only-token', 'facebook')).isValid).toBe(false);
    expect(vi.mocked(httpFetch).mock.calls.every(([input]) => new URL(String(input)).hostname === 'graph.facebook.com')).toBe(true);
  });
});
