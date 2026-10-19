import { Types } from 'mongoose';
import type { PlannedContent, PlatformType } from '../../../shared/types.js';
import { notFound, AppError, conflict } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { isValidTimezone, to12h, utcToZoned, weekdayOf, zonedToUtc } from '../lib/zonedTime.js';
import { plannedRepository } from '../repositories/planned.repository.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import type { ChecklistItemDoc, PlannedContentDoc } from '../models/PlannedContent.js';
import { ContentAnalysis, type ContentAnalysisDoc } from '../models/ContentAnalysis.js';
import { ContentItem, type ContentItemDoc } from '../models/ContentItem.js';
import { Notification } from '../models/Notification.js';
import { loadAnalyticsContext } from './analytics.service.js';
import { buildSummary } from './analytics.stats.js';
import { bestTimes } from './planner/bestTimes.service.js';
import {
  canTransition, defaultChecklist, effectiveStatus, FORMAT_CONTENT_TYPE, formatFromLegacy, NEEDS_DATE, normaliseStoredStatus,
  PLAN_FORMATS, type PlanFormat, type StoredStatus,
} from './planner/plans.js';

const view = (d: PlannedContentDoc): PlannedContent => ({
  id: String(d._id), day: d.day as PlannedContent['day'], time: d.time ?? '', platform: d.platform as PlannedContent['platform'], contentType: d.contentType, title: d.title,
  isRecommended: d.isRecommended, recommendationReason: d.recommendationReason,
  // Media Navigator never publishes, so nothing it stores is "scheduled". Older rows used that word for a plan.
  status: (d.status === 'scheduled' ? 'planned' : d.status) as PlannedContent['status'],
});

/** Planner V2 view of one plan. `status` is the effective status (a passed, unpublished plan is "missed"). */
export function planView(d: PlannedContentDoc, now = new Date()) {
  const stored = normaliseStoredStatus(d.status);
  const platform = d.platform as PlatformType;
  const checklist = (d.checklist ?? []).map((c) => ({ id: c.id, label: c.label, done: c.done }));
  return {
    id: String(d._id),
    title: d.title,
    platform,
    format: (d.format as PlanFormat | null) ?? formatFromLegacy(platform, d.contentType),
    contentType: d.contentType,
    status: effectiveStatus(stored, d.scheduledAt ?? null, now),
    storedStatus: stored,
    /** A plan from before dates existed: it has a weekday and time but no calendar date yet. */
    needsDate: !d.scheduledAt && (stored === 'planned' || stored === 'ready'),
    scheduledAt: d.scheduledAt ? d.scheduledAt.toISOString() : null,
    timezone: d.timezone ?? null,
    localDate: d.localDate ?? null,
    localTime: d.localTime ?? null,
    legacy: !d.scheduledAt && d.day ? { day: d.day, time: d.time ?? '' } : null,
    description: d.description ?? '',
    caption: d.caption ?? '',
    cta: d.cta ?? '',
    referenceUrl: d.referenceUrl ?? '',
    notes: d.notes ?? '',
    goal: d.goal ?? null,
    checklist,
    checklistDone: checklist.filter((c) => c.done).length,
    reminders: [...(d.reminders ?? [])].sort((a, b) => b - a),
    remindersSentCount: (d.remindersSent ?? []).length,
    groupId: d.groupId ?? null,
    source: d.source
      ? { mediaId: d.source.mediaId, analysisType: d.source.analysisType, recommendationIndex: d.source.recommendationIndex, recommendationText: d.source.recommendationText, analysisSummary: d.source.analysisSummary, platform: d.source.platform }
      : null,
    publication: d.publication
      ? { verification: d.publication.verification, mediaId: d.publication.mediaId ?? null, url: d.publication.url ?? null, publishedAt: d.publication.publishedAt.toISOString(), confirmedAt: d.publication.confirmedAt.toISOString() }
      : null,
    isRecommended: d.isRecommended,
    recommendationReason: d.recommendationReason ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: (d.updatedAt ?? d.createdAt).toISOString(),
  };
}
export type PlanView = ReturnType<typeof planView>;

