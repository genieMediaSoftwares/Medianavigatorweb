import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.test' }));
vi.mock('@/lib/storage/secure-storage', () => ({
  SecureStorageKey: { AccessToken: 'access', RefreshToken: 'refresh' },
  getSecureItem: async (key: string) => storage.get(key) ?? null,
  setSecureItem: async (key: string, value: string) => { storage.set(key, value); },
  deleteSecureItem: async (key: string) => { storage.delete(key); },
}));
const reply = (status: number, data: unknown = {}) => new Response(JSON.stringify(
  status === 200 ? { success: true, data } : { success: false, error: { code: 'ERROR', message: 'Failed' } },
), { status });
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetModules();
  storage.clear();
  storage.set('access', 'old-access');
  storage.set('refresh', 'old-refresh');
});
afterEach(() => vi.unstubAllGlobals());

it('reuses the replacement token for a delayed 401 without rotating again', async () => {
  const slow = deferred();
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return reply(200, { tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
    if ((init.headers as Record<string, string>).Authorization === 'Bearer new-access') return reply(200, 'ok');
    return url.endsWith('/slow') ? slow.promise : reply(401);
  });
  vi.stubGlobal('fetch', fetchMock);
  const { apiRequest } = await import('@/lib/api/client');
  const pending = apiRequest('/slow', { auth: true });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await expect(apiRequest('/fast', { auth: true })).resolves.toBe('ok');
  slow.resolve(reply(401));
  await expect(pending).resolves.toBe('ok');
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
});

it('waits for an active refresh before starting another authenticated request', async () => {
  const rotation = deferred();
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return rotation.promise;
    return (init.headers as Record<string, string>).Authorization === 'Bearer old-access' ? reply(401) : reply(200, 'ok');
  });
  vi.stubGlobal('fetch', fetchMock);
  const { apiRequest } = await import('@/lib/api/client');
  const first = apiRequest('/first', { auth: true });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const second = apiRequest('/second', { auth: true });
  await Promise.resolve();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  rotation.resolve(reply(200, { tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } }));
  await expect(Promise.all([first, second])).resolves.toEqual(['ok', 'ok']);
});

it('clears a rejected session and asks the auth provider to sign out', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => reply(401)));
  const { apiRequest, setUnauthorizedHandler } = await import('@/lib/api/client');
  const signOut = vi.fn();
  setUnauthorizedHandler(signOut);
  await expect(apiRequest('/test', { auth: true })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(storage.size).toBe(0);
  expect(signOut).toHaveBeenCalledOnce();
});

it('preserves the session when refresh has a temporary server failure', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => reply(url.endsWith('/auth/refresh') ? 503 : 401)));
  const { apiRequest, setUnauthorizedHandler } = await import('@/lib/api/client');
  const signOut = vi.fn();
  setUnauthorizedHandler(signOut);
  await expect(apiRequest('/test', { auth: true })).rejects.toMatchObject({ status: 503 });
  expect(storage.get('refresh')).toBe('old-refresh');
  expect(signOut).not.toHaveBeenCalled();
});
