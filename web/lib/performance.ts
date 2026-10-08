import type { Baseline, Classification } from '@/types/api';

/** Same minimum the API uses before it classifies anything (MIN_HISTORY_FOR_CLASSIFICATION). */
export const MIN_HISTORY = 5;

/**
 * Labels a post against the user's own history on the same platform, using the baseline the API returned in
 * /intelligence/summary and the rule the API documents in `classificationMethod`:
 * TOP: at or above your 75th percentile and at least 1.25× your typical (median) engagement.
 * LOW: at or below your 25th percentile and at most 0.75× your typical engagement.
 * Fewer than MIN_HISTORY posts: not enough data. Everything else: typical.
 */
export function classify(engagementRate: number, baseline: Baseline | undefined): Classification {
  if (!baseline || baseline.sampleSize < MIN_HISTORY) return 'INSUFFICIENT_DATA';
  const e = engagementRate;
  if (e >= baseline.p75EngagementRate && e >= baseline.medianEngagementRate * 1.25 && e > 0) return 'TOP';
  if (e <= baseline.p25EngagementRate && e <= baseline.medianEngagementRate * 0.75) return 'LOW';
  return 'TYPICAL';
}