type ChecklistInput = Array<{ id?: string; label: string; done?: boolean }>;
export interface PlanTargetInput {
  platform: PlatformType;
  format: string;
  localDate?: string;
  localTime?: string;
  caption?: string;
  reminders?: number[];
  checklist?: ChecklistInput;
}
export interface CreatePlansInput {
  title: string;
  description?: string;
  caption?: string;
  cta?: string;
  referenceUrl?: string;
  notes?: string;
  goal?: string;
  status?: 'idea' | 'draft' | 'planned' | 'ready';
  timezone: string;
  targets: PlanTargetInput[];
  source?: { mediaId: string; analysisType: 'deep' | 'why_top' | 'why_bottom'; recommendationIndex: number };
}
export interface UpdatePlanInput {
  title?: string;
  description?: string;
  caption?: string;
  cta?: string;
  referenceUrl?: string;
  notes?: string;
  goal?: string | null;
  format?: string;
  localDate?: string;
  localTime?: string;
  timezone?: string;
  /** Remove the date (only for ideas and drafts). */
  clearDate?: boolean;
  reminders?: number[];
  checklist?: ChecklistInput;
}

const invalid = (m: string) => new AppError('VALIDATION_ERROR', m);
const newId = () => new Types.ObjectId().toHexString();

function checkFormat(platform: PlatformType, format: string): PlanFormat {
  const allowed = PLAN_FORMATS[platform] as readonly string[];
  if (!allowed.includes(format)) throw invalid(`${format} isn’t a format for ${platform}. Choose one of: ${allowed.join(', ')}.`);
  return format as PlanFormat;
}

function checklistDocs(items: ChecklistInput): ChecklistItemDoc[] {
  const seen = new Set<string>();
  return items.map((c) => {
    let id = c.id && /^[a-z0-9_-]{1,40}$/i.test(c.id) && !seen.has(c.id) ? c.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    return { id, label: c.label.trim(), done: Boolean(c.done) };
  });
}

/** The planned instant and the matching legacy weekday/time. A time inside a DST gap moves to the real local time. */
function schedule(localDate: string, localTime: string, timezone: string) {
  if (!isValidTimezone(timezone)) throw invalid(`${timezone} isn’t a known timezone.`);
  const { date } = zonedToUtc(localDate, localTime, timezone);
  const real = utcToZoned(date, timezone);
  return { scheduledAt: date, timezone, localDate: real.localDate, localTime: real.localTime, day: weekdayOf(real.localDate), time: to12h(real.localTime) };
}

async function activeAccountId(uid: Types.ObjectId, platform: PlatformType) {
  const a = await connectionRepository.findForUser(uid, platform);
  return a && a.active ? a._id : null;
}

/** A recommendation from a saved analysis the user owns, with a short excerpt to keep alongside the plan. */
async function loadSource(uid: Types.ObjectId, s: NonNullable<CreatePlansInput['source']>) {
  const doc = await ContentAnalysis.findOne({ userId: uid, mediaId: s.mediaId, analysisType: s.analysisType, result: { $ne: null } }).sort({ updatedAt: -1 }).lean<ContentAnalysisDoc>();
  const result = doc?.result as { summary?: string; recommendations?: string[] } | null | undefined;
  const text = result?.recommendations?.[s.recommendationIndex];
  if (!doc || typeof text !== 'string') throw notFound('That analysis recommendation wasn’t found. Open the analysis again and retry.');
  return {
    mediaId: s.mediaId, analysisType: s.analysisType, analysisId: doc._id, recommendationIndex: s.recommendationIndex,
    recommendationText: text.slice(0, 400), analysisSummary: (result?.summary ?? '').slice(0, 600), platform: doc.platform,
  };
}

const MAX_RANGE_DAYS = 120;

