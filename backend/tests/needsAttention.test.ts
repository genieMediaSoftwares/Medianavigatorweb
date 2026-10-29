import { describe, expect, it } from 'vitest';
import type { NormalizedMedia, PlatformConnection, PlatformType } from '../../shared/types.js';
import { AnalyticsEngine, NEEDS_ATTENTION_MIN_AGE_HOURS } from '../src/services/analytics.engine.js';

const NOW = new Date('2026-10-20T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

type Spec = { id: string; reach?: number; views?: number; eng?: number; missing?: string[]; unavailable?: string[]; days?: number; likes?: number };
function post(platform: PlatformType, s: Spec): NormalizedMedia & { unavailableMetrics: string[] } {
  return {
    id: s.id, workspaceId: 'w', platform, platformContentId: s.id, contentType: 'post', title: s.id, caption: '',
    thumbnailUrl: '', publishedAt: daysAgo(s.days ?? 10),
    primarySignal: { label: '', value: '', status: 'Average' },
    views: s.views ?? 0, reach: s.reach ?? 0, engagementRate: s.eng ?? 2, shares: 0, likes: s.likes ?? 10, comments: 1,
    explanation: { observedFact: '', possibleReason: '', whatToRepeat: [] },
    missingMetrics: s.missing ?? [], unavailableMetrics: s.unavailable ?? [],
  } as NormalizedMedia & { unavailableMetrics: string[] };
}
const engineFor = (media: NormalizedMedia[], platforms: PlatformType[]) =>
  new AnalyticsEngine(media, platforms.map((platform) => ({ platform, connected: true }) as PlatformConnection));
const ids = (list: Array<{ mediaId: string }>) => list.map((p) => p.mediaId);

describe('Needs Attention', () => {
  it('Instagram: weakest reach first, zero reach leads, only posts below the usual, and unmeasured reach is not a zero', () => {
    const media = [
      post('instagram', { id: 'a', reach: 400, views: 900 }),
      post('instagram', { id: 'b', reach: 300, views: 0 }), // views 0 must not matter: Instagram is ranked by reach
      post('instagram', { id: 'c', reach: 0, views: 50 }), // measured zero reach: weakest of all
      post('instagram', { id: 'd', reach: 120, views: 700 }),
      post('instagram', { id: 'e', reach: 500, views: 1000 }),
      post('instagram', { id: 'f', reach: 350, views: 800 }),
      post('instagram', { id: 'g', reach: 0, missing: ['reach'] }), // not returned by Instagram: excluded
    ];
    const list = engineFor(media, ['instagram']).getNeedsAttention('instagram', NOW);
    // Median reach over a,b,c,d,e,f = (300 + 350) / 2 = 325.
    expect(ids(list)).toEqual(['c', 'd', 'b']);
    expect(list[0].baselineComparison).toBe('-100% reach vs your median (325)');
    expect(list[2].baselineComparison).toBe('-8% reach vs your median (325)');
    expect(ids(list)).not.toContain('g');
  });

  it('Facebook is ranked by reach; ties are broken by lower measured engagement', () => {
    const media = [
      post('facebook', { id: 'f1', reach: 100, eng: 4 }), post('facebook', { id: 'f2', reach: 100, eng: 1 }),
      post('facebook', { id: 'f3', reach: 900 }), post('facebook', { id: 'f4', reach: 800 }), post('facebook', { id: 'f5', reach: 700 }),
      post('facebook', { id: 'f6', reach: 100, missing: ['engagementRate'] }),
    ];
    const list = engineFor(media, ['facebook']).getNeedsAttention('facebook', NOW);
    expect(ids(list)).toEqual(['f2', 'f1', 'f6']); // unmeasured engagement sorts after measured
    expect(list.every((p) => /reach vs your median/.test(p.baselineComparison))).toBe(true);
  });

  it('YouTube has no reach, so it is ranked by views', () => {
    const yt = (id: string, views: number) => post('youtube', { id, views, reach: views, unavailable: ['reach', 'shares', 'saves'] });
    const media = [yt('y1', 5000), yt('y2', 40), yt('y3', 3000), yt('y4', 900), yt('y5', 7000)];
    const list = engineFor(media, ['youtube']).getNeedsAttention('youtube', NOW);
    expect(ids(list)).toEqual(['y2', 'y4']); // median 3000
    expect(list[0].baselineComparison).toBe('-99% views vs your median (3,000)');
  });

  it('LinkedIn is ranked by impressions and leaves out posts whose impressions were not returned', () => {
    // The LinkedIn client copies impressions into reach without flagging reach when impressions are missing.
    const li = (id: string, impressions: number, missing: string[] = []) => post('linkedin', { id, views: impressions, reach: impressions, missing });
    const media = [li('l1', 800), li('l2', 0, ['engagementRate', 'views']), li('l3', 200), li('l4', 1200), li('l5', 600), li('l6', 50)];
    const list = engineFor(media, ['linkedin']).getNeedsAttention('linkedin', NOW);
    expect(ids(list)).toEqual(['l6', 'l3']); // median of 50,200,600,800,1200 = 600; l2 is unknown, not "0"
    expect(list[0].baselineComparison).toMatch(/^-\d+% views vs your median \(600\)$/);
  });

  it('falls back to views on Instagram when reach was measured on too few posts', () => {
    const media = ['v1', 'v2', 'v3', 'v4', 'v5'].map((id, i) => post('instagram', { id, views: (i + 1) * 100, missing: i < 4 ? ['reach'] : [] }));
    const list = engineFor(media, ['instagram']).getNeedsAttention('instagram', NOW);
    expect(ids(list)).toEqual(['v1', 'v2']);
    expect(list[0].baselineComparison).toMatch(/views vs your median \(300\)/);
  });

  it('does not judge posts that are still collecting their first audience, nor accounts without enough history', () => {
    const fresh = post('instagram', { id: 'new', reach: 1, days: (NEEDS_ATTENTION_MIN_AGE_HOURS - 1) / 24 });
    const media = [fresh, ...[500, 600, 700, 800, 100].map((reach, i) => post('instagram', { id: `o${i}`, reach }))];
    expect(ids(engineFor(media, ['instagram']).getNeedsAttention('instagram', NOW))).toEqual(['o4', 'o0']);
    const few = [100, 200, 300, 400].map((reach, i) => post('instagram', { id: `x${i}`, reach }));
    expect(engineFor(few, ['instagram']).getNeedsAttention('instagram', NOW)).toEqual([]);
  });

  it('lists nothing when the usual is zero, so nothing is "below usual"', () => {
    const media = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'].map((id, i) => post('facebook', { id, reach: i < 4 ? 0 : 10 }));
    expect(engineFor(media, ['facebook']).getNeedsAttention('facebook', NOW)).toEqual([]);
  });

  it('across platforms, compares each with its own usual and orders by share of that usual', () => {
    const ig = [100, 1000, 1000, 1000, 1000].map((reach, i) => post('instagram', { id: `ig${i}`, reach })); // median 1000 → ig0 at 10%
    const yt = [500, 10_000, 10_000, 10_000, 10_000].map((views, i) => post('youtube', { id: `yt${i}`, views, unavailable: ['reach'] })); // yt0 at 5%
    const list = engineFor([...ig, ...yt], ['instagram', 'youtube']).getNeedsAttention(undefined, NOW);
    expect(ids(list)).toEqual(['yt0', 'ig0']); // 500 views is "more" than 100 reach, but further below its own usual
  });

  it('only includes connected platforms', () => {
    const media = [100, 900, 900, 900, 900].map((reach, i) => post('instagram', { id: `c${i}`, reach }));
    expect(engineFor(media, []).getNeedsAttention(undefined, NOW)).toEqual([]);
  });

  it('leaves Top Performing ranked by the selected metric', () => {
    const media = [
      post('instagram', { id: 't1', reach: 900, likes: 5 }), post('instagram', { id: 't2', reach: 100, likes: 90 }),
      post('instagram', { id: 't3', reach: 500, likes: 40 }), post('instagram', { id: 't4', reach: 300, likes: 10 }), post('instagram', { id: 't5', reach: 700, likes: 20 }),
    ];
    expect(engineFor(media, ['instagram']).getTopPerformers('likes', 'instagram')[0].mediaId).toBe('t2');
  });
});
