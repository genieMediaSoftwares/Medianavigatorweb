import { describe, expect, it, vi } from 'vitest';
import { createRefresher, type RefreshOutcome } from '@/lib/server/refresh';

const tokens = (n: number) => ({ accessToken: `a${n}`, refreshToken: `r${n}`, expiresIn: 900, refreshExpiresIn: 86400 });

describe('createRefresher (single-flight)', () => {
  it('shares one upstream refresh between concurrent requests with the same token', async () => {
    let resolve!: (o: RefreshOutcome) => void;
    const upstream = vi.fn(() => new Promise<RefreshOutcome>((r) => { resolve = r; }));
    const refresh = createRefresher(upstream);
    const a = refresh('old');
    const b = refresh('old');
    resolve({ ok: true, tokens: tokens(1) });
    expect(await a).toEqual(await b);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('reuses a recent result for late requests that still carry the old token (no replay)', async () => {
    let t = 0;
    const upstream = vi.fn(async (): Promise<RefreshOutcome> => ({ ok: true, tokens: tokens(1) }));
    const refresh = createRefresher(upstream, () => t);
    await refresh('old');
    t = 30_000;
    expect(await refresh('old')).toEqual({ ok: true, tokens: tokens(1) });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('forgets results after the reuse window', async () => {
    let t = 0;
    const upstream = vi.fn(async (): Promise<RefreshOutcome> => ({ ok: true, tokens: tokens(1) }));
    const refresh = createRefresher(upstream, () => t);
    await refresh('old');
    t = 120_000;
    await refresh('old');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('does not remember failures, and turns thrown errors into a failed outcome', async () => {
    const upstream = vi.fn<(t: string) => Promise<RefreshOutcome>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, tokens: tokens(2) });
    const refresh = createRefresher(upstream);
    expect(await refresh('old')).toEqual({ ok: false });
    expect(await refresh('old')).toEqual({ ok: true, tokens: tokens(2) });
  });
});