export const plannerService = {
  list: async (userId: string) => (await plannedRepository.list(toObjectId(userId), 200)).map(view),

  add: async (userId: string, item: { day: string; time: string; platform: string; contentType?: string; title: string }) =>
    view(await plannedRepository.create(toObjectId(userId), { ...item, contentType: item.contentType || 'Post', status: 'planned', isRecommended: false })),

  /** Dated plans in [from, to) (bounded), or the undated ones (ideas, drafts, legacy plans needing a date). */
  async listPlans(userId: string, q: { from?: string; to?: string; undated?: boolean }) {
    const uid = toObjectId(userId);
    if (q.undated) return (await plannedRepository.listUndated(uid, 300)).map((d) => planView(d));
    const from = new Date(q.from!);
    const to = new Date(q.to!);
    if (!(to > from)) throw invalid('`to` must be after `from`.');
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) throw invalid(`Ask for at most ${MAX_RANGE_DAYS} days at a time.`);
    return (await plannedRepository.listRange(uid, from, to, 1000)).map((d) => planView(d));
  },

  async get(userId: string, id: string) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    const group = d.groupId ? (await plannedRepository.listGroup(uid, d.groupId)).filter((g) => String(g._id) !== id).map((g) => planView(g)) : [];
    return { plan: planView(d), group };
  },

  /** One idea for one or more platforms. Each platform gets its own plan (format, time, caption, checklist, reminders). */
  async create(userId: string, input: CreatePlansInput) {
    const uid = toObjectId(userId);
    if (!isValidTimezone(input.timezone)) throw invalid(`${input.timezone} isn’t a known timezone.`);
    const platforms = input.targets.map((t) => t.platform);
    if (new Set(platforms).size !== platforms.length) throw invalid('Add each platform once.');
    const source = input.source ? await loadSource(uid, input.source) : null;
    const groupId = input.targets.length > 1 ? newId() : null;
    const rows = await Promise.all(input.targets.map(async (t) => {
      const format = checkFormat(t.platform, t.format);
      const dated = Boolean(t.localDate || t.localTime);
      if (dated && !(t.localDate && t.localTime)) throw invalid('Choose both a date and a time.');
      const status: StoredStatus = input.status ?? (dated ? 'planned' : 'idea');
      if (NEEDS_DATE.includes(status) && !dated) throw invalid(`A ${status} post needs a date and time.`);
      if (status === 'idea' && dated) throw invalid('Ideas don’t have a date. Save it as planned instead.');
      const when = dated ? schedule(t.localDate!, t.localTime!, input.timezone) : { scheduledAt: null, timezone: input.timezone, localDate: null, localTime: null, day: null, time: null };
      return {
        ...when,
        platform: t.platform, format, contentType: format, title: input.title.trim(),
        description: input.description?.trim() ?? '', caption: (t.caption ?? input.caption ?? '').trim(), cta: input.cta?.trim() ?? '',
        referenceUrl: input.referenceUrl?.trim() ?? '', notes: input.notes?.trim() ?? '', goal: input.goal ?? null,
        status,
        checklist: checklistDocs(t.checklist ?? defaultChecklist(format).map((label) => ({ label }))),
        reminders: [...new Set(t.reminders ?? [])],
        remindersSent: [],
        groupId,
        connectedAccountId: await activeAccountId(uid, t.platform),
        source,
        publication: null,
        isRecommended: Boolean(source),
        recommendationReason: source?.recommendationText,
      };
    }));
    const created = await plannedRepository.createMany(uid, rows);
    return { groupId, plans: created.map((d) => planView(d)) };
  },

  async update(userId: string, id: string, patch: UpdatePlanInput) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    const stored = normaliseStoredStatus(d.status);
    const platform = d.platform as PlatformType;
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    for (const k of ['title', 'description', 'caption', 'cta', 'referenceUrl', 'notes'] as const) if (patch[k] !== undefined) set[k] = patch[k]!.trim();
    if (patch.goal !== undefined) set.goal = patch.goal;
    if (patch.format !== undefined) { set.format = checkFormat(platform, patch.format); set.contentType = patch.format; }
    if (patch.reminders !== undefined) set.reminders = [...new Set(patch.reminders)];
    if (patch.checklist !== undefined) set.checklist = checklistDocs(patch.checklist);

    const touchesDate = patch.localDate !== undefined || patch.localTime !== undefined || patch.timezone !== undefined;
    if (patch.clearDate) {
      if (stored === 'published') throw invalid('Published posts keep their date.');
      if (touchesDate) throw invalid('Either change the date or clear it, not both.');
      if (NEEDS_DATE.includes(stored)) throw invalid('Planned posts need a date. Move it to ideas or drafts first.');
      Object.assign(set, { scheduledAt: null, localDate: null, localTime: null, day: null, time: null });
    } else if (touchesDate) {
      if (stored === 'published') throw invalid('This post is already published, so its date can’t change.');
      if (stored === 'idea') throw invalid('Ideas don’t have a date. Change the status to planned with a date instead.');
      const localDate = patch.localDate ?? d.localDate;
      const localTime = patch.localTime ?? d.localTime;
      if (!localDate || !localTime) throw invalid('Choose both a date and a time.');
      Object.assign(set, schedule(localDate, localTime, patch.timezone ?? d.timezone ?? 'UTC'));
    }
    const updated = await plannedRepository.update(uid, id, set, unset);
    if (!updated) throw notFound('Plan not found');
    return planView(updated);
  },

  /** Lifecycle changes. Planned/ready need a date; un-publishing removes the link to the published post. */
  async setStatus(userId: string, id: string, body: { status: StoredStatus; localDate?: string; localTime?: string; timezone?: string }) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    const from = normaliseStoredStatus(d.status);
    const to = body.status;
    if (to === 'published') throw invalid('Use “Mark published” to record where it was published.');
    if (!canTransition(from, to)) throw invalid(`A ${from} post can’t become ${to}.`);
    const set: Record<string, unknown> = { status: to };
    const unset: string[] = [];
    if (body.localDate || body.localTime) {
      if (!body.localDate || !body.localTime) throw invalid('Choose both a date and a time.');
      Object.assign(set, schedule(body.localDate, body.localTime, body.timezone ?? d.timezone ?? 'UTC'));
    }
    const hasDate = Boolean(set.scheduledAt ?? d.scheduledAt);
    if (NEEDS_DATE.includes(to) && !hasDate) throw invalid(`Choose a date and time to make this ${to}.`);
    if (to === 'idea') Object.assign(set, { scheduledAt: null, localDate: null, localTime: null, day: null, time: null });
    if (from === 'published') unset.push('publication');
    const updated = await plannedRepository.update(uid, id, set, unset);
    if (!updated) throw notFound('Plan not found');
    return planView(updated);
  },

  async remove(userId: string, id: string) {
    const uid = toObjectId(userId);
    await plannedRepository.remove(uid, id);
    // Reminders that already arrived would open a plan that no longer exists.
    await Notification.deleteMany({ userId: uid, type: 'plan_reminder', 'data.planId': id });
    return { id };
  },

  /**
   * Synced posts that could be this plan's published post: same account and platform, the matching post type,
   * published from 1 day before to 3 days after the planned time, and not linked to another plan.
   * These are only candidates; nothing is linked until the user confirms.
   */
  async matches(userId: string, id: string) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    const platform = d.platform as PlatformType;
    const account = await connectionRepository.findForUser(uid, platform);
    const base = { lastSyncedAt: account?.lastSyncedAt ? account.lastSyncedAt.toISOString() : null };
    if (!account || !account.active) return { ...base, state: 'unavailable' as const, reason: 'not_connected' as const, candidates: [] };
    const format = (d.format as PlanFormat | null) ?? formatFromLegacy(platform, d.contentType);
    const type = format ? FORMAT_CONTENT_TYPE[platform][format] : undefined;
    if (type === null) return { ...base, state: 'unavailable' as const, reason: 'format_not_synced' as const, candidates: [] };
    if (!d.scheduledAt) return { ...base, state: 'unavailable' as const, reason: 'no_date' as const, candidates: [] };
    const at = d.scheduledAt.getTime();
    const rows = await ContentItem.find({
      userId: uid, connectedAccountId: account._id, platform,
      publishedAt: { $gte: new Date(at - 86_400_000), $lte: new Date(at + 3 * 86_400_000) },
      ...(type ? { contentType: type } : {}),
    }).sort({ publishedAt: 1 }).limit(20).select('legacyId title caption thumbnailUrl mediaUrl publishedAt contentType').lean<ContentItemDoc[]>();
    const claimed = new Set((await plannedRepository.findByPublishedMedia(uid, rows.map((r) => r.legacyId)))
      .filter((p) => String(p._id) !== id).map((p) => p.publication?.mediaId));
    const candidates = rows.filter((r) => !claimed.has(r.legacyId))
      .map((r) => ({
        mediaId: r.legacyId, title: r.title || r.caption.slice(0, 80) || 'Untitled post', thumbnailUrl: r.thumbnailUrl ?? null, url: r.mediaUrl ?? null,
        publishedAt: r.publishedAt.toISOString(), contentType: r.contentType, minutesFromPlan: Math.round((r.publishedAt.getTime() - at) / 60_000),
      }))
      .sort((a, b) => Math.abs(a.minutesFromPlan) - Math.abs(b.minutesFromPlan));
    const reason = account.status === 'connection_expired' ? 'expired' as const : account.status === 'permission_required' ? 'permission_required' as const : null;
    return { ...base, state: candidates.length ? 'possible' as const : 'none' as const, reason, candidates };
  },

  /**
   * Records publication. With `mediaId` the plan is linked to that synced post (the user confirmed the match); with a
   * `url` that is exactly a synced post's permalink it is linked to it; otherwise it is marked published manually.
   */
  async publish(userId: string, id: string, body: { mediaId?: string; url?: string; publishedAt?: string }) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    const from = normaliseStoredStatus(d.status);
    if (!canTransition(from, 'published')) throw invalid(`A ${from} post can’t be marked published.`);
    let item: ContentItemDoc | null = null;
    if (body.mediaId) {
      item = await mediaRepository.findByLegacyId(uid, body.mediaId);
      if (!item) throw notFound('That post wasn’t found in your synced posts.');
      if (item.platform !== d.platform) throw invalid('That post is on a different platform.');
    } else if (body.url) {
      item = await ContentItem.findOne({ userId: uid, platform: d.platform, mediaUrl: body.url.trim() }).lean<ContentItemDoc>();
    }
    const now = new Date();
    const publication = item
      ? { verification: 'matched' as const, mediaId: item.legacyId, url: item.mediaUrl ?? body.url ?? null, publishedAt: item.publishedAt, confirmedAt: now }
      : { verification: 'manual' as const, mediaId: null, url: body.url?.trim() || null, publishedAt: body.publishedAt ? new Date(body.publishedAt) : now, confirmedAt: now };
    if (publication.publishedAt.getTime() > now.getTime() + 5 * 60_000) throw invalid('The publish time can’t be in the future.');
    try {
      const updated = await plannedRepository.update(uid, id, { status: 'published', publication });
      if (!updated) throw notFound('Plan not found');
      return planView(updated);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw conflict('That post is already linked to another plan.');
      throw e;
    }
  },

  /** What happened after publishing: the post's measured results next to comparable posts. Nothing is estimated. */
  async review(userId: string, id: string, now = new Date()) {
    const uid = toObjectId(userId);
    const d = await plannedRepository.findById(uid, id);
    if (!d) throw notFound('Plan not found');
    if (!d.publication) return { state: 'not_published' as const };
    if (!d.publication.mediaId) return { state: 'not_linked' as const };
    const item = await mediaRepository.findByLegacyId(uid, d.publication.mediaId);
    if (!item) return { state: 'post_unavailable' as const };

    const KEYS = [
      ['views', 'Views'], ['reach', 'Reach'], ['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'],
      ['saves', 'Saves'], ['watchTimeMinutes', 'Watch time (min)'], ['engagementRate', 'Engagement rate'],
    ] as const;
    const value = (row: Pick<ContentItemDoc, 'unavailableMetrics'> & Record<string, unknown>, k: string): number | null => {
      if ((row.unavailableMetrics ?? []).includes(k)) return null;
      const v = row[k];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    };
    const published = item.publishedAt.getTime();
    const comparable = await ContentItem.find({
      userId: uid, connectedAccountId: item.connectedAccountId, contentType: item.contentType, _id: { $ne: item._id },
      publishedAt: { $gte: new Date(published - 90 * 86_400_000), $lt: item.publishedAt },
    }).select(KEYS.map(([k]) => k).join(' ') + ' unavailableMetrics').limit(500).lean<ContentItemDoc[]>();
    const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const metrics = KEYS.map(([key, label]) => {
      const v = value(item as never, key);
      const peers = comparable.map((c) => value(c as never, key)).filter((x): x is number => x !== null);
      const base = peers.length >= 5 ? median(peers) : null;
      return {
        key, label, value: v,
        comparison: v !== null && base !== null ? { median: base, posts: peers.length, diffPct: base === 0 ? null : Math.round(((v - base) / base) * 100) } : null,
      };
    });
    const analyses = await ContentAnalysis.find({ userId: uid, mediaId: item.legacyId, result: { $ne: null } }).sort({ updatedAt: -1 }).select('analysisType result').lean<ContentAnalysisDoc[]>();
    const deep = analyses.find((a) => a.analysisType === 'deep');
    const recs = ((deep?.result as { recommendations?: string[] } | null)?.recommendations ?? []).slice(0, 3);
    return {
      state: 'ready' as const,
      post: { mediaId: item.legacyId, title: item.title || item.caption.slice(0, 80), platform: item.platform, contentType: item.contentType, publishedAt: item.publishedAt.toISOString(), url: item.mediaUrl ?? null, thumbnailUrl: item.thumbnailUrl ?? null, syncedAt: item.syncedAt.toISOString() },
      metrics,
      insightsAvailable: metrics.some((m) => m.value !== null),
      /** Platforms keep counting for a while; early numbers are not final. */
      maturing: now.getTime() - published < 48 * 3_600_000,
      comparedWith: { contentType: item.contentType, days: 90, posts: comparable.length },
      analyses: [...new Set(analyses.map((a) => a.analysisType))],
      nextIdeas: recs.map((text, index) => ({ index, text, analysisType: 'deep' as const })),
    };
  },

  /** Best time to post for one platform's connected account (or all accounts combined). */
  bestTimes,

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
      day, time, platform, contentType: rec.suggestedSlot?.format || 'post', title: rec.title, status: 'planned', isRecommended: true, recommendationReason: rec.reason,
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
