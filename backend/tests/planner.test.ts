import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake } from './fakes.js';
import { computeBestTimes, mannWhitneyP, percentileRanks, slotOf, PLANNER_THRESHOLDS, type PlannerPost } from '../src/services/planner/bestTimes.js';
import type { NormalizedMedia } from '../../shared/types.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});
import { syncService } from '../src/services/sync.service.js';

// Deterministic pseudo-random numbers so "known datasets" stay known.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

// 2026-06-01 is a Monday. All unit-test timestamps are UTC and analysed in UTC unless stated.
const NOW = new Date('2026-09-30T00:00:00Z');
const at = (dayOffset: number, hour: number, minute = 0) => new Date(Date.UTC(2026, 5, 1 + dayOffset, hour, minute));
const post = (date: Date, value: number | undefined, accountId = 'a', platform: PlannerPost['platform'] = 'instagram'): PlannerPost =>
  ({ accountId, platform, publishedAt: date, contentType: 'post', values: value === undefined ? {} : { engagementRate: value } });

/** `weeks` weeks of posts at fixed (weekday, hour) spots; `valueFor` decides each post's engagement. */
function dataset(weeks: number, spots: Array<[number, number]>, valueFor: (day: number, hour: number, r: () => number) => number, seed = 1) {
  const r = rng(seed);
  const out: PlannerPost[] = [];
  for (let w = 0; w < weeks; w++) for (const [d, h] of spots) out.push(post(at(w * 7 + d, h), valueFor(d, h, r)));
  return out;
}

describe('slot assignment', () => {
  it('puts early-morning hours in the previous evening’s Night slot', () => {
    expect(slotOf(at(1, 1), 'UTC')).toMatchObject({ dayIndex: 0, window: 'night' }); // 1 AM Tuesday → Monday night
    expect(slotOf(at(0, 22), 'UTC')).toMatchObject({ dayIndex: 0, window: 'night' });
    expect(slotOf(at(0, 1), 'UTC')).toMatchObject({ dayIndex: 6, window: 'night' }); // 1 AM Monday → Sunday night
    expect(slotOf(at(0, 6), 'UTC')).toMatchObject({ dayIndex: 0, window: 'morning' });
    expect(slotOf(at(0, 17), 'UTC')).toMatchObject({ dayIndex: 0, window: 'evening' });
  });

  it('converts to the account timezone, including across midnight', () => {
    // 20:00 UTC Monday = 01:30 Tuesday in Kolkata → Monday night there.
    expect(slotOf(at(0, 20), 'Asia/Kolkata')).toMatchObject({ dayIndex: 0, window: 'night', hour: 1 });
    // 08:00 UTC Monday = 13:30 Monday in Kolkata → afternoon.
    expect(slotOf(at(0, 8), 'Asia/Kolkata')).toMatchObject({ dayIndex: 0, window: 'afternoon' });
  });

  it('follows daylight-saving changes instead of a fixed offset', () => {
    // US DST starts 2026-03-08. 16:30 UTC is 11:30 EST the day before, but 12:30 EDT on the day.
    expect(slotOf(new Date('2026-03-07T16:30:00Z'), 'America/New_York')).toMatchObject({ window: 'morning', hour: 11 });
    expect(slotOf(new Date('2026-03-08T16:30:00Z'), 'America/New_York')).toMatchObject({ window: 'afternoon', hour: 12 });
    // DST ends 2026-11-01: 16:30 UTC is 12:30 EDT on Oct 31 but 11:30 EST on Nov 1.
    expect(slotOf(new Date('2026-10-31T16:30:00Z'), 'America/New_York')).toMatchObject({ window: 'afternoon' });
    expect(slotOf(new Date('2026-11-01T16:30:00Z'), 'America/New_York')).toMatchObject({ window: 'morning' });
  });
});

describe('statistics', () => {
  it('ranks with midranks for ties', () => {
    expect(percentileRanks([10, 20, 20, 40])).toEqual([0, 0.5, 0.5, 1]);
    expect(percentileRanks([5])).toEqual([0.5]);
  });

  it('Mann–Whitney separates different groups and not identical ones', () => {
    expect(mannWhitneyP([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])!).toBeGreaterThan(0.9);
    expect(mannWhitneyP([10, 11, 12, 13, 14, 15, 16, 17], [1, 2, 3, 4, 5, 6, 7, 8, 9])!).toBeLessThan(0.01);
    expect(mannWhitneyP([], [1])).toBeNull();
  });
});

