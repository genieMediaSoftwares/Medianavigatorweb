import { describe, expect, it } from 'vitest';

import { blockedByPermissions, hourCenter, permissionGaps, slotAt, slotCount, windowsForDay } from '@/features/planner/presentation';
import type { BestTimes, PlannerSlot } from '@/types/api';

const WINDOWS: BestTimes['windows'] = [
  { key: 'morning', label: 'Morning', range: '5:00 AM – 12:00 PM' },
  { key: 'afternoon', label: 'Afternoon', range: '12:00 PM – 5:00 PM' },
  { key: 'evening', label: 'Evening', range: '5:00 PM – 10:00 PM' },
  { key: 'night', label: 'Night', range: '10:00 PM – 5:00 AM' },
];

const slot = (over: Partial<PlannerSlot>): PlannerSlot => ({
  day: 'Monday', window: 'morning', posts: 0, score: null, mean: null, median: null, liftPct: null, shareAboveTypical: null, pValue: null, evidence: 'insufficient', level: null, ...over,
});

function data(over: Partial<BestTimes> = {}, analysis: Partial<NonNullable<BestTimes['analysis']>> = {}): BestTimes {
  return {
    platform: 'facebook', days: 90, range: { from: '', to: '' }, timezone: 'UTC', timezoneSource: 'profile',
    accounts: [{ platform: 'facebook', name: 'Facebook', connected: true, status: 'sync_complete', handle: 'Page', lastSyncedAt: null, syncState: 'synced', missingPermissions: [] }],
    scope: [], state: 'ready', metric: 'reach', metrics: [{ key: 'reach', label: 'Reach', unit: 'count', description: '' }], contentTypes: [], contentType: 'all',
    windows: WINDOWS, notes: [], method: { summary: '', thresholds: { minTotalPosts: 12, minSlotPosts: 3 }, maturityHours: { instagram: 48, facebook: 48, youtube: 72, linkedin: 48 } },
    analysis: {
      eligiblePosts: 0, aggregate: false, excluded: { unmeasured: 0, tooRecent: 0 }, baseline: { mean: null, median: null }, slots: [], hours: [], bestHours: null, formats: [],
      pattern: { mostUsed: null, slotsUsed: 0, untestedSlots: 28 }, adjustment: { period: true, format: true, peerWindowDays: 21 }, recommendation: null, evidence: 'insufficient',
      noRecommendationReason: 'not_enough_posts', ...analysis,
    },
    ...over,
  } as BestTimes;
}

describe('best-times presentation', () => {
  it('blames missing permissions, not too few posts, when the platform measured nothing (audit #1)', () => {
    const blocked = data({ accounts: [{ ...data().accounts[0], missingPermissions: ['read_insights', 'pages_read_user_content'] }] }, { excluded: { unmeasured: 399, tooRecent: 0 } });
    expect(blockedByPermissions(blocked)).toBe(true);
    expect(permissionGaps(blocked)[0]).toMatchObject({ name: 'Facebook', missing: ['read_insights', 'pages_read_user_content'] });
    // Same thin data without a permission gap: the honest answer is "not enough posts".
    expect(blockedByPermissions(data({}, { excluded: { unmeasured: 399, tooRecent: 0 } }))).toBe(false);
  });

  it('fills a missing heatmap cell instead of crashing (audit #15)', () => {
    const s = slotAt(data({}, { slots: [] }), 'Friday', 'evening');
    expect(s).toMatchObject({ day: 'Friday', window: 'evening', posts: 0, score: null, evidence: 'insufficient' });
    expect(slotAt(data({ analysis: null }), 'Monday', 'night').posts).toBe(0);
  });

  it('counts slots from the windows the server sends (audit #11) and centres hour labels (audit #9)', () => {
    expect(slotCount(data())).toBe(28);
    expect(slotCount(data({ windows: WINDOWS.slice(0, 3) }))).toBe(21);
    expect(hourCenter(0)).toBeCloseTo(1 / 48);
    expect(hourCenter(21)).toBeCloseTo(43 / 48);
  });

  it('suggests only supported, above-typical windows for the chosen weekday', () => {
    const d = data({}, {
      slots: [
        slot({ day: 'Tuesday', window: 'evening', posts: 6, score: 64, evidence: 'moderate' }),
        slot({ day: 'Tuesday', window: 'morning', posts: 5, score: 58, evidence: 'limited' }),
        slot({ day: 'Tuesday', window: 'afternoon', posts: 2, score: 80, evidence: 'limited' }), // too few posts
        slot({ day: 'Tuesday', window: 'night', posts: 9, score: 45, evidence: 'moderate' }), // below typical
      ],
    });
    expect(windowsForDay(d, 'Tuesday').map((w) => w.slot.window)).toEqual(['evening', 'morning']);
    expect(windowsForDay(d, 'Wednesday')).toEqual([]);
    expect(windowsForDay(data({}, { aggregate: true, slots: d.analysis!.slots }), 'Tuesday')).toEqual([]);
  });
});
