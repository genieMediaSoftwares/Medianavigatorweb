// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

process.env.API_BASE_URL = 'https://api.example.test';
process.env.COOKIE_SECURE = 'true';
process.env.OPERATOR_NAME = 'Test Operator';
process.env.SUPPORT_EMAIL = 'support@example.test';

const { GET, POST } = await import('@/app/api/v1/[...path]/route');

const ORIGIN = 'https://app.example.test';
const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) }) as never;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const tokens = (n: number) => ({ accessToken: `access-${n}`, refreshToken: `refresh-token-${n}-xxxxxxxxxxxxxxxx`, tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 2_592_000 });

function req(method: string, path: string, opts: { cookies?: string; body?: unknown; site?: string } = {}) {
  const headers: Record<string, string> = { 'sec-fetch-site': opts.site ?? 'same-origin' };
  if (opts.cookies) headers.cookie = opts.cookies;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(`${ORIGIN}/api/v1${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('BFF route handler', () => {
  it('moves sign-in tokens into httpOnly cookies and strips them from the JSON', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: { user: { id: 'u1' }, tokens: tokens(1) } }));
    const res = await POST(req('POST', '/auth/login', { body: { email: 'a@b.c', password: 'x' } }), ctx(['auth', 'login']));
    const body = await res.json();
    expect(body.data.tokens).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('access-1');
    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toMatch(/mn_at=access-1;.*HttpOnly/i);
    expect(cookies).toMatch(/mn_rt=refresh-token-1/);
    expect(cookies).toMatch(/Secure/);
    expect(cookies).toMatch(/SameSite=lax/i);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/v1/auth/login');
  });

  it('attaches the access token from the cookie, never from the browser', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: [] }));
    await GET(req('GET', '/connections', { cookies: 'mn_at=access-9; mn_rt=refresh-token-9-xxxxxxxxxxxxxxxx' }), ctx(['connections']));
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer access-9');
  });

  it('refreshes once on 401, retries, and rotates the cookies', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { success: true, data: { tokens: tokens(2) } }))
      .mockResolvedValueOnce(json(200, { success: true, data: { ok: true } }));
    const res = await GET(req('GET', '/auth/me', { cookies: 'mn_at=stale; mn_rt=refresh-token-a-xxxxxxxxxxxxxxxx' }), ctx(['auth', 'me']));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.test/api/v1/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers.authorization).toBe('Bearer access-2');
    expect(res.headers.getSetCookie().join('\n')).toMatch(/mn_rt=refresh-token-2/);
  });

  it('clears the cookies and returns 401 when the refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } }));
    const res = await GET(req('GET', '/auth/me', { cookies: 'mn_at=stale; mn_rt=refresh-token-b-xxxxxxxxxxxxxxxx' }), ctx(['auth', 'me']));
    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie().join('\n')).toMatch(/mn_rt=;.*Max-Age=0/i);
  });

  it('never lets the browser call the refresh or internal endpoints', async () => {
    expect((await POST(req('POST', '/auth/refresh', { body: {} }), ctx(['auth', 'refresh']))).status).toBe(404);
    expect((await POST(req('POST', '/internal/jobs/run', { body: {} }), ctx(['internal', 'jobs', 'run']))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cannot be tricked by case or dot-segments (the API matches routes case-insensitively)', async () => {
    expect((await POST(req('POST', '/AUTH/Refresh', { body: {} }), ctx(['AUTH', 'Refresh']))).status).toBe(404);
    expect((await POST(req('POST', '/Internal/jobs/run', { body: {} }), ctx(['Internal', 'jobs', 'run']))).status).toBe(404);
    expect((await POST(req('POST', '/x/../auth/refresh', { body: {} }), ctx(['x', '..', 'auth', 'refresh']))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(json(200, { success: true, data: { user: { id: 'u1' }, tokens: tokens(3) } }));
    const res = await POST(req('POST', '/Auth/LOGIN', { body: { email: 'a@b.c', password: 'x' } }), ctx(['Auth', 'LOGIN']));
    expect(JSON.stringify(await res.json())).not.toContain('access-3');
    expect(res.headers.getSetCookie().join('\n')).toMatch(/mn_at=access-3/);
  });

  it('keeps the case of ids it forwards', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: {} }));
    await GET(req('GET', '/media/yt_AbC', { cookies: 'mn_at=a' }), ctx(['media', 'yt_AbC']));
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/v1/media/yt_AbC');
  });

  it('rejects cross-site writes', async () => {
    const res = await POST(req('POST', '/connections/sync-all', { site: 'cross-site', cookies: 'mn_at=a' }), ctx(['connections', 'sync-all']));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an unreachable API with the configured-address hint', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await GET(req('GET', '/connections', { cookies: 'mn_at=a' }), ctx(['connections']));
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('API_UNREACHABLE');
  });
});
