import type { PlatformType } from '../../../../shared/types.js';
import { AppError } from '../../lib/errors.js';
import { toObjectId } from '../../lib/ids.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { profileRepository } from '../../repositories/profile.repository.js';
import { toPlatformConnections } from '../connection.view.js';
import {
  PLANNER_THRESHOLDS, TIME_WINDOWS, computeBestTimes, windowRange,
  type PlannerMetric, type PlannerPlatform, type PlannerPost,
} from './bestTimes.js';

export interface MetricDefinition {
  key: PlannerMetric;
  label: string;
  unit: '%' | 'count';
  description: string;
}

/**
 * What each platform genuinely measures, in the words that platform uses. A metric is only offered where the stored
 * data really is that metric (e.g. Facebook "reach" is stored as engaged users, so it is not offered as reach).
 */
const METRICS: Record<PlannerPlatform | 'all', MetricDefinition[]> = {
  instagram: [
    { key: 'engagementRate', label: 'Engagement rate', unit: '%', description: 'Likes, comments, shares and saves ÷ reach (or ÷ views when reach wasn’t measured).' },
    { key: 'reach', label: 'Reach', unit: 'count', description: 'Accounts that saw the post, from Instagram insights.' },
    { key: 'views', label: 'Views', unit: 'count', description: 'Views from Instagram insights.' },
  ],
  facebook: [
    { key: 'engagementRate', label: 'Engagement rate', unit: '%', description: 'Reactions, comments and shares ÷ post impressions from Page insights.' },
    { key: 'views', label: 'Impressions', unit: 'count', description: 'Post impressions from Page insights.' },
  ],
  youtube: [
    { key: 'engagementRate', label: 'Engagement rate', unit: '%', description: 'Likes and comments ÷ views.' },
    { key: 'views', label: 'Views', unit: 'count', description: 'Lifetime views. Older videos have had longer to collect them.' },
  ],
  linkedin: [
    { key: 'engagementRate', label: 'Engagement rate', unit: '%', description: 'Reactions, comments, reposts and clicks ÷ impressions.' },
    { key: 'views', label: 'Impressions', unit: 'count', description: 'Impressions reported by LinkedIn.' },
  ],
  all: [
    { key: 'reach', label: 'Reach', unit: 'count', description: 'Instagram reach, YouTube views, and Facebook and LinkedIn impressions. Each post is compared only with its own account.' },
    { key: 'engagementRate', label: 'Engagement rate', unit: '%', description: 'Each post is ranked against its own account, so platforms with different definitions can be combined.' },
  ],
};

/** "How many people saw it" first: the planner optimises for reach unless that isn't measured well enough. */
const REACH_PRIORITY: Record<PlannerPlatform | 'all', PlannerMetric[]> = {
  instagram: ['reach', 'views', 'engagementRate'],
  facebook: ['views', 'engagementRate'],
  youtube: ['views', 'engagementRate'],
  linkedin: ['views', 'engagementRate'],
  all: ['reach', 'engagementRate'],
};

/** What the data cannot tell, per platform. Shown to the user next to the results. */
const NOTES: Record<PlannerPlatform | 'all', string[]> = {
  instagram: [
    'Stories and Live aren’t included: the permissions used don’t return them.',
    'Based on how your past posts performed, not on when your followers are online (that needs the audience insights permission, which isn’t requested).',
  ],
  facebook: [
    'Uses your Page’s post insights. Posts without impression data are left out of engagement-rate and impression figures.',
    'Personal-profile metrics aren’t available through the Facebook API.',
  ],
  youtube: [
    'Watch time comes from the YouTube Analytics API when you connect with Google sign-in; best times are based on views and engagement, which every connection has.',
    'Videos younger than 7 days are left out because their views are still climbing. View counts are lifetime totals, so compare them with care.',
    'Shorts are identified by length (60 seconds or less).',
  ],
  linkedin: [
    'Impressions and engagement are only available where LinkedIn grants analytics access; posts without impressions are left out.',
  ],
  all: [
    'Combines every connected account. Each post is compared with its own account’s typical post, never with another account’s raw numbers.',
  ],
};

type Item = Awaited<ReturnType<typeof mediaRepository.listForPlanner>>[number];

/** The value of `metric` for an item, or undefined when it wasn't actually measured. */
function measured(item: Item, metric: PlannerMetric): number | undefined {
  const missing = new Set(item.unavailableMetrics ?? []);
  if (missing.has(metric)) return undefined;
  if (metric === 'engagementRate') {
    // Engagement rate needs a measured denominator. Older Facebook syncs estimated one when impressions were missing.
    if (missing.has('engagementRate')) return undefined;
    if ((item.platform === 'facebook' || item.platform === 'linkedin' || item.platform === 'youtube') && (missing.has('views') || !item.views)) return undefined;
    return item.engagementRate;
  }
  if (metric === 'reach') return item.platform === 'instagram' && item.reach > 0 ? item.reach : undefined;
  return item.views > 0 || item.platform === 'youtube' ? item.views : undefined;
}

