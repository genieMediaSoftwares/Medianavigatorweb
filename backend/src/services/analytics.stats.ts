import type { NormalizedMedia, PlatformType } from '../../../shared/types.js';

/**
 * Statistical conventions used by every analytics endpoint in this module:
 *  - "median": 50th percentile, robust to viral outliers. Used for "typical performance".
 *  - "mean": arithmetic mean. Only reported alongside the median, never instead of it.
 *  - "percentile": linear interpolation between closest ranks.
 * Bump CALC_VERSION whenever any formula below changes so cached/stored results can be invalidated.
 */
export const CALC_VERSION = 1;
export const MIN_HISTORY_FOR_CLASSIFICATION = 5;

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
export const median = (xs: number[]): number => percentile(xs, 0.5);
const round = (n: number, d = 2) => Number(n.toFixed(d));

export type PerformanceClass = 'TOP' | 'TYPICAL' | 'LOW' | 'INSUFFICIENT_DATA';

export interface Baseline {
  sampleSize: number;
  medianEngagementRate: number;
  p25EngagementRate: number;
  p75EngagementRate: number;
  medianViews: number;
  p25Views: number;
  p75Views: number;
}

export function baselineFor(items: Array<Pick<NormalizedMedia, 'engagementRate' | 'views'>>): Baseline {
  const eng = items.map((i) => i.engagementRate);
  const views = items.map((i) => i.views);
  return {
    sampleSize: items.length,
    medianEngagementRate: round(median(eng)),
    p25EngagementRate: round(percentile(eng, 0.25)),
    p75EngagementRate: round(percentile(eng, 0.75)),
    medianViews: Math.round(median(views)),
    p25Views: Math.round(percentile(views, 0.25)),
    p75Views: Math.round(percentile(views, 0.75)),
  };
}

/**
 * TOP     : engagement at/above the user's own 75th percentile AND at least 1.25x the user's median.
 * LOW     : engagement at/below the user's own 25th percentile AND at most 0.75x the user's median.
 * TYPICAL : everything else. INSUFFICIENT_DATA : fewer than MIN_HISTORY_FOR_CLASSIFICATION items to compare against.
 * The baseline is the user's own history on the same platform, so there are no global hardcoded thresholds.
 */
export function classify(item: Pick<NormalizedMedia, 'engagementRate'>, b: Baseline): PerformanceClass {
  if (b.sampleSize < MIN_HISTORY_FOR_CLASSIFICATION) return 'INSUFFICIENT_DATA';
  const e = item.engagementRate;
  if (e >= b.p75EngagementRate && e >= b.medianEngagementRate * 1.25 && e > 0) return 'TOP';
  if (e <= b.p25EngagementRate && e <= b.medianEngagementRate * 0.75) return 'LOW';
  return 'TYPICAL';
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const it of items) (out[key(it)] ||= []).push(it);
  return out;
}

export interface PeriodStats {
  from: string;
  to: string;
  count: number;
  medianEngagementRate: number;
  meanEngagementRate: number;
  medianViews: number;
  totalViews: number;
}

export function periodStats(items: NormalizedMedia[], from: Date, to: Date): PeriodStats {
  const inRange = items.filter((i) => {
    const t = new Date(i.publishedAt).getTime();
    return t >= from.getTime() && t < to.getTime();
  });
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    count: inRange.length,
    medianEngagementRate: round(median(inRange.map((i) => i.engagementRate))),
    meanEngagementRate: round(mean(inRange.map((i) => i.engagementRate))),
    medianViews: Math.round(median(inRange.map((i) => i.views))),
    totalViews: inRange.reduce((a, b) => a + b.views, 0),
  };
}

export const pctChange = (current: number, previous: number): number | null =>
  previous > 0 ? round(((current - previous) / previous) * 100, 1) : null;

