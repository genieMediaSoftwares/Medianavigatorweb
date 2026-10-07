import type { PlannedContent } from '../../../shared/types.js';
import { notFound, AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { plannedRepository } from '../repositories/planned.repository.js';
import type { PlannedContentDoc } from '../models/PlannedContent.js';
import { loadAnalyticsContext } from './analytics.service.js';
import { buildSummary } from './analytics.stats.js';

const view = (d: PlannedContentDoc): PlannedContent => ({
  id: String(d._id), day: d.day as PlannedContent['day'], time: d.time, platform: d.platform as PlannedContent['platform'], contentType: d.contentType, title: d.title,
  isRecommended: d.isRecommended, recommendationReason: d.recommendationReason, status: d.status as PlannedContent['status'],
});

export const plannerService = {
  list: async (userId: string) => (await plannedRepository.list(toObjectId(userId), 200)).map(view),

  add: async (userId: string, item: { day: string; time: string; platform: string; contentType?: string; title: string }) =>
    view(await plannedRepository.create(toObjectId(userId), { ...item, contentType: item.contentType || 'Post', status: 'scheduled', isRecommended: false })),

  remove: async (userId: string, id: string) => { await plannedRepository.remove(toObjectId(userId), id); return { id }; },

  /** Adds a recommendation to the planner using a data-backed slot. If history is too thin the caller must choose the slot. */
  async planRecommendation(userId: string, recId: string, override?: { day?: string; time?: string }) {
    const ctx = await loadAnalyticsContext(userId);
    const rec = ctx.engine.getRecommendations().find((r) => r.id === recId);
    if (!rec) throw notFound('Recommendation not found');
    const day = override?.day ?? rec.suggestedSlot?.day;
    const time = override?.time ?? rec.suggestedSlot?.time;
    if (!day || !time) throw new AppError('VALIDATION_ERROR', 'There is not enough posting history to suggest a time. Provide day and time.');
    const platform = ctx.engine.getMedia().find((m) => `rec_${m.id}` === recId)?.platform ?? ctx.engine.getMedia()[0]?.platform ?? 'instagram';
    return view(await plannedRepository.create(toObjectId(userId), {
      day, time, platform, contentType: rec.suggestedSlot?.format || 'post', title: rec.title, status: 'scheduled', isRecommended: true, recommendationReason: rec.reason,
    }));
  },

  /** Analytics-driven planning: best days/times, formats, gaps. Nothing here is hardcoded. */
  async insights(userId: string) {
    const ctx = await loadAnalyticsContext(userId);
    const connected = ctx.connections.filter((c) => c.connected).map((c) => c.platform);
    const summary = buildSummary({ media: ctx.media, connectedPlatforms: connected, days: 30 });
    const now = Date.now();
    const lastPost = (p: string) => Math.max(0, ...ctx.media.filter((m) => m.platform === p).map((m) => new Date(m.publishedAt).getTime()));
    const gaps = connected
      .map((p) => ({ platform: p, daysSinceLastPost: lastPost(p) ? Math.floor((now - lastPost(p)) / 86_400_000) : null }))
      .filter((g) => g.daysSinceLastPost === null || g.daysSinceLastPost >= 14);
    return {
      timezone: ctx.timezone,
      hasEnoughData: ctx.engine.getMedia().length >= 5,
      bestWindows: ctx.engine.getTopWindows(3),
      recommendedFormats: summary.contentTypePerformance.filter((c) => c.count >= 3).slice(0, 3),
      topTopics: summary.topicPerformance.slice(0, 5),
      contentGaps: gaps,
      basedOn: { posts: ctx.engine.getMedia().length, platforms: summary.platformsIncluded, method: 'Mean engagement by weekday/time bucket (>= 2 posts preferred); formats and topics ranked by median engagement.' },
    };
  },
};