function validTimezone(tz?: string | null): string | null {
  if (!tz) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return null; }
}

export async function bestTimes(
  userId: string,
  q: { platform: PlannerPlatform | 'all'; days: 30 | 60 | 90; metric?: PlannerMetric; contentType?: string },
  now = new Date(),
) {
  const uid = toObjectId(userId);
  const [accounts, profile] = await Promise.all([connectionRepository.listForUser(uid), profileRepository.findByUserId(uid)]);
  const profileTz = validTimezone(profile?.timezone);
  const timezone = profileTz ?? 'UTC';
  const connections = toPlatformConnections(accounts).map((c) => ({
    platform: c.platform, name: c.name, connected: c.connected, status: c.status, handle: c.connected ? c.accountHandle : null,
    lastSyncedAt: c.sync.lastSyncedAt as string | null, syncState: c.sync.state as string,
    // A synced account can still be missing the permissions that measure posts (e.g. Facebook without read_insights).
    missingPermissions: c.missingPermissions ?? [],
  }));

  const metrics = METRICS[q.platform];
  if (q.metric && !metrics.some((m) => m.key === q.metric)) throw new AppError('VALIDATION_ERROR', `${q.metric} isn’t available for ${q.platform}. Choose one of: ${metrics.map((m) => m.key).join(', ')}.`);
  let metric: PlannerMetric = q.metric ?? REACH_PRIORITY[q.platform][0];

  const scope = accounts.filter((a) => a.active && (q.platform === 'all' || a.platform === q.platform));
  const from = new Date(now.getTime() - q.days * 86_400_000);
  const head = {
    platform: q.platform,
    days: q.days,
    range: { from: from.toISOString(), to: now.toISOString() },
    timezone,
    timezoneSource: profileTz ? 'profile' as const : 'default' as const,
    accounts: connections,
    scope: scope.map((a) => ({ platform: a.platform as PlatformType, handle: a.handle })),
    metric,
    metrics,
    windows: TIME_WINDOWS.map((w) => ({ key: w.key, label: w.label, range: windowRange(w.key) })),
    notes: NOTES[q.platform],
    method: {
      summary: 'Each post is compared with what was expected for it: the median of your posts of the same format published within three weeks of it. That removes the effect of follower growth and of format (Reels usually reach more people) so only timing is compared. Posts are then grouped by weekday and time of day in your timezone, and each slot is tested against the rest (Mann–Whitney). Slot scores are pulled toward “typical” until enough posts back them up.',
      thresholds: { minTotalPosts: PLANNER_THRESHOLDS.minTotalPosts, minSlotPosts: PLANNER_THRESHOLDS.minSlotPosts, moderate: PLANNER_THRESHOLDS.moderate, strong: PLANNER_THRESHOLDS.strong },
      maturityHours: PLANNER_THRESHOLDS.maturityHours,
    },
  };

  if (scope.length === 0) {
    return { ...head, state: 'not_connected' as const, contentTypes: [], contentType: 'all', analysis: null };
  }

  const items = await mediaRepository.listForPlanner(uid, scope.map((a) => a._id), from);
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.contentType, (counts.get(i.contentType) ?? 0) + 1);
  const contentTypes = [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  // YouTube Shorts and long videos behave differently; never mix them unless the user asks for "all".
  let contentType = q.contentType ?? 'all';
  if (!q.contentType && q.platform === 'youtube' && contentTypes.length > 1) contentType = contentTypes[0].type;
  const filtered = contentType === 'all' ? items : items.filter((i) => i.contentType === contentType);

  const posts: PlannerPost[] = filtered.map((i) => {
    const values: PlannerPost['values'] = {};
    for (const m of metrics) {
      // In the combined view "reach" means each platform's closest measure of how many people saw the post.
      const v = q.platform === 'all' && m.key === 'reach' ? (i.platform === 'instagram' ? measured(i, 'reach') : measured(i, 'views')) : measured(i, m.key);
      if (v !== undefined) values[m.key] = v;
    }
    return { accountId: String(i.connectedAccountId), platform: i.platform as PlannerPlatform, publishedAt: new Date(i.publishedAt), contentType: i.contentType, values };
  });

  const measuredCount = (k: PlannerMetric) => posts.filter((p) => p.values[k] !== undefined).length;
  // Without an explicit choice, use the first reach-like metric with enough measured posts to analyse.
  if (!q.metric) {
    const priority = REACH_PRIORITY[q.platform];
    metric = priority.find((k) => measuredCount(k) >= PLANNER_THRESHOLDS.minTotalPosts) ?? priority.find((k) => measuredCount(k) > 0) ?? metric;
  }

  return {
    ...head,
    metric,
    state: 'ready' as const,
    metrics: metrics.map((m) => ({ ...m, measuredPosts: measuredCount(m.key) })),
    contentTypes,
    contentType,
    postsPerWeek: Number((filtered.length / (q.days / 7)).toFixed(1)),
    analysis: computeBestTimes(posts, { metric, timezone, now }),
  };
}
