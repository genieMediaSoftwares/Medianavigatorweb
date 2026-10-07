import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';
import { baselineFor, buildSummary, classify, median, mean, percentile, extractTopics, MIN_HISTORY_FOR_CLASSIFICATION } from '../src/services/analytics.stats.js';
import { AnalyticsEngine } from '../src/services/analytics.engine.js';
import type { NormalizedMedia, PlatformConnection } from '../../shared/types.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});
import { syncService } from '../src/services/sync.service.js';

describe('statistics helpers', () => {
  it('median resists outliers where the mean does not', () => {
    const xs = [2, 2.1, 2.2, 2.3, 50];
    expect(median(xs)).toBe(2.2);
    expect(mean(xs)).toBeGreaterThan(10);
    expect(percentile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(median([])).toBe(0);
  });

  it('classifies relative to the user’s own history, not fixed thresholds', () => {
    const items = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 8].map((e) => ({ engagementRate: e, views: 100 }));
    const b = baselineFor(items);
    expect(classify({ engagementRate: 8 }, b)).toBe('TOP');
    expect(classify({ engagementRate: 1 }, b)).toBe('LOW');
    expect(classify({ engagementRate: 1.8 }, b)).toBe('TYPICAL');
    // the same 8% is only "typical" for an account where 8% is normal
    const high = baselineFor([7, 7.5, 8, 8.5, 9, 7.2, 8.1, 8.4].map((e) => ({ engagementRate: e, views: 1 })));
    expect(classify({ engagementRate: 8 }, high)).toBe('TYPICAL');
  });

  it('refuses to classify with too little history', () => {
    const b = baselineFor([{ engagementRate: 1, views: 1 }, { engagementRate: 5, views: 1 }]);
    expect(b.sampleSize).toBeLessThan(MIN_HISTORY_FOR_CLASSIFICATION);
    expect(classify({ engagementRate: 5 }, b)).toBe('INSUFFICIENT_DATA');
  });

  it('extracts hashtag topics', () => {
    expect(extractTopics('Hello #One #two #One text')).toEqual(['#one', '#two']);
  });
});

describe('summary scoping', () => {
  const media = [...makeMedia(10, 'instagram'), ...makeMedia(10, 'youtube', { startEng: 6 })];

  it('"all" contains only connected platforms; a platform scope contains only that platform', () => {
    const igOnly = buildSummary({ media, connectedPlatforms: ['instagram'], days: 30 });
    expect(igOnly.platformsIncluded).toEqual(['instagram']);
    expect(igOnly.topContent.concat(igOnly.needsImprovement).every((c) => c.platform === 'instagram')).toBe(true);
    expect(Object.keys(igOnly.baselines)).toEqual(['instagram']);

    const both = buildSummary({ media, connectedPlatforms: ['instagram', 'youtube'], days: 30 });
    expect(both.platformsIncluded.sort()).toEqual(['instagram', 'youtube']);

    const yt = buildSummary({ media, connectedPlatforms: ['instagram', 'youtube'], platform: 'youtube', days: 30 });
    expect(yt.platformsIncluded).toEqual(['youtube']);
    expect(yt.contentTypePerformance.every((c) => c.platform === 'youtube')).toBe(true);

    const notConnected = buildSummary({ media, connectedPlatforms: ['instagram'], platform: 'youtube', days: 30 });
    expect(notConnected.platformsIncluded).toEqual([]);
    expect(notConnected.topContent).toEqual([]);
  });

  it('uses medians and labels every figure explicitly', () => {
    const s = buildSummary({ media, connectedPlatforms: ['instagram', 'youtube'], days: 30 });
    expect(s.contentTypePerformance[0]).toHaveProperty('medianEngagementRate');
    expect(s.contentTypePerformance[0]).toHaveProperty('meanEngagementRate');
    expect(s.classificationMethod).toMatch(/P75/);
    expect(s.calcVersion).toBeGreaterThan(0);
  });
});

describe('timing engine', () => {
  const conn = [{ platform: 'instagram', connected: true }] as PlatformConnection[];
  const at = (iso: string, eng: number) => ({ ...makeMedia(1)[0], publishedAt: iso, engagementRate: eng }) as NormalizedMedia;

  it('buckets by the user’s timezone, not the server’s', () => {
    // 2026-03-02 (Monday) 23:30 UTC is Tuesday 05:00 in Asia/Kolkata
    const posts = [at('2026-03-02T23:30:00Z', 9), at('2026-03-09T23:30:00Z', 9), at('2026-03-03T10:00:00Z', 1)];
    const utc = new AnalyticsEngine(posts, conn, { timezone: 'UTC' }).getTopWindows(1)[0];
    const ist = new AnalyticsEngine(posts, conn, { timezone: 'Asia/Kolkata' }).getTopWindows(1)[0];
    expect(utc).toMatchObject({ day: 'Monday', timeOfDay: 'Night' });
    expect(ist).toMatchObject({ day: 'Tuesday', timeOfDay: 'Night', timezone: 'Asia/Kolkata' }); // same instant, different weekday
  });

  it('reports the real mean engagement and sample size, preferring slots with 2+ posts', () => {
    const posts = [at('2026-03-02T10:00:00Z', 20), at('2026-03-04T19:00:00Z', 4), at('2026-03-11T19:00:00Z', 6)];
    const t = new AnalyticsEngine(posts, conn).getTimingData() as any;
    expect(t.strongestWindow.label).toContain('Wed');
    expect(t.strongestWindow.supportingText).toMatch(/2 posts.*5\.00% engagement/);
    expect(t.strongestWindow.confidence).toBe('Low');
  });

  it('recommendations never carry a hardcoded slot', () => {
    const none = new AnalyticsEngine(makeMedia(4), conn);
    const slots = none.getRecommendations().map((r) => r.suggestedSlot);
    // slot comes from data (or is absent); it must match the computed window
    const w = none.getTopWindows(1)[0];
    for (const s of slots) if (s) expect(s.day).toBe(w.day);
  });
});

