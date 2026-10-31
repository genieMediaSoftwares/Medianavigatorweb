import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.test.example' }));
vi.mock('@/lib/storage/secure-storage', () => ({ SecureStorageKey: { AccessToken: 'access', RefreshToken: 'refresh' }, getSecureItem: vi.fn(), setSecureItem: vi.fn(), deleteSecureItem: vi.fn() }));
import { apiRequest } from '@/lib/api/client';
import { requestTimeoutMs } from '../../shared/requestPolicy';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('mobile API reliability', () => {
  it('shares the same analysis budgets with the website and admin proxies', () => {
    for (const path of ['/intelligence/deep-report', '/intelligence/creative-report', '/intelligence/content-analysis/upload', '/intelligence/analyze-video']) expect(requestTimeoutMs(path)).toBe(240_000);
    for (const path of ['/auth/login', '/intelligence/deep-report-v2', '/intelligence/deep-report-v2/job', '/connections']) expect(requestTimeoutMs(path)).toBe(30_000);
  });
  it('aborts a hung request and reports a retryable timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))))));
    const result = expect(apiRequest('/auth/forgot-password', { method: 'POST', json: { email: 'user@test.example' } })).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT', status: 0 });
    await vi.advanceTimersByTimeAsync(30_000);
    await result;
  });

  it('preserves a longer explicit budget for real-media analysis', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
    vi.stubGlobal('fetch', fetcher);
    const result = expect(apiRequest('/intelligence/content-analysis', { timeoutMs: 240_000 })).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(210_000);
    await result;
  });

  it('cleans up timers after a valid response', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":true,"data":{"ok":true}}')));
    expect(await apiRequest('/health')).toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });
});
