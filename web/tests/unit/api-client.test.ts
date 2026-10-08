import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SIGNED_OUT_EVENT, apiGet, apiRequest } from '@/lib/api/client';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': 'req-1' } });

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unwraps the success envelope and paging meta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, { success: true, data: [1, 2], meta: { limit: 2, nextCursor: 'abc' } })));
    const r = await apiRequest<number[]>('/media', { query: { limit: 2, platform: undefined } });
    expect(r.data).toEqual([1, 2]);
    expect(r.meta?.nextCursor).toBe('abc');
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe('/api/v1/media?limit=2');
  });

  it('turns an error envelope into an ApiError with field details and the request id', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Check the form', details: [{ path: 'email', message: 'Bad email' }] } })));
    const err = await apiGet('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).fieldMessage('email')).toBe('Bad email');
    expect((err as ApiError).requestId).toBe('req-1');
  });

  it('shows the friendly rate-limit message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(429, { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again later.' } })));
    await expect(apiGet('/x')).rejects.toThrow('Too many requests. Please try again in a moment.');
  });

  it('announces a signed-out session on 401', async () => {
    const seen = vi.fn(); window.addEventListener(SIGNED_OUT_EVENT, seen);
    vi.stubGlobal('fetch', vi.fn(async () => reply(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Your session has ended.' } })));
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError);
    expect(seen).toHaveBeenCalledOnce();
    window.removeEventListener(SIGNED_OUT_EVENT, seen);
  });

  it('explains an unreachable API instead of throwing a raw network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = (await apiGet('/x').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('NETWORK');
    expect(err.message).toMatch(/couldn't reach Media Navigator/);
  });
});