describe('best-time engine', () => {
  const spots: Array<[number, number]> = [[0, 13], [1, 9], [2, 18], [3, 13], [4, 9], [5, 18]];

  it('finds a consistently stronger slot and labels it strong', () => {
    // Monday 1 PM posts sit around 6%; everything else around 2%, with noise.
    const posts = dataset(10, spots, (d, h, r) => (d === 0 && h === 13 ? 6 : 2) + r());
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res.eligiblePosts).toBe(60);
    expect(res.recommendation).toMatchObject({ day: 'Monday', window: 'afternoon', timeRange: '12:00 PM – 5:00 PM', posts: 10, evidence: 'strong', preliminary: false });
    expect(res.recommendation!.liftPct!).toBeGreaterThan(100);
    // every Monday post went out at 1 PM, so the block starts there (2 hours wide, never a single minute)
    expect(res.recommendation!.narrowRange).toBe('1:00 PM – 3:00 PM');
    const monAft = res.slots.find((s) => s.day === 'Monday' && s.window === 'afternoon')!;
    expect(monAft.level).toBe(4);
    expect(res.slots).toHaveLength(28);
    expect(res.slots.find((s) => s.day === 'Sunday' && s.window === 'morning')).toMatchObject({ posts: 0, score: null, evidence: 'insufficient' });
  });

  it('does not crown a slot because of one viral post', () => {
    const posts = dataset(6, spots, (_d, _h, r) => 2 + r(), 7);
    posts.push(post(at(6, 8), 95)); // a single Sunday-morning outlier
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    const sunday = res.slots.find((s) => s.day === 'Sunday' && s.window === 'morning')!;
    expect(sunday.posts).toBe(1);
    expect(sunday.evidence).toBe('limited');
    expect(sunday.score!).toBeLessThanOrEqual(63); // shrunk toward typical: (1 + 3×0.5)/4
    expect(res.recommendation?.day === 'Sunday' && res.recommendation.window === 'morning').toBe(false);
  });

  it('marks a weak pattern as preliminary instead of strong', () => {
    // Only 12 posts: enough to try, too few to be sure.
    const posts = dataset(2, spots, (d, h, r) => (d === 0 && h === 13 ? 3 : 2) + r() * 2, 3);
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res.eligiblePosts).toBe(12);
    if (res.recommendation) {
      expect(res.recommendation.evidence).toBe('limited');
      expect(res.recommendation.preliminary).toBe(true);
      expect(res.recommendation.narrowRange).toBeNull();
    } else {
      expect(res.noRecommendationReason).toBe('no_repeated_slot');
    }
  });

  it('refuses to recommend with too few posts but still reports what it saw', () => {
    const posts = dataset(1, spots, () => 2);
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res).toMatchObject({ recommendation: null, evidence: 'insufficient', noRecommendationReason: 'not_enough_posts', eligiblePosts: 6 });
    expect(res.slots.filter((s) => s.posts > 0)).toHaveLength(6);
  });

  it('makes no recommendation when no slot beats typical', () => {
    const posts = dataset(5, spots, () => 3);
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res.recommendation).toBeNull();
    expect(res.noRecommendationReason).toBe('no_slot_above_typical');
    expect(res.slots.filter((s) => s.posts > 0).every((s) => s.score === 50)).toBe(true);
  });

  it('skips unmeasured metrics and posts that are too new, instead of counting them as zero', () => {
    const posts = [
      ...dataset(3, spots, () => 2),
      post(at(0, 13), undefined),
      post(new Date(NOW.getTime() - 3_600_000), 9), // 1 hour old
    ];
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res.excluded).toEqual({ unmeasured: 1, tooRecent: 1 });
    expect(res.eligiblePosts).toBe(18);
    expect(PLANNER_THRESHOLDS.maturityHours.youtube).toBeGreaterThan(PLANNER_THRESHOLDS.maturityHours.instagram);
  });

  it('handles an empty history', () => {
    const res = computeBestTimes([], { metric: 'views', timezone: 'UTC', now: NOW });
    expect(res).toMatchObject({ eligiblePosts: 0, recommendation: null, evidence: 'insufficient', baseline: { mean: null, median: null } });
    expect(res.slots.every((s) => s.posts === 0 && s.level === null)).toBe(true);
  });

  it('combines accounts by rank, so a big account cannot drown out a small one', () => {
    // Account A (large numbers) is strongest on Monday afternoon; account B (tiny numbers) agrees.
    const a = dataset(5, spots, (d, h, r) => (d === 0 && h === 13 ? 9000 : 1000) + r() * 100, 11).map((p) => ({ ...p, accountId: 'A', values: { views: p.values.engagementRate! } }));
    const b = dataset(5, spots, (d, h, r) => (d === 0 && h === 13 ? 9 : 1) + r(), 12).map((p) => ({ ...p, accountId: 'B', values: { views: p.values.engagementRate! } }));
    const res = computeBestTimes([...a, ...b], { metric: 'views', timezone: 'UTC', now: NOW });
    expect(res.aggregate).toBe(true);
    expect(res.recommendation).toMatchObject({ day: 'Monday', window: 'afternoon' });
    // raw averages across different accounts would mislead, so they are not reported
    expect(res.recommendation!.mean).toBeNull();
    expect(res.baseline.mean).toBeNull();
  });
});

