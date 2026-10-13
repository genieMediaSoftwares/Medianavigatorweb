import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});
import { syncService } from '../src/services/sync.service.js';

describe('per-platform post rankings', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => { await clearDb(); fake.reset(); });
  const drain = async () => { while (await syncService.runOne('t')); };

  async function twoPlatforms() {
    const u = await registerUser('rank@test.example');
    const ig = makeMedia(10, 'instagram', { prefix: 'ig' });
    // One Instagram post whose views Instagram didn't measure: it must not be ranked as "0 views".
    ig[0] = { ...ig[0], views: 0, missingMetrics: ['views'] };
    const yt = makeMedia(10, 'youtube', { prefix: 'yt' }).map((m, i) => ({ ...m, views: 100_000 + i * 1000 }));
    fake.items = [...ig, ...yt];
    await api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken: 'tok' });
    await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ apiKey: 'key', channelQuery: '@x' });
    await drain();
    return u;
  }

  it('ranks and compares each platform only against itself', async () => {
    const u = await twoPlatforms();
    const res = (await api().get('/api/v1/intelligence/performers?sortBy=views&platform=instagram').set(u.auth)).body.data;
    expect(res.top.length).toBeGreaterThan(0);
    expect([...res.top, ...res.bottom].every((p: any) => p.platform === 'instagram')).toBe(true);
    // Compared with Instagram's own typical post, not an average that includes YouTube's 100k views.
    expect(res.top[0].baselineComparison).toMatch(/^\+\d+% views vs your median \(1,\d{3}\)$/);
    expect(res.bottom[0].baselineComparison).toMatch(/^-\d+% views vs your median/);

    const yt = (await api().get('/api/v1/intelligence/performers?sortBy=views&platform=youtube').set(u.auth)).body.data;
    expect([...yt.top, ...yt.bottom].every((p: any) => p.platform === 'youtube')).toBe(true);
  });

  it('leaves out posts whose ranking metric was not measured', async () => {
    const u = await twoPlatforms();
    const res = (await api().get('/api/v1/intelligence/performers?sortBy=views&platform=instagram').set(u.auth)).body.data;
    const ids = [...res.top, ...res.bottom].map((p: any) => p.mediaId);
    expect(ids).not.toContain('ig_1');
    // ...but it is still ranked on a metric that was measured.
    const byLikes = (await api().get('/api/v1/intelligence/performers?sortBy=likes&platform=instagram').set(u.auth)).body.data;
    expect([...byLikes.top, ...byLikes.bottom].map((p: any) => p.mediaId)).toContain('ig_1');
    expect(byLikes.top[0].baselineComparison).toMatch(/likes vs your median/);
  });

  it('still answers without a platform, and rejects unknown platforms', async () => {
    const u = await twoPlatforms();
    expect((await api().get('/api/v1/intelligence/performers?sortBy=engagement').set(u.auth)).status).toBe(200);
    expect((await api().get('/api/v1/intelligence/performers?platform=tiktok').set(u.auth)).status).toBe(422);
  });

  it('never shows another user’s posts', async () => {
    await twoPlatforms();
    const other = await registerUser('other-rank@test.example');
    const res = (await api().get('/api/v1/intelligence/performers?platform=instagram').set(other.auth)).body.data;
    expect(res).toEqual({ top: [], bottom: [] });
  });
});
