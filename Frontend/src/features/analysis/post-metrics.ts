import type { MediaItem } from '@/types/api';

export const POST_METRICS = ['views', 'likes', 'comments', 'shares', 'reach', 'watchTimeMinutes', 'engagementRate'] as const;
export type PostMetric = (typeof POST_METRICS)[number];

/** Use the same per-post availability flags as the website, including legitimate measured zeros. */
export function postMetricValue(item: MediaItem, metric: PostMetric): number | null {
  if ((item.unavailableMetrics ?? []).includes(metric) || (item.missingMetrics ?? []).includes(metric)) return null;
  const value = item[metric];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function facebookMetricLimitations(item: MediaItem): string | undefined {
  if (item.platform !== 'facebook') return undefined;
  const names: Partial<Record<PostMetric, string>> = { views: 'views', likes: 'reactions', comments: 'comments', reach: 'reach' };
  const missing = POST_METRICS.filter((key) => names[key] && postMetricValue(item, key) === null).map((key) => names[key]);
  return missing.length ? `Facebook has not provided ${missing.join(', ')} for this post. N/A means unavailable, not zero.` : undefined;
}