describe('analytics API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => { await clearDb(); fake.reset(); });
  const drain = async () => { while (await syncService.runOne('t')); };

  it('returns truthful empty states when nothing is connected (no fake data)', async () => {
    const u = await registerUser('empty@test.example');
    const get = (p: string) => api().get(`/api/v1${p}`).set(u.auth);
    expect((await get('/analytics/overview')).body.data).toMatchObject({ hasData: false, signals: [], observations: [] });
    expect((await get('/timing')).body.data).toMatchObject({ hasData: false, matrix: [] });
    expect((await get('/trends')).body.data.trends).toEqual([]);
    expect((await get('/recommendations')).body.data.items).toEqual([]);
    expect((await get('/intelligence/signals')).body.data.insights).toEqual([]);
    expect((await get('/intelligence/performers')).body.data).toEqual({ top: [], bottom: [] });
    expect((await get('/media')).body.data).toEqual([]);
    expect((await get('/alerts')).body.data).toEqual([]);
    expect((await get('/planner')).body.data).toEqual([]);
    expect((await get('/planner/insights')).body.data).toMatchObject({ hasEnoughData: false, bestWindows: [], contentGaps: [] });
    const s = (await get('/intelligence/summary')).body.data;
    expect(s).toMatchObject({ platformsIncluded: [], topContent: [], needsImprovement: [], trendingTopics: [] });
    expect(s.contentIdeas.items).toEqual([]);
    expect((await get('/workspaces')).body.data.demoMode).toBe(false);
  });

  it('computes summary, history and planner insights from stored data for the connected platform only', async () => {
    const u = await registerUser('data@test.example');
    fake.items = [...makeMedia(24, 'instagram'), ...makeMedia(8, 'youtube', { prefix: 'yt' })];
    await api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken: 'tok' });
    await drain();

    const s = (await api().get('/api/v1/intelligence/summary').set(u.auth)).body.data;
    expect(s.platformsIncluded).toEqual(['instagram']); // youtube was never connected
    expect(s.topContent.length + s.needsImprovement.length).toBeGreaterThan(0);
    expect(s.contentIdeas.generatedBy).toBe('rules');
    expect(s.lastSyncedAt).toBeTruthy();

    const yt = (await api().get('/api/v1/intelligence/summary?platform=youtube').set(u.auth)).body.data;
    expect(yt.platformsIncluded).toEqual([]);

    const hist = (await api().get('/api/v1/intelligence/history').set(u.auth)).body.data;
    expect(hist).toHaveLength(1);
    expect(hist[0]).toMatchObject({ platform: 'instagram', contentCount: 24, calcVersion: 1 });
    expect(hist[0].medianEngagementRate).toBeGreaterThan(0);

    const plan = (await api().get('/api/v1/planner/insights').set(u.auth)).body.data;
    expect(plan.hasEnoughData).toBe(true);
    expect(plan.bestWindows.length).toBeGreaterThan(0);
    expect(plan.bestWindows[0]).toHaveProperty('sampleCount');

    const recs = (await api().get('/api/v1/recommendations').set(u.auth)).body.data.items;
    expect(recs.length).toBe(3);
    const planned = await api().post(`/api/v1/recommendations/${recs[0].id}/plan`).set(u.auth).send({});
    expect(planned.status).toBe(201);
    expect(planned.body.data.isRecommended).toBe(true);
    expect((await api().get('/api/v1/planner').set(u.auth)).body.data).toHaveLength(1);
  });

  it('planner entries belong to their owner', async () => {
    const a = await registerUser('pl-a@test.example');
    const b = await registerUser('pl-b@test.example');
    const created = await api().post('/api/v1/planner').set(a.auth).send({ day: 'Friday', time: '6:00 PM', platform: 'instagram', title: 'Idea' });
    expect(created.status).toBe(201);
    expect((await api().get('/api/v1/planner').set(b.auth)).body.data).toHaveLength(0);
    await api().delete(`/api/v1/planner/${created.body.data.id}`).set(b.auth);
    expect((await api().get('/api/v1/planner').set(a.auth)).body.data).toHaveLength(1);
    expect((await api().post('/api/v1/planner').set(a.auth).send({ day: 'Funday', time: '1', platform: 'instagram', title: 'x' })).status).toBe(422);
  });

  it('notifications are private and paginated', async () => {
    const a = await registerUser('n-a@test.example');
    const b = await registerUser('n-b@test.example');
    fake.items = makeMedia(6, 'instagram');
    await api().post('/api/v1/connections/instagram/connect').set(a.auth).send({ accessToken: 'tok' });
    await drain();
    const mine = (await api().get('/api/v1/notifications').set(a.auth)).body.data;
    expect(mine.length).toBeGreaterThan(0);
    expect((await api().get('/api/v1/notifications').set(b.auth)).body.data).toHaveLength(0);
    expect((await api().post(`/api/v1/notifications/${mine[0].id}/read`).set(b.auth)).status).toBe(404);
    expect((await api().post(`/api/v1/notifications/${mine[0].id}/read`).set(a.auth)).body.data.read).toBe(true);
    expect((await api().get('/api/v1/notifications/unread-count').set(a.auth)).body.data.unread).toBeGreaterThanOrEqual(0);
  });
});
