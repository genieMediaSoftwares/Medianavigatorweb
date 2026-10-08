import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, api, apiPage, setSignedOutHandler } from '@/lib/api/client';

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }));

afterEach(() => setSignedOutHandler(null));

describe('api client', () => {
  it('calls the same-origin BFF and parses the envelope', async () => {
    const f = respond(200, { success: true, data: { unread: 3 } });
    await expect(api('/notifications/unread-count', z.object({ unread: z.number() }))).resolves.toEqual({ unread: 3 });
    expect(f.mock.calls[0][0]).toBe('/api/v1/notifications/unread-count');
  });

  it('drops empty query values', async () => {
    const f = respond(200, { success: true, data: [], meta: { limit: 5, nextCursor: 'abc' } });
    const page = await apiPage('/media', z.object({ id: z.string() }), { query: { platform: undefined, limit: 5, cursor: '' } });
    expect(f.mock.calls[0][0]).toBe('/api/v1/media?limit=5');
    expect(page).toEqual({ items: [], nextCursor: 'abc', total: undefined });
  });

  it("surfaces the API's error message and request id", async () => {
    respond(409, { success: false, error: { code: 'CONFLICT', message: 'Already exists' } }, { 'x-request-id': 'req-1' });
    const err = await api('/x', z.unknown()).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Already exists', requestId: 'req-1' });
  });

  it('uses the friendly rate-limit message on 429', async () => {
    respond(429, { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    await expect(api('/x', z.unknown())).rejects.toThrow('Too many requests. Please try again in a moment.');
  });

  it('signs out on 401, except for public auth calls', async () => {
    const onOut = vi.fn();
    setSignedOutHandler(onOut);
    respond(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } });
    await api('/connections', z.unknown()).catch(() => undefined);
    expect(onOut).toHaveBeenCalledTimes(1);
    await api('/auth/login', z.unknown(), { method: 'POST', body: {}, signOutOn401: false }).catch(() => undefined);
    expect(onOut).toHaveBeenCalledTimes(1);
  });

  it('reports a contract mismatch instead of rendering wrong data', async () => {
    respond(200, { success: true, data: { unread: 'three' } });
    await expect(api('/n', z.object({ unread: z.number() }))).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE' });
  });

  it('reports network failures as unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await api('/x', z.unknown()).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).unreachable).toBe(true);
  });
});
