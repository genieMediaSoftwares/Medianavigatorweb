import type { ContentItemDoc } from '../../models/ContentItem.js';
import type { DeepOverview } from '../../../../shared/deepOverview.js';
/** Measured/calculated values from this one post. Missing is never zero. */
export function overviewMetrics(doc: ContentItemDoc): DeepOverview['metrics'] {
  const missing = new Set([...(doc.unavailableMetrics ?? []), ...(doc.normalized?.missingMetrics ?? [])]);
  const definitions = [ ['views', ['facebook', 'linkedin'].includes(doc.platform) ? 'Impressions' : 'Views', 'count'], ['reach', 'Accounts reached', 'count'], ['likes', 'Likes / reactions', 'count'], ['comments', 'Comments', 'count'], ['shares', 'Shares', 'count'], ['saves', 'Saves', 'count'], ['watchTimeMinutes', 'Watch time', 'minutes'], ['engagementRate', 'Engagement rate', 'percent'] ] as const;
  return { syncedAt: doc.syncedAt.toISOString(), items: definitions.flatMap(([key, label, unit]) => {
    const value = doc[key];
    if (missing.has(key) || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (key === 'reach' && doc.platform !== 'instagram')) return [];
    return [{ key, label, unit, value, basis: key === 'engagementRate' ? 'calculated' as const : 'measured' as const }];
  }) };
}
