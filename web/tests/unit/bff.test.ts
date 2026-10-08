import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('API_BASE_URL', 'https://api.test.example');
const { GET, POST } = await import('@/app/api/v1/[...path]/route');

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const call = (m: typeof GET, method: string, path: string, opts: { cookie?: string; body?: unknown } = {}) =>
  m(new NextRequest(`http://web.test/api/v1/${path}`, { method, headers: { ...(opts.cookie ? { cookie: opts.cookie } : {}), 'content-type': 'application/json' }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), { params: Promise.resolve({ path: path.split('/') }) });
const cookies = (r: Response) => r.headers.getSetCookie();
const tokens = { accessToken: 'AT1', refreshToken: 'RT1', expiresIn: 900, refreshExpiresIn: 2592000 };

describe('backend-for-frontend proxy', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('moves login tokens into httpOnly cookies and keeps them out of the page', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: { user: { id: 'u1' }, tokens } }));
    const res = await call(POST, 'POST', 'auth/login', { body: { email: 'a@b.co', password: 'x' } });
    const body = await res.text();
    expect(body).not.toContain('AT1'); expect(body).not.toContain('RT1');
    expect(JSON.parse(body).data.user.id).toBe('u1');
    const set = cookies(res).join('\n');
    expect(set).toMatch(/mn_at=AT1;.*HttpOnly.*SameSite=Lax/); expect(set).toMatch(/mn_rt=RT1;.*HttpOnly/);
  });

  it('sends the access token from the cookie to the API', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: [] }));
    await call(GET, 'GET', 'connections', { cookie: 'mn_at=AT1; mn_rt=RT1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.example/api/v1/connections');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer AT1');
  });

  it('refreshes once on a 401, retries, and sets the new cookies', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { success: true, data: { tokens: { ...tokens, accessToken: 'AT2', refreshToken: 'RT2' } } }))
      .mockResolvedValueOnce(json(200, { success: true, data: ['ok'] }));
    const res = await call(GET, 'GET', 'media', { cookie: 'mn_at=OLD; mn_rt=RT-refresh-1' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Headers((fetchMock.mock.calls[2] as [string, RequestInit])[1].headers).get('authorization')).toBe('Bearer AT2');
    expect(cookies(res).join('\n')).toContain('mn_at=AT2');
  });

  it('ends the session when the refresh is refused', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'revoked' } }));
    const res = await call(GET, 'GET', 'media', { cookie: 'mn_at=OLD; mn_rt=RT-refresh-2' });
    expect(res.status).toBe(401);
    expect(cookies(res).join('\n')).toMatch(/mn_at=;.*Max-Age=0/);
  });

  it('never lets the browser call the refresh endpoint directly', async () => {
    const res = await call(POST, 'POST', 'auth/refresh', { cookie: 'mn_rt=RT1' });
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the cookies on sign-out even if the API call failed', async () => {
    fetchMock.mockResolvedValueOnce(json(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'boom' } }));
    const res = await call(POST, 'POST', 'auth/logout', { cookie: 'mn_at=AT1; mn_rt=RT1' });
    expect(cookies(res).join('\n')).toMatch(/mn_rt=;.*Max-Age=0/);
  });

  it('answers with a clear message when the API cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const res = await call(GET, 'GET', 'connections', { cookie: 'mn_at=AT1' });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('API_UNREACHABLE');
  });
});
