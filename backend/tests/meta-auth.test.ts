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
    expect(result.error).toContain('Meta has blocked API access');
    expect(result.error).toContain('Graph API Explorer');
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
    expect((await MetaAuth.validateToken('test-token-not-real')).error).toBe('Access token expired');
  });
});
