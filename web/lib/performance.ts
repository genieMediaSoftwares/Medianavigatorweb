import type { MediaItem, Platform, Summary } from '@/types/api';
import type { Tone } from '@/components/ui/badge';

export type PostTag = 'doing-well' | 'typical' | 'could-be-better' | 'not-enough-data';

export const TAG_LABEL: Record<PostTag, string> = {
  'doing-well': 'Doing well',
  typical: 'Typical',
  'could-be-better': 'Could be better',
  'not-enough-data': 'Not enough data yet',
};
export const TAG_TONE: Record<PostTag, Tone> = { 'doing-well': 'good', typical: 'neutral', 'could-be-better': 'warn', 'not-enough-data': 'neutral' };

/**
 * Plain-language tag for one post. The API ranks the best and weakest posts against the person's own history and lists
 * channels with too little history; everything else is "typical". Without a summary we say we don't know yet.
 */
export function tagFor(post: { id: string; platform: Platform }, summary: Summary | undefined): PostTag {
  if (!summary) return 'not-enough-data';
  if (summary.insufficientHistory.includes(post.platform)) return 'not-enough-data';
  if (summary.topContent.some((p) => p.id === post.id)) return 'doing-well';
  if (summary.needsImprovement.some((p) => p.id === post.id)) return 'could-be-better';
  return 'typical';
}

type Metric = 'views' | 'likes' | 'comments' | 'reach' | 'shares';
/** True when the platform did not give us this number for this post, so it must read "N/A", never 0. */
export function isUnavailable(item: Pick<MediaItem, 'unavailableMetrics' | 'missingMetrics'>, metric: Metric): boolean {
  return item.unavailableMetrics.includes(metric) || (item.missingMetrics ?? []).includes(metric);
}
