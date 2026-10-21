import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { colors } from '@/constants/colors';
import { formatCompactNumber, formatPercent } from '@/lib/format';
import type { BestTimes, EvidenceLevel, Platform, PlannerSlot, TimeWindowKey, Weekday } from '@/types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Evidence labels always pair text and an icon with the color, so meaning never depends on color alone. */
export const EVIDENCE: Record<EvidenceLevel, { label: string; icon: IconName; color: string; container: string; text: string; explain: string }> = {
  strong: {
    label: 'Strong evidence', icon: 'shield-checkmark', color: colors.success, container: 'bg-success-light border-success-border', text: 'text-success',
    explain: 'Many posts, consistently above your typical result, and unlikely to be chance.',
  },
  moderate: {
    label: 'Moderate evidence', icon: 'trending-up', color: colors.primary, container: 'bg-sky border-sky-border', text: 'text-primary',
    explain: 'A useful pattern, but there is still real uncertainty.',
  },
  limited: {
    label: 'Limited evidence', icon: 'alert-circle', color: colors.warning, container: 'bg-warning-light border-warning-border', text: 'text-warning',
    explain: 'Too few posts or too much variation for a reliable conclusion yet.',
  },
  insufficient: {
    label: 'Insufficient data', icon: 'help-circle', color: colors.neutral500, container: 'bg-neutral-50 border-neutral-200', text: 'text-neutral-500',
    explain: 'No defensible conclusion can be drawn from the posts available.',
  },
};

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  all: 'All formats', reel: 'Reels', short: 'Shorts', video: 'Videos', post: 'Posts', carousel: 'Carousels', article: 'Articles',
};

export const DAY_SHORT: Record<Weekday, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

/** Formats a raw metric value the way the platform reports it. */
export function formatMetric(value: number | null, unit: '%' | 'count'): string {
  if (value === null) return '—';
  return unit === '%' ? formatPercent(value, value < 10 ? 1 : 0) : formatCompactNumber(value);
}

export function metricOf(data: BestTimes) {
  return data.metrics.find((m) => m.key === data.metric) ?? data.metrics[0];
}

/** What a heatmap cell shows: the slot's median for one account; the relative score when accounts are combined. */
export function cellValue(slot: PlannerSlot, data: BestTimes): string {
  if (slot.posts === 0) return '—';
  if (data.analysis?.aggregate) return String(slot.score);
  return formatMetric(slot.median, metricOf(data).unit);
}

export function describeLift(liftPct: number | null): string | null {
  if (liftPct === null) return null;
  if (Math.abs(liftPct) < 1) return 'About the same as your typical post';
  return `${liftPct > 0 ? '+' : ''}${Math.round(liftPct)}% vs your typical post`;
}

/** One plain next step for a slot, derived from its numbers and evidence. */
export function suggestion(slot: PlannerSlot, minSlotPosts: number): string {
  if (slot.posts === 0) return 'No posts here yet. Try a post in this slot to learn how it performs.';
  if (slot.posts < minSlotPosts) return `Only ${slot.posts} post${slot.posts === 1 ? '' : 's'} so far. Post here a few more times before judging it.`;
  if (slot.evidence === 'limited') return 'The results here vary too much to call. Keep testing this slot.';
  if ((slot.score ?? 50) >= 58) return 'A good slot to keep using for important posts.';
  if ((slot.score ?? 50) <= 42) return 'Posts here tend to do worse than usual. Prefer a stronger slot for key posts.';
  return 'Performs about like your typical post.';
}

/**
 * The slot for a day and window. A response missing that cell yields an empty slot instead of crashing the grid.
 */
export function slotAt(data: BestTimes, day: Weekday, window: TimeWindowKey): PlannerSlot {
  return data.analysis?.slots.find((s) => s.day === day && s.window === window)
    ?? { day, window, posts: 0, mean: null, median: null, score: null, level: null, liftPct: null, shareAboveTypical: null, pValue: null, evidence: 'insufficient' };
}

/** Number of weekday × time-of-day slots in the grid (7 × the windows the server sends). */
export const slotCount = (data: BestTimes) => 7 * data.windows.length;

/** Horizontal centre (0–1) of hour `h`'s bar when 24 equal bars fill the width. */
export const hourCenter = (h: number) => (h + 0.5) / 24;

/** Same wording everywhere for "share of posts above expected". */
export const ABOVE_EXPECTED_LABEL = 'Posts above expected';

/**
 * Accounts in this result that are connected but missing the permissions that measure posts. Their posts can't be
 * compared, so "post more" would be the wrong advice.
 */
export function permissionGaps(data: BestTimes): { platform: Platform; name: string; missing: string[] }[] {
  const relevant = data.platform === 'all' ? data.accounts.filter((a) => a.connected) : data.accounts.filter((a) => a.platform === data.platform);
  return relevant.filter((a) => a.connected && (a.missingPermissions?.length ?? 0) > 0).map((a) => ({ platform: a.platform, name: a.name, missing: a.missingPermissions! }));
}

/** True when the result has no recommendation because the platform didn't measure the posts, not because there are few. */
export function blockedByPermissions(data: BestTimes): boolean {
  const a = data.analysis;
  return Boolean(a && !a.recommendation && permissionGaps(data).length > 0 && a.excluded.unmeasured > 0 && a.eligiblePosts < data.method.thresholds.minTotalPosts);
}

/** Time windows for one weekday that past posts support, strongest first. Only slots with enough posts are offered. */
export function windowsForDay(data: BestTimes, day: Weekday): { slot: PlannerSlot; label: string; range: string }[] {
  const a = data.analysis;
  if (!a || a.aggregate) return [];
  const min = data.method.thresholds.minSlotPosts;
  return data.windows
    .map((w) => ({ slot: slotAt(data, day, w.key), label: w.label, range: w.range }))
    .filter(({ slot }) => slot.posts >= min && slot.score !== null && slot.score > 50 && slot.evidence !== 'insufficient')
    .sort((x, y) => (y.slot.score ?? 0) - (x.slot.score ?? 0));
}

export const NO_RECOMMENDATION: Record<NonNullable<NonNullable<BestTimes['analysis']>['noRecommendationReason']>, (data: BestTimes) => { title: string; message: string }> = {
  not_enough_posts: (d) => ({
    title: 'Not enough posts yet',
    message: `A best time needs at least ${d.method.thresholds.minTotalPosts} posts with a measured ${metricOf(d).label.toLowerCase()} in this period. ${d.analysis?.eligiblePosts ?? 0} qualified. ${d.days < 90 ? 'Try the 90-day range, or k' : 'K'}eep posting and syncing.`,
  }),
  no_repeated_slot: (d) => ({
    title: 'No repeated time slot yet',
    message: `Your posts are spread across many times, and no slot has ${d.method.thresholds.minSlotPosts} or more posts. Posting a few times in the same slots will reveal a pattern.`,
  }),
  no_slot_above_typical: () => ({
    title: 'No time clearly stands out',
    message: 'None of your time slots beats your typical post. Timing doesn’t appear to be what drives your results, so content and format are better levers right now.',
  }),
};