describe('reach accuracy', () => {
  const spots: Array<[number, number]> = [[0, 13], [1, 9], [2, 18], [3, 13], [4, 9], [5, 18]];
  const reachPost = (date: Date, reach: number, contentType = 'post'): PlannerPost => ({ accountId: 'a', platform: 'instagram', publishedAt: date, contentType, values: { reach } });

  it('is not fooled by follower growth', () => {
    // Reach grows 10% a week for everyone. The account only started posting on Saturdays recently, so Saturday
    // posts look big in raw numbers purely because of growth. Timing itself makes no difference.
    const r = rng(5);
    const posts: PlannerPost[] = [];
    for (let w = 0; w < 12; w++) {
      const growth = 1000 * 1.1 ** w;
      for (const [d, h] of spots.slice(0, 5)) posts.push(reachPost(at(w * 7 + d, h), growth * (0.9 + r() * 0.2)));
      if (w >= 8) posts.push(reachPost(at(w * 7 + 5, 18), growth * (0.9 + r() * 0.2)));
    }
    const res = computeBestTimes(posts, { metric: 'reach', timezone: 'UTC', now: NOW });
    const sat = res.slots.find((s) => s.day === 'Saturday' && s.window === 'evening')!;
    // Raw median is far above the account's, but after comparing with same-period posts it is ordinary.
    expect(sat.liftPct!).toBeGreaterThan(30);
    expect(sat.score!).toBeLessThan(62);
    expect(res.recommendation === null || res.recommendation.day !== 'Saturday').toBe(true);
  });

  it('is not fooled by format: Reels on Fridays don’t make Friday the best time', () => {
    // Reels always get 5× the reach. They were all posted on Fridays. Within each format, timing doesn't matter.
    const r = rng(9);
    const posts: PlannerPost[] = [];
    for (let w = 0; w < 10; w++) {
      for (const [d, h] of spots) {
        const reel = d === 4;
        posts.push(reachPost(at(w * 7 + d, h), (reel ? 5000 : 1000) * (0.9 + r() * 0.2), reel ? 'reel' : 'post'));
      }
    }
    const res = computeBestTimes(posts, { metric: 'reach', timezone: 'UTC', now: NOW });
    const fri = res.slots.find((s) => s.day === 'Friday' && s.window === 'morning')!;
    expect(fri.score!).toBeLessThan(62);
    // Timing makes no difference here, so no slot should be recommended at all.
    expect(res.recommendation).toBeNull();
    expect(res.noRecommendationReason).toBe('no_slot_above_typical');
    // The format comparison still shows that Reels reach more people on this account.
    expect(res.formats[0]).toMatchObject({ type: 'reel' });
    expect(res.formats[0].liftPct!).toBeGreaterThan(100);
  });

  it('still finds a real timing effect once growth and format are accounted for', () => {
    const r = rng(13);
    const posts: PlannerPost[] = [];
    for (let w = 0; w < 10; w++) {
      const growth = 1000 * 1.05 ** w;
      for (const [d, h] of spots) posts.push(reachPost(at(w * 7 + d, h), growth * (d === 2 ? 1.8 : 1) * (0.9 + r() * 0.2)));
    }
    const res = computeBestTimes(posts, { metric: 'reach', timezone: 'UTC', now: NOW });
    expect(res.recommendation).toMatchObject({ day: 'Wednesday', window: 'evening', evidence: 'strong' });
    expect(res.adjustment).toEqual({ period: true, format: true, peerWindowDays: 21 });
  });

  it('narrows to the best 2-hour block only when the slot’s own posts support it', () => {
    // Wednesday evenings: 7 PM posts do much better than 5 PM posts.
    const r = rng(17);
    const posts: PlannerPost[] = [];
    for (let w = 0; w < 10; w++) {
      for (const [d, h] of spots.filter(([d]) => d !== 2)) posts.push(reachPost(at(w * 7 + d, h), 1000 * (0.9 + r() * 0.2)));
      posts.push(reachPost(at(w * 7 + 2, 17), 1300 * (0.9 + r() * 0.2)));
      posts.push(reachPost(at(w * 7 + 2, 19), 2500 * (0.9 + r() * 0.2)));
    }
    const res = computeBestTimes(posts, { metric: 'reach', timezone: 'UTC', now: NOW });
    expect(res.recommendation).toMatchObject({ day: 'Wednesday', window: 'evening' });
    expect(res.recommendation!.narrowRange).toBe('7:00 PM – 9:00 PM');
    expect(res.recommendation!.narrowStartTime).toBe('7:00 PM');
    // the all-days hour profile agrees
    expect(res.bestHours).toMatchObject({ startTime: '7:00 PM' });
    expect(res.hours).toHaveLength(24);
    expect(res.hours[3]).toEqual({ hour: 3, posts: 0, score: null });
  });

  it('reports the posting pattern', () => {
    const posts = dataset(4, spots, (_d, _h, r) => 2 + r());
    posts.push(post(at(0, 13), 2), post(at(7, 13), 2));
    const res = computeBestTimes(posts, { metric: 'engagementRate', timezone: 'UTC', now: NOW });
    expect(res.pattern).toEqual({ mostUsed: expect.objectContaining({ day: 'Monday', window: 'afternoon', posts: 6 }), slotsUsed: 6, untestedSlots: 22 });
  });
});