export function extractTopics(caption: string): string[] {
  const tags = caption.match(/#[\p{L}\p{N}_]{2,40}/gu) ?? [];
  return [...new Set(tags.map((t) => t.toLowerCase()))].slice(0, 15);
}

export interface SummaryInput {
  media: NormalizedMedia[];
  connectedPlatforms: PlatformType[];
  platform?: PlatformType;
  days: number;
  now?: Date;
}

/** Cross-platform ("all") scope contains ONLY connected platforms; a platform scope contains ONLY that platform. */
export function buildSummary(input: SummaryInput) {
  const now = input.now ?? new Date();
  const scopePlatforms = input.platform ? (input.connectedPlatforms.includes(input.platform) ? [input.platform] : []) : input.connectedPlatforms;
  const media = input.media.filter((m) => scopePlatforms.includes(m.platform));

  const periodMs = input.days * 86_400_000;
  const current = periodStats(media, new Date(now.getTime() - periodMs), new Date(now.getTime() + 1));
  const previous = periodStats(media, new Date(now.getTime() - 2 * periodMs), new Date(now.getTime() - periodMs));

  const byPlatform = groupBy(media, (m) => m.platform);
  const baselines = Object.fromEntries(Object.entries(byPlatform).map(([p, items]) => [p, baselineFor(items as NormalizedMedia[])])) as Record<string, Baseline>;
  const classified = media.map((m) => ({ m, cls: classify(m, baselines[m.platform]) }));

  const slim = (m: NormalizedMedia, cls: PerformanceClass) => ({
    id: m.id, platform: m.platform, contentType: m.contentType, title: m.title, publishedAt: m.publishedAt,
    views: m.views, likes: m.likes, comments: m.comments, shares: m.shares, engagementRate: m.engagementRate,
    classification: cls,
    vsMedianEngagementPct: pctChange(m.engagementRate, baselines[m.platform].medianEngagementRate),
  });

  const byType = groupBy(media, (m) => `${m.platform}:${m.contentType}` as string);
  const contentTypePerformance = Object.entries(byType)
    .map(([k, items]) => {
      const [platform, contentType] = k.split(':');
      return {
        platform, contentType, count: items.length,
        medianEngagementRate: round(median(items.map((i) => i.engagementRate))),
        meanEngagementRate: round(mean(items.map((i) => i.engagementRate))),
        medianViews: Math.round(median(items.map((i) => i.views))),
      };
    })
    .sort((a, b) => b.medianEngagementRate - a.medianEngagementRate);

  // Topics (hashtags). Needs >= 3 posts per topic to be reported.
  const topicMap = new Map<string, NormalizedMedia[]>();
  for (const m of media) for (const t of extractTopics(m.caption || '')) (topicMap.get(t) ?? topicMap.set(t, []).get(t)!).push(m);
  const topicPerformance = [...topicMap.entries()]
    .filter(([, items]) => items.length >= 3)
    .map(([topic, items]) => {
      const recent = items.filter((i) => new Date(i.publishedAt).getTime() >= now.getTime() - periodMs);
      const earlier = items.filter((i) => new Date(i.publishedAt).getTime() < now.getTime() - periodMs);
      const recentMed = median(recent.map((i) => i.engagementRate));
      const earlierMed = median(earlier.map((i) => i.engagementRate));
      return {
        topic, count: items.length, recentCount: recent.length,
        medianEngagementRate: round(median(items.map((i) => i.engagementRate))),
        trend: recent.length >= 2 && earlier.length >= 2 ? pctChange(recentMed, earlierMed) : null,
      };
    })
    .sort((a, b) => b.medianEngagementRate - a.medianEngagementRate)
    .slice(0, 20);

  const trendingTopics = topicPerformance.filter((t) => t.trend !== null && t.trend > 0).sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0)).slice(0, 10);

  const top = classified.filter((c) => c.cls === 'TOP').sort((a, b) => b.m.engagementRate - a.m.engagementRate).slice(0, 10).map((c) => slim(c.m, c.cls));
  const low = classified.filter((c) => c.cls === 'LOW').sort((a, b) => a.m.engagementRate - b.m.engagementRate).slice(0, 10).map((c) => slim(c.m, c.cls));

  return {
    calcVersion: CALC_VERSION,
    scope: input.platform ?? 'all',
    platformsIncluded: scopePlatforms.filter((p) => byPlatform[p]?.length),
    platformsConnectedWithoutData: scopePlatforms.filter((p) => !byPlatform[p]?.length),
    dataPeriod: { days: input.days, current, previous },
    periodComparison: {
      engagementRateMedianChangePct: pctChange(current.medianEngagementRate, previous.medianEngagementRate),
      viewsMedianChangePct: pctChange(current.medianViews, previous.medianViews),
      comparable: current.count >= 3 && previous.count >= 3,
    },
    baselines,
    classificationMethod: 'User-relative: TOP >= own P75 and >= 1.25x own median; LOW <= own P25 and <= 0.75x own median; baseline = same platform history (min 5 posts).',
    contentTypePerformance,
    topicPerformance,
    trendingTopics,
    topContent: top,
    needsImprovement: low,
    insufficientHistory: Object.entries(baselines).filter(([, b]) => b.sampleSize < MIN_HISTORY_FOR_CLASSIFICATION).map(([p]) => p),
  };
}

/** Deterministic, data-backed content ideas. These are rules, NOT AI output, and are labelled as such. */
export function buildContentIdeas(summary: ReturnType<typeof buildSummary>, bestWindow: { dayFull: string; timeSlot: string; timezone: string } | null) {
  const ideas: Array<{ source: 'rules'; idea: string; basedOn: string }> = [];
  const bestType = summary.contentTypePerformance.find((c) => c.count >= 3);
  const bestTopic = summary.topicPerformance[0];
  if (bestType && bestTopic) {
    ideas.push({
      source: 'rules',
      idea: `Publish another ${bestType.contentType} on ${bestType.platform} about ${bestTopic.topic}.`,
      basedOn: `${bestType.contentType} has the highest median engagement (${bestType.medianEngagementRate}%, n=${bestType.count}); ${bestTopic.topic} has median ${bestTopic.medianEngagementRate}% (n=${bestTopic.count}).`,
    });
  } else if (bestType) {
    ideas.push({ source: 'rules', idea: `Lean into ${bestType.contentType} on ${bestType.platform}.`, basedOn: `Highest median engagement among your formats (${bestType.medianEngagementRate}%, n=${bestType.count}).` });
  }
  for (const t of summary.trendingTopics.slice(0, 3)) {
    ideas.push({ source: 'rules', idea: `Revisit ${t.topic} while it is rising.`, basedOn: `Median engagement on ${t.topic} changed ${t.trend}% versus the earlier period (n=${t.count}).` });
  }
  if (bestWindow) {
    ideas.push({ source: 'rules', idea: `Schedule your next post for ${bestWindow.dayFull}, ${bestWindow.timeSlot} (${bestWindow.timezone}).`, basedOn: 'Strongest historical window by mean engagement.' });
  }
  const gapPlatforms = summary.platformsConnectedWithoutData;
  if (gapPlatforms.length) ideas.push({ source: 'rules', idea: `No content has been synced for ${gapPlatforms.join(', ')}.`, basedOn: 'Connected platforms without synced posts.' });
  return ideas;
}
