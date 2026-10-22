import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb } from './helpers.js';

// No real Meta calls are made: the Graph API is replaced with a fixture that fails the way Meta fails.
const graph = vi.hoisted(() => ({
  adAccounts: ['act_1', 'act_2'] as string[],
  /** The statuses the fixture accepts. Meta rejects a request that includes DELETED. */
  rejectedStatuses: [] as string[],
  adsByAccount: {} as Record<string, Array<Record<string, any>>>,
}));

vi.mock('../src/lib/http.js', async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    httpFetch: async (url: string | URL) => {
      const u = new URL(String(url));
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
      if (u.pathname.endsWith('/me/adaccounts')) return json({ data: graph.adAccounts.map((id) => ({ id, currency: 'INR' })) });
      const adsMatch = /\/act_(\d+)\/ads$/.exec(u.pathname);
      if (adsMatch) {
        const statuses = u.searchParams.get('effective_status');
        const list = statuses ? JSON.parse(statuses) as string[] : [];
        if (list.includes('DELETED')) return json({ error: { message: 'Cannot request deleted objects', code: 100 } }, 400);
        graph.rejectedStatuses = list;
        const rows = graph.adsByAccount[adsMatch[1]] ?? [];
        return json({ data: rows });
      }
      if (u.pathname.includes('/insights')) return json({ data: [] });
      return json({ error: { message: 'unexpected' } }, 404);
    },
  };
});

import { fetchInstagramAds } from '../src/integrations/meta/instagram/instagramAds.js';

describe('Instagram ads and boosted posts', () => {
  beforeAll(async () => { await startTestDb(); });
  afterAll(async () => { await stopTestDb(); });
  beforeEach(async () => {
    await clearDb();
    graph.adAccounts = ['act_1', 'act_2'];
    graph.rejectedStatuses = [];
    graph.adsByAccount = {
      1: [
        { id: 'ad_1', name: 'Another client ad', effective_status: 'ACTIVE', creative: { instagram_user_id: '999' } },
      ],
      2: [
        { id: 'ad_2', name: 'Our boost', effective_status: 'ACTIVE', creative: { instagram_user_id: '111', effective_instagram_media_id: '555' } },
      ],
    };
  });

  it('requests ads without a status Meta rejects, so the sync does not fail', async () => {
    const res = await fetchInstagramAds({ accessToken: 'token' } as any, '111', new Set<string>(), 30_000);
    expect(graph.rejectedStatuses).not.toContain('DELETED');
    expect(res.sync.status).toBe('ready');
  });

  it('imports the ads that belong to this Instagram profile and leaves the other clients\' ads out', async () => {
    const res = await fetchInstagramAds({ accessToken: 'token' } as any, '111', new Set<string>(), 30_000);
    expect(res.items.map((a) => a.id)).toEqual(['ad_2']);
    expect(res.items[0].category).toBe('boosted_post');
    expect(res.items[0].sourceMediaId).toBe('555');
  });

  it('matches a boosted post to the media id this app stores, in either form', async () => {
    // The app stores `ig_555`; Meta's creative says `555`.
    const res = await fetchInstagramAds({ accessToken: 'token' } as any, '999', new Set(['ig_555']), 30_000);
    const boost = res.items.find((a) => a.id === 'ad_2');
    expect(boost).toBeTruthy();
    expect(boost!.category).toBe('boosted_post');
  });
});
