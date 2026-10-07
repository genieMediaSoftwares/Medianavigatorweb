import { z } from 'zod';
import type { Types } from 'mongoose';
import type { NormalizedMedia, PostAIDiagnosis } from '../../../../shared/types.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { sha256 } from '../../lib/crypto.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { toNormalized } from '../../integrations/mapper.js';
import { loadAnalyticsContext, dataVersionOf } from '../analytics.service.js';
import { baselineFor, classify, groupBy, pctChange, median, type PerformanceClass, MIN_HISTORY_FOR_CLASSIFICATION } from '../analytics.stats.js';
import { AiFailedError, AiUnavailableError, aiAvailable, aiModel, generateJson } from './geminiClient.js';
import { askPrompt, itemPrompt, videoPrompt, PROMPT_VERSION, SYSTEM } from './prompts.js';
import { cacheKey, getCached, putCached } from './aiCache.service.js';

export interface AiMeta {
  /** ran = fresh model output; cached = previous model output for identical data+prompt; unavailable = not configured; failed = call errored; not_needed = nothing to analyse */
  status: 'ran' | 'cached' | 'unavailable' | 'failed' | 'not_needed';
  model: string | null;
  promptVersion: string;
  generatedAt: string | null;
  reason?: string;
}

const strList = z.array(z.string().max(500)).max(8);
const askSchema = z.object({ answer: z.string().max(3000), observedSignal: z.string().max(600), suggestedAction: z.string().max(600) });
const itemSchema = z.object({ interpretation: z.string().max(1500), whatWorked: strList, whatToImprove: strList, recommendations: strList, alternativeHook: z.string().max(400) });
const videoSchema = z.object({ hookAssessment: z.string().max(1000), captionAssessment: z.string().max(1000), recommendations: strList, alternativeHook: z.string().max(400) });

const meta = (status: AiMeta['status'], extra: Partial<AiMeta> = {}): AiMeta => ({ status, model: null, promptVersion: PROMPT_VERSION, generatedAt: null, ...extra });

/** Runs (or reuses) one AI step. Never throws for AI problems: the caller still gets deterministic content plus an honest status. */
async function aiStep<T>(args: { userId: Types.ObjectId; type: string; subject: string; dataVersion: string; system: string; prompt: string; schema: z.ZodType<T> }): Promise<{ data: T | null; ai: AiMeta }> {
  if (!aiAvailable()) return { data: null, ai: meta('unavailable', { reason: 'Gemini is not configured on this server' }) };
  const key = cacheKey({ userId: args.userId, type: args.type, subject: args.subject, dataVersion: args.dataVersion });
  const hit = await getCached<T>(args.userId, key);
  if (hit) return { data: hit.payload, ai: meta('cached', { model: hit.model, generatedAt: hit.generatedAt.toISOString() }) };
  try {
    const out = await generateJson({ system: args.system, prompt: args.prompt, schema: args.schema });
    await putCached({ userId: args.userId, key, type: args.type, payload: out.data, model: out.model, dataVersion: args.dataVersion });
    return { data: out.data, ai: meta('ran', { model: out.model, generatedAt: new Date().toISOString() }) };
  } catch (err) {
    if (err instanceof AiUnavailableError) return { data: null, ai: meta('unavailable', { reason: err.message }) };
    if (err instanceof AiFailedError) return { data: null, ai: meta('failed', { reason: err.reason }) };
    throw err;
  }
}

async function loadItem(userId: Types.ObjectId, mediaId: string) {
  const doc = await mediaRepository.findByLegacyId(userId, mediaId);
  if (!doc) throw notFound('Media not found');
  return toNormalized(doc);
}

function itemFacts(item: NormalizedMedia & { unavailableMetrics?: string[] }, siblings: NormalizedMedia[]) {
  const same = siblings.filter((m) => m.platform === item.platform);
  const baseline = baselineFor(same);
  const cls = classify(item, baseline);
  return {
    baseline, classification: cls,
    facts: {
      measured: {
        platform: item.platform, contentType: item.contentType, publishedAt: item.publishedAt,
        title: item.title, caption: item.caption?.slice(0, 400),
        views: item.views, reach: item.reach, likes: item.likes, comments: item.comments, shares: item.shares, engagementRatePct: item.engagementRate,
        durationSeconds: item.durationSeconds ?? null, unavailableMetrics: item.unavailableMetrics ?? [],
      },
      calculated: {
        classification: cls,
        comparedAgainst: `${baseline.sampleSize} ${item.platform} posts by the same account`,
        accountMedianEngagementPct: baseline.medianEngagementRate,
        accountP25EngagementPct: baseline.p25EngagementRate,
        accountP75EngagementPct: baseline.p75EngagementRate,
        engagementVsMedianPct: pctChange(item.engagementRate, baseline.medianEngagementRate),
        accountMedianViews: baseline.medianViews,
        viewsVsMedianPct: pctChange(item.views, baseline.medianViews),
      },
    },
  };
}

