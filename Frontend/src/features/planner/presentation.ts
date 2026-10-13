import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { colors } from '@/constants/colors';
import { formatCompactNumber, formatPercent } from '@/lib/format';
import type { BestTimes, EvidenceLevel, PlannerSlot, Weekday } from '@/types/api';

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

const WEEK_INDEX: Record<Weekday, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };

/** Next calendar date (today counts) that falls on `day` in `timezone`, e.g. "Mon, 20 Oct". */
export function nextDateFor(day: Weekday, timezone: string, now = new Date()): string {
  const todayName = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now) as Weekday;
  const ahead = (WEEK_INDEX[day] - WEEK_INDEX[todayName] + 7) % 7;
  const target = new Date(now.getTime() + ahead * 86_400_000);
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short' }).format(target);
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