describe('planner API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => { await clearDb(); fake.reset(); });
  const drain = async () => { while (await syncService.runOne('t')); };

  /** Posts on a fixed weekly pattern in the past `weeks` weeks; Monday 13:00 UTC posts are stronger. */
  function history(weeks: number, platform: NormalizedMedia['platform'], prefix: string): NormalizedMedia[] {
    const out: NormalizedMedia[] = [];
    const today = new Date();
    const lastMonday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - ((today.getUTCDay() + 6) % 7) - 7));
    let i = 0;
    for (let w = 0; w < weeks; w++) {
      for (const [d, h] of [[0, 13], [2, 9], [4, 18]] as const) {
        const date = new Date(lastMonday.getTime() - w * 7 * 86_400_000 + d * 86_400_000 + h * 3_600_000);
        const eng = d === 0 ? 6 + (i % 3) * 0.1 : 2 + (i % 5) * 0.1;
        i++;
        out.push({
          id: `${prefix}_${i}`, workspaceId: 'x', platform, platformContentId: `${prefix}${i}`, contentType: 'post', title: `P${i}`, caption: '',
          thumbnailUrl: '', publishedAt: date.toISOString(), primarySignal: { label: '', value: '', status: 'Average' },
          views: 1000 + i, reach: 900 + i, engagementRate: eng, shares: 0, likes: 10, comments: 1,
          explanation: { observedFact: '', possibleReason: '', whatToRepeat: [] },
        } as NormalizedMedia);
      }
    }
    return out;
  }

  it('requires authentication and validates the query', async () => {
    expect((await api().get('/api/v1/planner/best-times?platform=instagram')).status).toBe(401);
    const u = await registerUser('v@test.example');
    expect((await api().get('/api/v1/planner/best-times').set(u.auth)).status).toBe(422);
    expect((await api().get('/api/v1/planner/best-times?platform=instagram&days=45').set(u.auth)).status).toBe(422);
    expect((await api().get('/api/v1/planner/best-times?platform=tiktok').set(u.auth)).status).toBe(422);
  });

  it('reports a not-connected platform honestly, with no analysis', async () => {
    const u = await registerUser('none@test.example');
    const res = (await api().get('/api/v1/planner/best-times?platform=instagram').set(u.auth)).body.data;
    expect(res).toMatchObject({ state: 'not_connected', analysis: null, timezone: 'UTC', timezoneSource: 'default', days: 90 });
    expect(res.accounts.map((a: any) => a.platform)).toEqual(['instagram', 'facebook', 'youtube', 'linkedin']);
    expect(res.accounts.every((a: any) => a.connected === false)).toBe(true);
  });

  it('analyses one platform’s own posts and never mixes in another platform or user', async () => {
    const owner = await registerUser('owner@test.example');
    fake.items = [...history(8, 'instagram', 'ig'), ...history(8, 'facebook', 'fb')];
    await api().post('/api/v1/connections/instagram/connect').set(owner.auth).send({ accessToken: 'tok' });
    await drain();

    // Reach is the default goal; this dataset's Monday advantage is in engagement rate, so ask for that.
    const byDefault = (await api().get('/api/v1/planner/best-times?platform=instagram').set(owner.auth)).body.data;
    expect(byDefault.metric).toBe('reach');
    expect(byDefault.postsPerWeek).toBeGreaterThan(0);
    const ig = (await api().get('/api/v1/planner/best-times?platform=instagram&metric=engagementRate').set(owner.auth)).body.data;
    expect(ig.state).toBe('ready');
    expect(ig.scope).toEqual([{ platform: 'instagram', handle: '@instagram_acct-1' }]);
    expect(ig.analysis.eligiblePosts).toBe(24);
    expect(ig.analysis.recommendation).toMatchObject({ day: 'Monday', window: 'afternoon' });
    expect(ig.metrics.map((m: any) => m.key)).toEqual(['engagementRate', 'reach', 'views']);

    // Facebook items exist in the provider but Facebook was never connected: nothing leaks in.
    expect((await api().get('/api/v1/planner/best-times?platform=facebook').set(owner.auth)).body.data).toMatchObject({ state: 'not_connected', analysis: null });

    // Another user sees none of the owner's data.
    const other = await registerUser('other@test.example');
    expect((await api().get('/api/v1/planner/best-times?platform=instagram').set(other.auth)).body.data).toMatchObject({ state: 'not_connected', analysis: null });
    expect((await api().get('/api/v1/planner/best-times?platform=all').set(other.auth)).body.data.analysis).toBeNull();
  });

  it('only offers metrics the platform really measures', async () => {
    const u = await registerUser('yt@test.example');
    fake.items = history(4, 'youtube', 'yt');
    await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ apiKey: 'key', channelQuery: '@x' });
    await drain();
    const yt = (await api().get('/api/v1/planner/best-times?platform=youtube&days=60').set(u.auth));
    expect(yt.status).toBe(200);
    expect(yt.body.data.metrics.map((m: any) => m.key)).toEqual(['engagementRate', 'views']);
    expect((await api().get('/api/v1/planner/best-times?platform=youtube&metric=reach').set(u.auth)).status).toBe(422);
  });

  it('switching the range or metric recomputes from the stored posts', async () => {
    const u = await registerUser('range@test.example');
    fake.items = history(12, 'instagram', 'ig');
    await api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken: 'tok' });
    await drain();
    const d30 = (await api().get('/api/v1/planner/best-times?platform=instagram&days=30').set(u.auth)).body.data;
    const d90 = (await api().get('/api/v1/planner/best-times?platform=instagram&days=90').set(u.auth)).body.data;
    expect(d30.analysis.eligiblePosts).toBeLessThan(d90.analysis.eligiblePosts);
    const views = (await api().get('/api/v1/planner/best-times?platform=instagram&metric=views').set(u.auth)).body.data;
    expect(views.analysis.metric).toBe('views');
  });

  it('stores planned posts as plans, never as scheduled', async () => {
    const u = await registerUser('plan@test.example');
    const created = await api().post('/api/v1/planner').set(u.auth).send({ day: 'Monday', time: '1:00 PM', platform: 'instagram', title: 'Launch' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('planned');
  });
});
