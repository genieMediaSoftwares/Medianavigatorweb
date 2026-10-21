import { NextRequest } from 'next/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.stubEnv('API_BASE_URL', 'https://api.test.example');
const { GET, POST } = await import('@/app/api/v1/[...path]/route');
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const tokens = { accessToken: 'ADMIN_ACCESS', refreshToken: 'ADMIN_REFRESH', expiresIn: 900, refreshExpiresIn: 86400 };
function call(method: string, path: string, site = 'same-origin', cookie = '') {
  const request = new NextRequest(`https://admin.test/api/v1/${path}`, { method, headers: { 'sec-fetch-site': site, cookie }, ...(method === 'POST' ? { body: '{}' } : {}) });
  return (method === 'GET' ? GET : POST)(request, { params: Promise.resolve({ path: path.split('/') }) });
}
describe('isolated admin BFF', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());
  it('issues isolated httpOnly cookies and never returns tokens', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, data: { user: { role: 'admin' }, tokens } }));
    const response = await call('POST', 'auth/login');
    expect(response.status).toBe(200);
    expect(await response.text()).not.toMatch(/ADMIN_ACCESS|ADMIN_REFRESH/);
    expect(response.headers.get('set-cookie')).toMatch(/mn_admin_at=ADMIN_ACCESS;.*HttpOnly.*SameSite=Lax.*Secure/);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects customer login and revokes the new session', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, data: { user: { role: 'user' }, tokens } })).mockResolvedValueOnce(json({ success: true }));
    const response = await call('POST', 'auth/login');
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('ADMIN_ACCESS');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.test.example/api/v1/auth/logout');
  });
  it('blocks registration, customer APIs, internal routes, refresh and path tricks', async () => {
    for (const path of ['auth/register', 'media', 'internal/jobs/run', 'AUTH/REFRESH', 'admin/../users']) expect((await call('POST', path)).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects cross-site writes before calling upstream', async () => {
    expect((await call('POST', 'admin/connections/123/sync', 'cross-site')).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('never uses customer cookies as an admin session', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false }, 401));
    const response = await call('GET', 'admin/system', 'same-origin', 'mn_at=CUSTOMER');
    expect(new Headers(fetchMock.mock.calls[0]?.[1].headers).has('authorization')).toBe(false);
    expect(response.status).toBe(401);
  });
  it('forwards admin credentials and preserves backend permission denial', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false, error: { code: 'FORBIDDEN' } }, 403));
    const response = await call('GET', 'admin/users', 'same-origin', 'mn_admin_at=ADMIN_ACCESS');
    expect(new Headers(fetchMock.mock.calls[0]?.[1].headers).get('authorization')).toBe('Bearer ADMIN_ACCESS');
    expect(response.status).toBe(403);
  });
  it('refreshes expired access through the existing session API', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ data: { tokens } })).mockResolvedValueOnce(json({ success: true, data: {} }));
    const response = await call('GET', 'admin/system', 'same-origin', 'mn_admin_at=OLD; mn_admin_rt=REFRESH_ROTATION');
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.test.example/api/v1/auth/refresh');
    expect(response.headers.get('set-cookie')).toContain('mn_admin_at=ADMIN_ACCESS');
  });
  it('reports unavailability without fabricated data', async () => {
    fetchMock.mockRejectedValueOnce(new Error('unreachable'));
    const response = await call('GET', 'admin/system');
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('API_UNREACHABLE');
  });
});
