import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.test.example' }));
vi.mock('@/lib/storage/secure-storage', () => ({
  SecureStorageKey: { AccessToken: 'access', RefreshToken: 'refresh' },
  getSecureItem: vi.fn(async (key: string) => key === 'access' ? 'AT1' : 'RT1'),
  setSecureItem: vi.fn(),
  deleteSecureItem: vi.fn(),
}));

import { apiRequest, setUnauthorizedHandler } from '@/lib/api/client';
import { deleteSecureItem, setSecureItem } from '@/lib/storage/secure-storage';

afterEach(() => { setUnauthorizedHandler(null); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('password confirmation', () => {
  it.each([['/auth/change-password', 'POST'], ['/users/me', 'DELETE']] as const)('keeps stored tokens and shows the error at %s', async (path, method) => {
    const signedOut = vi.fn();
    setUnauthorizedHandler(signedOut);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Password is incorrect' } }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest(path, { method, auth: true, json: { password: 'wrong' } })).rejects.toMatchObject({ status: 400, code: 'INVALID_CREDENTIALS', message: 'Password is incorrect' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(deleteSecureItem).not.toHaveBeenCalled();
    expect(setSecureItem).not.toHaveBeenCalled();
    expect(signedOut).not.toHaveBeenCalled();
  });
});
