import type { Types } from 'mongoose';
import type { PlatformType } from '../../../shared/types.js';
import { toObjectId } from '../lib/ids.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsEngine } from './analytics.engine.js';
import { toNormalized } from '../integrations/mapper.js';
import { toPlatformConnections } from './connection.view.js';
import { CALC_VERSION, buildSummary, buildContentIdeas, mean, median } from './analytics.stats.js';
import type { ConnectedAccountDoc } from '../models/ConnectedAccount.js';
import { sha256 } from '../lib/crypto.js';

function validTimezone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return undefined; }
}

export async function loadAnalyticsContext(userId: string | Types.ObjectId) {
  const uid = typeof userId === 'string' ? toObjectId(userId) : userId;
  const [accounts, profile] = await Promise.all([connectionRepository.listForUser(uid), profileRepository.findByUserId(uid)]);
  const live = accounts.filter((a) => a.active);
  const items = live.length ? await mediaRepository.listForAnalytics(uid, live.map((a) => a._id)) : [];
  const media = items.map(toNormalized);
  const connections = toPlatformConnections(accounts);
  const timezone = validTimezone(profile?.timezone);
  const engine = new AnalyticsEngine(media, connections, { timezone });
  return { uid, accounts, live, media, connections, engine, timezone: timezone ?? 'UTC', items };
}

/** Changes whenever the user's synced numbers change; used to invalidate AI/analytics caches. */
export function dataVersionOf(media: Array<{ id: string; views: number; likes: number; comments: number; shares: number; engagementRate: number }>): string {
  const h = media.map((m) => `${m.id}:${m.views}:${m.likes}:${m.comments}:${m.shares}:${m.engagementRate}`).sort().join('|');
  return `${CALC_VERSION}.${sha256(h).slice(0, 16)}`;
}

export const analyticsService = {
  async overview(userId: string) { return (await loadAnalyticsContext(userId)).engine.getOverviewData(); },
  async timing(userId: string) {
    const { engine, timezone } = await loadAnalyticsContext(userId);
    return { ...engine.getTimingData(), timezone };
  },
  async signals(userId: string) { return (await loadAnalyticsContext(userId)).engine.getInsights(); },
  async performers(userId: string, sortBy: 'views' | 'engagement' | 'likes' | 'comments') {
    const { engine } = await loadAnalyticsContext(userId);
    return { top: engine.getTopPerformers(sortBy), bottom: engine.getBottomPerformers(sortBy) };
  },
  async patterns(userId: string) { return (await loadAnalyticsContext(userId)).engine.getContentPatterns(); },
  async archive(userId: string) { return (await loadAnalyticsContext(userId)).engine.getComprehensiveArchiveAnalysis(); },
  async recommendations(userId: string) { return (await loadAnalyticsContext(userId)).engine.getRecommendations(); },
  async trends(userId: string) { return (await loadAnalyticsContext(userId)).engine.getTrends(); },

  /** Median-based, user-relative summary. `platform` scopes strictly to one platform; omitted = connected platforms only. */
  async summary(userId: string, opts: { platform?: PlatformType; days: number }) {
    const ctx = await loadAnalyticsContext(userId);
    const connectedPlatforms = ctx.connections.filter((c) => c.connected).map((c) => c.platform);
    const summary = buildSummary({ media: ctx.media, connectedPlatforms, platform: opts.platform, days: opts.days });
    const window = ctx.engine.getTimingData().strongestWindow;
    const best = window ? { dayFull: String(window.label).split(' — ')[0], timeSlot: window.timeSlot, timezone: ctx.timezone } : null;
    return {
      ...summary,
      timezone: ctx.timezone,
      dataVersion: dataVersionOf(ctx.media),
      lastSyncedAt: ctx.live.map((a) => a.lastSyncedAt).filter(Boolean).sort().pop() ?? null,
      contentIdeas: { generatedBy: 'rules', items: buildContentIdeas(summary, best) },
    };
  },

  async history(userId: string, params: { from?: string; to?: string; platform?: string; limit: number }) {
    return analyticsRepository.history(toObjectId(userId), params);
  },

  /** Writes today's per-account snapshot after a sync. */
  async recordSnapshot(account: ConnectedAccountDoc, items: Array<{ views: number; likes: number; comments: number; shares: number; engagementRate: number }>) {
    const eng = items.map((i) => i.engagementRate);
    await analyticsRepository.upsertDaily({
      userId: account.userId,
      connectedAccountId: account._id,
      platform: account.platform,
      date: new Date().toISOString().slice(0, 10),
      calcVersion: CALC_VERSION,
      contentCount: items.length,
      totalViews: items.reduce((a, b) => a + b.views, 0),
      totalLikes: items.reduce((a, b) => a + b.likes, 0),
      totalComments: items.reduce((a, b) => a + b.comments, 0),
      totalShares: items.reduce((a, b) => a + b.shares, 0),
      meanEngagementRate: Number(mean(eng).toFixed(2)),
      medianEngagementRate: Number(median(eng).toFixed(2)),
      followersCount: account.accountInfo?.followersCount ?? null,
    });
  },
};