const statusFor = (c: PerformanceClass): PostAIDiagnosis['status'] => (c === 'TOP' ? 'working' : c === 'LOW' ? 'underperforming' : 'average');

export const aiAnalysisService = {
  status: () => ({ available: aiAvailable(), model: aiModel(), promptVersion: PROMPT_VERSION }),

  async ask(userId: string, question: string) {
    const ctx = await loadAnalyticsContext(userId);
    const media = ctx.engine.getMedia();
    if (media.length === 0) {
      return { answer: 'No content has been synced yet, so there is nothing to analyse. Connect an account and run a sync first.', observedSignal: 'No synced content.', suggestedAction: 'Connect a platform.', source: 'No data', ai: meta('not_needed'), measured: null };
    }
    const archive = ctx.engine.getComprehensiveArchiveAnalysis();
    const byPlatform = Object.fromEntries(Object.entries(groupBy(media, (m) => m.platform)).map(([p, items]) => [p, baselineFor(items as NormalizedMedia[])]));
    const top = [...media].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5).map((m) => ({ title: m.title.slice(0, 80), platform: m.platform, type: m.contentType, engagementPct: m.engagementRate, views: m.views }));
    const bottom = [...media].sort((a, b) => a.engagementRate - b.engagementRate).slice(0, 5).map((m) => ({ title: m.title.slice(0, 80), platform: m.platform, type: m.contentType, engagementPct: m.engagementRate, views: m.views }));
    const window = ctx.engine.getTimingData().strongestWindow;
    const facts = {
      measured: { postsAnalysed: media.length, platforms: [...new Set(media.map((m) => m.platform))], totalViews: archive.totalVerifiedViews, totalInteractions: archive.totalInteractions },
      calculated: { baselinePerPlatform: byPlatform, formatPerformance: archive.formats, bestWindow: window ? { label: window.label, slot: window.timeSlot, note: window.supportingText, timezone: ctx.timezone } : null, topPosts: top, bottomPosts: bottom },
    };
    const dataVersion = dataVersionOf(media);
    const step = await aiStep({ userId: ctx.uid, type: 'ask', subject: sha256(question.trim().toLowerCase()), dataVersion, system: SYSTEM, prompt: askPrompt(facts, question), schema: askSchema });
    if (step.data) return { ...step.data, source: step.ai.status === 'cached' ? 'AI (cached)' : 'AI', ai: step.ai, measured: facts };

    const lines = [
      `${media.length} posts across ${facts.measured.platforms.join(', ')}.`,
      archive.formats[0] ? `Best-performing format by mean engagement: ${archive.formats[0].format} (${archive.formats[0].avgEngagement}%).` : '',
      window ? `Strongest publishing window: ${window.label}, ${window.timeSlot} (${ctx.timezone}).` : '',
      top[0] ? `Top post: "${top[0].title}" at ${top[0].engagementPct}% engagement.` : '',
    ].filter(Boolean);
    return {
      answer: `AI interpretation is unavailable right now, so here are the measured facts only. ${lines.join(' ')}`,
      observedSignal: lines[0], suggestedAction: 'Ask again once AI analysis is available, or review Top Content and Needs Improvement.',
      source: 'Measured facts only (AI unavailable)', ai: step.ai, measured: facts,
    };
  },

  async analyzeItem(userId: string, mediaId: string) {
    const ctx = await loadAnalyticsContext(userId);
    const item = await loadItem(ctx.uid, mediaId);
    const f = itemFacts(item, ctx.engine.getMedia());
    const step = await aiStep({ userId: ctx.uid, type: 'item', subject: mediaId, dataVersion: dataVersionOf([item, ...ctx.engine.getMedia().filter((m) => m.platform === item.platform)]), system: SYSTEM, prompt: itemPrompt(f.facts), schema: itemSchema });
    const m = f.facts.measured; const c = f.facts.calculated;
    const observedFact = `"${item.title.slice(0, 80)}" has ${m.views.toLocaleString()} views and ${m.engagementRatePct}% engagement; ${c.classification === 'INSUFFICIENT_DATA' ? `there are fewer than ${MIN_HISTORY_FOR_CLASSIFICATION} ${item.platform} posts to compare against` : `${c.engagementVsMedianPct === null ? 'no comparable median' : `${c.engagementVsMedianPct}% versus your median (${c.accountMedianEngagementPct}%)`}, classified ${c.classification}`}.`;
    return {
      observedFact,
      possibleReason: step.data?.interpretation ?? 'AI interpretation is not available for this request.',
      actionableRecommendations: step.data?.recommendations ?? [],
      confidence: c.classification === 'INSUFFICIENT_DATA' ? 'Medium' as const : 'High' as const,
      answeredBy: step.data ? 'AI' : 'Measured facts only (AI unavailable)',
      measured: f.facts.measured, calculated: f.facts.calculated, ai: step.ai,
    };
  },

  async diagnosePost(userId: string, mediaId: string, _requestedView?: 'working' | 'underperforming' | 'average') {
    const ctx = await loadAnalyticsContext(userId);
    const item = await loadItem(ctx.uid, mediaId);
    const siblings = ctx.engine.getMedia();
    const f = itemFacts(item, siblings);
    const c = f.facts.calculated;
    const status = statusFor(c.classification);
    const step = await aiStep({ userId: ctx.uid, type: 'diagnose', subject: mediaId, dataVersion: dataVersionOf([item, ...siblings.filter((m) => m.platform === item.platform)]), system: SYSTEM, prompt: itemPrompt(f.facts), schema: itemSchema });
    const ai = step.data;
    const sameType = siblings.filter((m) => m.platform === item.platform && m.contentType === item.contentType);
    const typeMedian = sameType.length >= 3 ? median(sameType.map((m) => m.engagementRate)) : null;
    const hasQuestion = (item.caption || '').includes('?');

    const diagnosis: PostAIDiagnosis & { measured: unknown; calculated: unknown; ai: AiMeta; limitations: string[] } = {
      mediaId,
      status,
      statusBadge: c.classification === 'TOP' ? 'Top performer vs your own history' : c.classification === 'LOW' ? 'Below your typical performance' : c.classification === 'TYPICAL' ? 'Near your typical performance' : 'Not enough history to classify',
      headline: ai ? ai.interpretation.split(/(?<=[.!?])\s/)[0].slice(0, 140) : `${item.platform} ${item.contentType}: ${c.classification.toLowerCase().replace('_', ' ')}`,
      executiveSummary: ai ? ai.interpretation : `Measured only (AI unavailable): ${c.engagementVsMedianPct === null ? 'no comparable baseline yet' : `engagement is ${c.engagementVsMedianPct}% versus your median`}.`,
      baselineComparison: c.engagementVsMedianPct === null ? 'No baseline yet (fewer than 5 comparable posts)' : `${c.engagementVsMedianPct >= 0 ? '+' : ''}${c.engagementVsMedianPct}% engagement vs your median (${c.accountMedianEngagementPct}%, n=${f.baseline.sampleSize})`,
      topSuccessDrivers: ai?.whatWorked ?? [],
      bottomImprovementPoints: ai?.whatToImprove ?? [],
      metricBreakdown: {
        viewsAnalysis: `${item.views.toLocaleString()} views${c.viewsVsMedianPct === null ? '' : ` (${c.viewsVsMedianPct >= 0 ? '+' : ''}${c.viewsVsMedianPct}% vs your median of ${c.accountMedianViews.toLocaleString()})`}.`,
        engagementHealth: `${item.engagementRate}% engagement from ${item.likes.toLocaleString()} likes, ${item.comments.toLocaleString()} comments${typeMedian !== null ? `; your median for ${item.contentType} posts is ${typeMedian.toFixed(2)}%` : ''}.`,
        commentVelocity: `${item.comments.toLocaleString()} comments. Comment timing is not available from the provider, so velocity cannot be measured.`,
        shareabilityAnalysis: f.facts.measured.unavailableMetrics.includes('shares') ? 'Shares are not exposed by this platform.' : `${item.shares.toLocaleString()} shares/saves reported.`,
      },
      suggestedHookAlternative: ai?.alternativeHook ?? '',
      recommendedFormatAndTiming: (() => {
        const w = ctx.engine.getTimingData().strongestWindow;
        return w ? `Your strongest historical window is ${w.label}, ${w.timeSlot} (${ctx.timezone}).` : 'Not enough history to recommend a publishing window.';
      })(),
      actionableChecklist: ai?.recommendations ?? [
        ...(!hasQuestion && siblings.some((m) => (m.caption || '').includes('?')) ? ['Test a question in the caption; compare against your posts that already use one.'] : []),
      ],
      source: ai ? 'AI interpretation of measured data' : 'Measured facts only (AI unavailable)',
      measured: f.facts.measured, calculated: f.facts.calculated, ai: step.ai,
      limitations: [
        'Retention, watch time and audience data are only shown when the platform provides them.',
        ...(f.facts.measured.unavailableMetrics.length ? [`Not available for this post: ${f.facts.measured.unavailableMetrics.join(', ')}.`] : []),
      ],
    };
    if (ai) {
      diagnosis.whyWorking = status !== 'underperforming' ? { hookEffectiveness: ai.whatWorked[0] ?? '', retentionDrivers: ai.whatWorked[1] ?? '', audienceInteractionTriggers: ai.whatWorked[2] ?? '', algorithmDistributionSignal: ai.whatWorked[3] ?? '' } : undefined;
      diagnosis.whyNotWorking = status !== 'working' ? { dropoffDiagnosis: ai.whatToImprove[0] ?? '', hookFriction: ai.whatToImprove[1] ?? '', valuePropositionGap: ai.whatToImprove[2] ?? '', formattingMismatch: ai.whatToImprove[3] ?? '' } : undefined;
    }
    return diagnosis;
  },

  async analyzeVideo(userId: string, mediaId: string) {
    const ctx = await loadAnalyticsContext(userId);
    const item = await loadItem(ctx.uid, mediaId);
    if (!['reel', 'short', 'video'].includes(item.contentType)) throw badRequest('Video analysis is only available for reels, shorts and videos');
    const f = itemFacts(item, ctx.engine.getMedia());
    const unavailable = ['audience retention curve', 'audio content', 'on-screen frames/overlay text', ...(item.watchTimeMinutes ? [] : ['watch time'])];
    const step = await aiStep({ userId: ctx.uid, type: 'video', subject: mediaId, dataVersion: dataVersionOf([item]), system: SYSTEM, prompt: videoPrompt({ ...f.facts, unavailable }), schema: videoSchema });
    return {
      mediaId, classification: f.facts.calculated.classification,
      measured: { durationSeconds: item.durationSeconds ?? null, views: item.views, engagementRatePct: item.engagementRate, watchTimeMinutes: item.watchTimeMinutes ?? null },
      calculated: f.facts.calculated,
      hookAssessment: step.data?.hookAssessment ?? null,
      captionAssessment: step.data?.captionAssessment ?? null,
      recommendations: step.data?.recommendations ?? [],
      testedAlternativeHook: step.data?.alternativeHook ?? null,
      unavailable,
      limitations: ['This analysis is based on title, caption and numeric metrics only. The platform APIs used here do not provide retention curves, audio or frames.'],
      ai: step.ai,
    };
  },

  /** Deterministic side-by-side comparison of two of the user's posts. No AI involved. */
  async compare(userId: string, a: string, b: string) {
    const ctx = await loadAnalyticsContext(userId);
    const [x, y] = await Promise.all([loadItem(ctx.uid, a), loadItem(ctx.uid, b)]);
    const row = (m: NormalizedMedia) => ({ id: m.id, platform: m.platform, contentType: m.contentType, title: m.title, publishedAt: m.publishedAt, views: m.views, likes: m.likes, comments: m.comments, shares: m.shares, engagementRatePct: m.engagementRate, durationSeconds: m.durationSeconds ?? null });
    const delta = (p: number, q: number) => ({ a: p, b: q, differencePct: pctChange(p, q) });
    return { a: row(x), b: row(y), comparison: { views: delta(x.views, y.views), likes: delta(x.likes, y.likes), comments: delta(x.comments, y.comments), engagementRatePct: delta(x.engagementRate, y.engagementRate) },
      note: x.platform !== y.platform ? 'These posts are on different platforms; metrics are not directly comparable.' : null, generatedBy: 'rules' };
  },
};

