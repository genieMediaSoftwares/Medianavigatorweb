import { createPartFromBase64, createPartFromUri, type Part } from '@google/genai';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { AppError, mediaUnavailable, notFound, unavailable } from '../../lib/errors.js';
import { toObjectId } from '../../lib/ids.js';
import { logger } from '../../lib/logger.js';
import { ContentAnalysis, type ContentAnalysisDoc } from '../../models/ContentAnalysis.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { loadAnalyticsContext } from '../analytics.service.js';
import { baselineFor as buildBaseline, classify, MIN_HISTORY_FOR_CLASSIFICATION, type Baseline } from '../analytics.stats.js';
import { gatherPostEvidence, type PostEvidence } from './postEvidence.js';
import { AiFailedError, AiUnavailableError, aiAvailable, aiModel, deleteUploaded, generateMultimodalJson, uploadVideo } from './geminiClient.js';

/** Bump when the prompt, evidence rules or output schema change: older saved diagnoses are then regenerated. */
export const DIAGNOSIS_VERSION = 'diagnosis-v1';

export type DiagnosisClass = 'TOP' | 'AVERAGE' | 'BOTTOM' | 'INSUFFICIENT_DATA';

/** The signal an insight or a diagnostic carries, and the colour it is shown in. */
export type DiagnosisSignal = 'positive' | 'mixed' | 'negative' | 'unknown';

const text = (max: number) => z.string().min(1).transform((v) => v.slice(0, max));
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.array(item).transform((a) => a.slice(0, max));
const level = z.string().transform((v) => v.toLowerCase()).pipe(z.enum(['high', 'medium', 'low']));
const signal = z.enum(['positive', 'mixed', 'negative', 'unknown']).catch('unknown');

/** One of the six analytical dimensions, with the evidence behind it. */
const insightSchema = z.object({
  key: z.enum(['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals']),
  title: z.string().optional(),
  signal,
  observation: text(320),
  evidence: text(320),
  whyItMatters: text(320),
  metric: text(160).nullable().default(null),
  confidence: level,
});

/** A creative alternative offered for content that under-performed. */
const alternativeSchema = z.object({
  title: text(80),
  angle: text(220),
  hook: text(220),
  execution: text(600),
  cta: text(160).nullable().default(null),
  whyItMayWorkBetter: text(280),
});

/** One reason the content may have under-performed, with its evidence and its fix. */
const diagnosticSchema = z.object({
  title: text(80),
  signal,
  observation: text(280),
  metric: text(160).nullable().default(null),
  impact: text(280),
  improvement: text(280),
});

const commonSchema = {
  summary: text(600),
  limitations: list(text(400), 8).default([]),
  confidence: z.object({ level, reason: text(400) }),
};

/** Top performers: understand the success first. */
const topSchema = z.object({
  ...commonSchema,
  threeLine: z.object({ whatWorked: text(280), performanceProof: text(280), strategicTakeaway: text(280) }),
  insights: z.array(insightSchema).length(6),
  preserve: list(text(240), 4).default([]),
});

/** Bottom performers: recover first. */
const bottomSchema = z.object({
  ...commonSchema,
  nextStep: z.object({ headline: text(220), body: text(600) }),
  alternatives: z.array(alternativeSchema).length(3),
  diagnostics: z.array(diagnosticSchema).min(3).max(6),
});

/** Not enough history to classify: an honest state, not a guess. */
const insufficientSchema = z.object({
  ...commonSchema,
  whatWorks: text(320),
  mainOpportunity: text(320),
  nextExperiment: text(320),
});

/** Average performers: one balanced view. */
const averageSchema = z.object({
  ...commonSchema,
  whatWorks: text(320),
  mainOpportunity: text(320),
  nextExperiment: text(320),
  insights: z.array(insightSchema).length(6),
});

export type TopDiagnosis = z.infer<typeof topSchema>;
export type InsufficientDiagnosis = z.infer<typeof insufficientSchema>;
export type BottomDiagnosis = z.infer<typeof bottomSchema>;
export type AverageDiagnosis = z.infer<typeof averageSchema>;
export type DiagnosisResult = TopDiagnosis | BottomDiagnosis | AverageDiagnosis | InsufficientDiagnosis;

export interface DiagnosisBaseline {
  sampleSize: number;
  medianEngagementRate: number;
  p25EngagementRate: number;
  p75EngagementRate: number;
  medianViews: number;
  /** The measured numbers compared with the account's own median for the same platform. */
  rows: Array<{ key: string; label: string; post: number | null; median: number | null; differencePct: number | null }>;
  /** How this post was classified, in plain words. */
  method: string;
}

export interface DiagnosisResponse {
  mediaId: string;
  analysisVersion: string;
  classification: DiagnosisClass;
  baseline: DiagnosisBaseline;
  result: DiagnosisResult;
  mediaBasis: string;
  model: string | null;
  analyzedAt: string;
  fromCache: boolean;
  stale: boolean;
  refreshError?: string;
}

const SYSTEM = `You are Media Navigator's content diagnosis engine: a senior strategist, content analyst and creative director.

You are given ONE real post: its actual media (the video file with its audio, the images or the carousel slides), its caption, its measured metrics and its comparison with the account's own earlier posts.

Non-negotiable rules:
- Actually inspect the content. For a Reel, examine the opening hook, the first visible frame, spoken words, on-screen text, scene transitions, pacing, visual changes, audio, storytelling, payoff and CTA. For a carousel, read every slide in order. For a static post, look at the image, its headline, its visual hierarchy and its CTA.
- If the actual creative asset is unavailable, do not fabricate visual observations; state what is missing. Never claim to have watched a video when only its cover or caption was available.
- Distinguish measured facts, observed content, calculated comparisons, hypotheses and missing data. Label the difference in your wording.
- Never invent metrics, retention, audience demographics, conversions, watch duration, slide-level performance or causal explanations.
- Never claim an observed weakness definitively caused low reach or low engagement unless the evidence supports causation.
- No generic advice ("use trending audio", "post at better times", "add more hashtags") unless it is tied to a specific observation or a specific measured gap.
- Every recommendation must name the actual text, visual, narrative or CTA that should change.
- Return JSON only.`;

const FORMAT_RULES = `Format rules:
- Reel / short / video: judge the opening seconds, scene sequence, pacing, spoken or on-screen message, payoff and CTA. Cite mm:ss only for a moment you actually saw or heard.
- Carousel: judge the first slide as the hook, then the progression, information density, consistency of the visual system and the final CTA. Only report slide-level performance when slide-level data was supplied.
- Static post: judge the image, headline, visual hierarchy, brand placement, clarity of the message and the CTA. Never claim to measure retention or watch time for a still image.`;

const TOP_RULES = `This post is a TOP PERFORMER against the account's own baseline. The reader wants to understand WHY IT WORKED.
- Do not lead with new scripts or replacement creative. Explain the success first. If a dimension is genuinely weak, say so honestly.
- Produce exactly six insights, in this order and with these keys: hook, relevance, visual, storytelling, engagement, signals. Their titles must be specific to this post, not category names.
- Each insight carries a signal judged only from its own evidence: positive (demonstrated strength or a clearly above-baseline result), mixed (uncertain, conflicting or incomplete evidence), negative (demonstrated weakness or a clearly below-baseline result), unknown (this dimension cannot be judged with the evidence available). Never colour an insight positive because the post as a whole did well.
- threeLine must be exactly three short lines: whatWorked (a content-specific observation about the hook, message, visual or narrative), performanceProof (the strongest available metric, its value and its comparison to the baseline), strategicTakeaway (what this result reveals about the content's effectiveness, with appropriate uncertainty).
- preserve lists the existing creative elements the team should keep repeating.`;

const BOTTOM_RULES = `This post is a BOTTOM PERFORMER against the account's own baseline. The reader needs a recovery plan, not a description.
- nextStep is the single most important issue, its practical implication and exactly what should change. Name the actual text, visual, narrative or CTA.
- alternatives are three genuinely different creative concepts, not minor rewrites of the same headline. Each one keeps the account's business context and niche but fixes a specific weakness. For a static post give the headline, key visual direction, message hierarchy and CTA. For a carousel give the opening slide and a coherent sequence of slide ideas, with the actual copy for the most important slides. For a Reel give a practical hook and a short scene-by-scene script with visual directions, on-screen text, voiceover where appropriate, a payoff and a CTA. Use timestamps only inside a script you are proposing.
- diagnostics are three to six reasons it may have under-performed, most important first, from these dimensions where relevant: hook and initial attention; message clarity and content relevance; visual quality and readability; storytelling, slide progression or pacing; audience engagement and value; CTA and conversion alignment; discoverability and topic clarity; distribution and measurement limits. Do not force all eight.
- Each diagnostic carries a signal from its own evidence: negative (strong evidence of a real weakness or a substantial below-baseline result), mixed (potential weakness or insufficient evidence), positive (this dimension performed well and is not a priority), unknown (cannot be evaluated with the available information). A metric being low does not by itself prove why it is low: keep the measured result and the suspected explanation apart.
- Each diagnostic names the improvement to make.`;

const INSUFFICIENT_RULES = `There is not enough of this account's own history to say whether this post is above or below the usual. Do not classify it, and do not describe it as a top or bottom performer.
- whatWorks: what can still be seen and said about this content, based on the media and the caption.
- mainOpportunity: what to publish more of to build the history needed for a real comparison.
- nextExperiment: the one thing to test next while the account builds up its history.
- Produce exactly six insights, in this order and with these keys: hook, relevance, visual, storytelling, engagement, signals, with the same signal rules as the top-performer brief.`;

const AVERAGE_RULES = `This post is an AVERAGE PERFORMER: around the account's own baseline, or showing mixed results. Do not force it into a success story or a failure story.
- whatWorks: the part that is genuinely working, named specifically.
- mainOpportunity: the single clearest opportunity, matched to the actual performance pattern. When reach is strong but engagement is weak, diagnose that pattern rather than calling the post unsuccessful. When engagement is strong but reach is low, separate the content-response signal from the distribution limit.
- nextExperiment: the single most useful change to test next.
- Produce exactly six insights, in this order and with these keys: hook, relevance, visual, storytelling, engagement, signals, with the same signal rules as the top-performer brief.`;

function buildPrompt(cls: DiagnosisClass, evidence: PostEvidence, baseline: DiagnosisBaseline, mediaAttached: string, format: string): string {
  const metrics = evidence.metrics.items.map((m) => ({ key: m.key, label: m.label, value: m.available ? m.value : 'not available', unit: m.unit, ...(m.note ? { note: m.note } : {}) }));
  const evidenceJson = {
    post: { platform: evidence.item.platform, format: evidence.item.contentType, publishedAt: evidence.item.publishedAt, ageDays: evidence.comparison.ageDays, durationSeconds: evidence.media.durationSeconds, caption: (evidence.item.caption || evidence.item.title || '').slice(0, 2200) },
    mediaAttached,
    mediaNotes: evidence.media.notes,
    metrics,
    comparisonWithEarlierPosts: evidence.comparison,
    classification: { result: cls, baseline },
  };
  const rules = cls === 'TOP' ? TOP_RULES : cls === 'BOTTOM' ? BOTTOM_RULES : cls === 'AVERAGE' ? AVERAGE_RULES : INSUFFICIENT_RULES;
  const shape = cls === 'TOP'
    ? `{ "summary": "...", "threeLine": { "whatWorked": "...", "performanceProof": "...", "strategicTakeaway": "..." }, "insights": [ { "key": "hook|relevance|visual|storytelling|engagement|signals", "title": "short specific title", "signal": "positive|mixed|negative|unknown", "observation": "what was actually seen or measured", "evidence": "the supporting observation or number", "whyItMatters": "why this matters to this post", "metric": "the metric and its comparison, or null", "confidence": "high|medium|low" } x6 ], "preserve": ["what to keep repeating"], "limitations": ["..."], "confidence": { "level": "high|medium|low", "reason": "why" } }`
    : cls === 'BOTTOM'
      ? `{ "summary": "...", "nextStep": { "headline": "the most important issue", "body": "what it means and exactly what to change" }, "alternatives": [ { "title": "...", "angle": "...", "hook": "the actual opening line or headline", "execution": "what the post should contain", "cta": "..." , "whyItMayWorkBetter": "..." } x3 ], "diagnostics": [ { "title": "...", "signal": "negative|mixed|positive|unknown", "observation": "what was observed", "metric": "the metric, or null", "impact": "why it may matter", "improvement": "the specific change" } ], "limitations": ["..."], "confidence": { "level": "high|medium|low", "reason": "why" } }`
      : `{ "summary": "...", "whatWorks": "...", "mainOpportunity": "...", "nextExperiment": "...", "insights": [ { "key": "hook|relevance|visual|storytelling|engagement|signals", "title": "short specific title", "signal": "positive|mixed|negative|unknown", "observation": "...", "evidence": "...", "whyItMatters": "...", "metric": "..." , "confidence": "high|medium|low" } x6 ], "limitations": ["..."], "confidence": { "level": "high|medium|low", "reason": "why" } }`;
  return `${rules}

${FORMAT_RULES}

EVIDENCE (JSON):
${JSON.stringify(evidenceJson, null, 2)}

Return JSON in exactly this shape:
${shape}`;
}

type AccountMedia = Array<{ platform: string; engagementRate: number; views: number }>;

/** The account's own baseline for this post's platform, and the comparison rows the reader sees. */
function baselineFor(evidence: PostEvidence, ctx: { media: AccountMedia }, cls: DiagnosisClass): DiagnosisBaseline {
  const samePlatform = ctx.media.filter((m) => m.platform === evidence.item.platform);
  const baseline: Baseline = buildBaseline(samePlatform as Parameters<typeof buildBaseline>[0]);
  return {
    sampleSize: baseline.sampleSize,
    medianEngagementRate: baseline.medianEngagementRate,
    p25EngagementRate: baseline.p25EngagementRate,
    p75EngagementRate: baseline.p75EngagementRate,
    medianViews: baseline.medianViews,
    rows: evidence.comparison.rows,
    method: cls === 'INSUFFICIENT_DATA'
      ? `Not enough history on ${evidence.item.platform} yet (${baseline.sampleSize} posts, ${MIN_HISTORY_FOR_CLASSIFICATION} needed), so this post is not classified.`
      : `Measured against this account's own ${evidence.item.platform} history (${baseline.sampleSize} posts): engagement at or above the 75th percentile and 1.25x the median is a top performer; at or below the 25th percentile and 0.75x the median is a bottom performer.`,
  };
}

/** The classification comes from the account's own history, never from the model. */
function classifyFor(evidence: PostEvidence, ctx: { media: AccountMedia }): DiagnosisClass {
  const samePlatform = ctx.media.filter((m) => m.platform === evidence.item.platform);
  const baseline = buildBaseline(samePlatform as Parameters<typeof buildBaseline>[0]);
  const cls = classify({ engagementRate: evidence.item.engagementRate }, baseline);
  if (cls === 'TYPICAL') return 'AVERAGE';
  if (cls === 'LOW') return 'BOTTOM';
  return cls;
}

function mediaAttachedText(evidence: PostEvidence): string {
  const media = evidence.media;
  if (media.basis === 'full_video') return `The complete video file with its audio track is attached${media.durationSeconds ? ` (${media.durationSeconds} seconds long)` : ''}. Watch the whole timeline, every scene change and the ending.`;
  if (media.basis === 'youtube_video') return 'The public YouTube video is attached by URL. Watch the whole timeline, including audio.';
  if (media.basis === 'image') return 'The full image is attached.';
  if (media.basis === 'carousel') return `The carousel is attached in order as ${media.images.length} image slide(s) and ${media.videos.length} video slide(s); each is preceded by its label.`;
  if (media.basis === 'none') return 'NO media is attached. Analyse only the caption and measured metrics. Do not make any visual or audio claims.';
  return 'ONLY the cover image is attached. You cannot see motion, audio or later scenes. Do not treat the cover as the opening frame.';
}

/** The format-specific rule that matches this post's content type. */
function formatRules(contentType: string): string {
  if (contentType === 'carousel') return 'This is a carousel. Judge the slides in order.';
  if (['reel', 'short', 'video'].includes(contentType)) return 'This is a video. Judge the timeline, audio and text overlays.';
  return 'This is a static post. Judge the image, headline and CTA.';
}

/** Frames per second for the model to sample: denser for short reels so quick cuts are not missed. */
function fpsFor(duration: number | null): number | undefined {
  if (!duration) return undefined;
  if (duration <= 30) return 3;
  if (duration <= 90) return 2;
  return undefined;
}

export function diagnosisFailureMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof AiUnavailableError) return 'AI analysis is not configured on this server.';
  if (err instanceof AiFailedError) {
    if (err.reason === 'timeout') return 'The analysis took too long. Please try again.';
    if (err.reason === 'invalid_response') return 'The AI returned an incomplete analysis. Please try again.';
    return err.message || 'The AI service could not complete the analysis. Please try again.';
  }
  if (err instanceof Error) return err.message || 'The analysis could not be completed.';
  return 'The analysis could not be completed.';
}

async function generateDiagnosis(evidence: PostEvidence, cls: DiagnosisClass, baseline: DiagnosisBaseline): Promise<{ result: DiagnosisResult; model: string; basis: string }> {
  const schema = (cls === 'TOP' ? topSchema : cls === 'BOTTOM' ? bottomSchema : cls === 'AVERAGE' ? averageSchema : insufficientSchema) as unknown as z.ZodType<DiagnosisResult, z.ZodTypeDef, unknown>;
  const prompt = buildPrompt(cls, evidence, baseline, mediaAttachedText(evidence), formatRules(evidence.item.contentType));

  let model = aiModel() ?? 'gemini';
  const call = async (correction?: string): Promise<DiagnosisResult> => {
    const parts: Part[] = [{ text: prompt + (correction ? `\n\nIMPORTANT: ${correction}` : '') }];
    const uploaded: string[] = [];
    try {
      for (const v of evidence.media.videos) {
        const f = await uploadVideo(v.bytes, v.mimeType, config.ai.contentAnalysis.timeoutMs);
        uploaded.push(f.name);
        if (evidence.media.basis === 'carousel') parts.push({ text: `[${v.label}]` });
        const fps = fpsFor(v.durationSeconds);
        const videoMetadata: Record<string, unknown> = {};
        if (fps) videoMetadata.fps = fps;
        parts.push({ ...createPartFromUri(f.uri, f.mimeType), ...(Object.keys(videoMetadata).length ? { videoMetadata } : {}) });
      }
      if (evidence.media.youtubeUrl) {
        const videoMetadata: Record<string, unknown> = {};
        parts.push({ fileData: { fileUri: evidence.media.youtubeUrl }, ...(Object.keys(videoMetadata).length ? { videoMetadata } : {}) });
      }
      for (const img of evidence.media.images) {
        if (evidence.media.basis === 'carousel') parts.push({ text: `[${img.label}]` });
        parts.push(createPartFromBase64(img.data, img.mimeType));
      }
      const res = await generateMultimodalJson({ system: SYSTEM, parts, schema, timeoutMs: config.ai.contentAnalysis.timeoutMs });
      model = res.model;
      return res.data;
    } finally {
      for (const name of uploaded) await deleteUploaded(name);
    }
  };

  let out: DiagnosisResult;
  try {
    out = await call();
  } catch (err) {
    if (err instanceof AiFailedError && err.reason === 'invalid_response') {
      out = await call('Your previous answer did not match the required JSON. Return exactly the requested shape with every required field.');
    } else {
      throw err;
    }
  }
  return { result: out, model, basis: evidence.media.basis };
}

// One generation per (user, post) at a time: repeated taps share the same promise.
const inFlight = new Map<string, Promise<DiagnosisResponse>>();

function toResponse(doc: ContentAnalysisDoc, classification: DiagnosisClass, baseline: DiagnosisBaseline, fromCache: boolean, stale: boolean, refreshError?: string): DiagnosisResponse {
  return {
    mediaId: doc.mediaId,
    analysisVersion: doc.analysisVersion,
    classification,
    baseline,
    result: doc.result as DiagnosisResult,
    mediaBasis: doc.mediaBasis ?? 'none',
    model: doc.model,
    analyzedAt: (doc.analyzedAt ?? doc.updatedAt).toISOString(),
    fromCache,
    stale,
    ...(refreshError ? { refreshError } : {}),
  };
}

export const diagnosisService = {
  /**
   * Analyses one post against the account's own baseline and returns the experience that matches its
   * performance: insights first for a top performer, a recovery plan for a bottom one.
   */
  async analyze(userId: string, mediaId: string, opts: { reanalyze?: boolean } = {}): Promise<DiagnosisResponse> {
    if (!aiAvailable()) throw unavailable('AI analysis is not configured on this server.');
    const uid = toObjectId(userId);
    const doc = await mediaRepository.findByIdOrLegacy(uid, mediaId);
    if (!doc) throw notFound('Media not found');

    const ctx = await loadAnalyticsContext(uid);
    const evidence = await gatherPostEvidence(uid, mediaId);
    const cls = classifyFor(evidence, ctx);
    const baseline = baselineFor(evidence, ctx, cls);

    const saved = await ContentAnalysis.findOne({ userId: uid, mediaId, analysisType: 'diagnosis', analysisVersion: DIAGNOSIS_VERSION }).lean<ContentAnalysisDoc>();
    const ageHours = saved?.analyzedAt ? (Date.now() - saved.analyzedAt.getTime()) / 3_600_000 : Infinity;
    const stale = Boolean(saved?.result) && ageHours > config.ai.contentAnalysis.staleHours;
    if (saved?.result && !stale && !opts.reanalyze) return toResponse(saved, cls, baseline, true, false);

    const flightKey = `${userId}:${mediaId}`;
    const running = inFlight.get(flightKey);
    if (running) return running;

    const job = (async () => {
      try {
        const generated = await generateDiagnosis(evidence, cls, baseline);
        const updated = await ContentAnalysis.findOneAndUpdate(
          { userId: uid, mediaId, analysisType: 'diagnosis', analysisVersion: DIAGNOSIS_VERSION },
          {
            $set: {
              platform: evidence.item.platform, contentType: evidence.item.contentType,
              result: generated.result, metrics: evidence.metrics, comparison: evidence.comparison,
              mediaBasis: generated.basis, model: generated.model, analyzedAt: new Date(), lastError: null, lastErrorAt: null,
            },
            $inc: { attempts: 1 },
          },
          { upsert: true, new: true, lean: true },
        );
        return toResponse(updated as ContentAnalysisDoc, cls, baseline, false, false);
      } catch (err) {
        const message = diagnosisFailureMessage(err);
        await ContentAnalysis.updateOne(
          { userId: uid, mediaId, analysisType: 'diagnosis', analysisVersion: DIAGNOSIS_VERSION },
          { $set: { platform: evidence.item.platform, contentType: evidence.item.contentType, lastError: message, lastErrorAt: new Date() }, $inc: { attempts: 1 } },
          { upsert: true },
        );
        if (saved?.result) return toResponse(saved, cls, baseline, true, true, message);
        if (err instanceof AppError) throw err;
        logger.warn('diagnosis failed', { operation: 'diagnosis', mediaId, error: err });
        throw unavailable(message);
      } finally {
        inFlight.delete(flightKey);
      }
    })();
    inFlight.set(flightKey, job);
    return job;
  },

  /** Saved diagnosis only (no generation). */
  async get(userId: string, mediaId: string): Promise<DiagnosisResponse | null> {
    const uid = toObjectId(userId);
    const doc = await mediaRepository.findByIdOrLegacy(uid, mediaId);
    if (!doc) throw notFound('Media not found');
    const saved = await ContentAnalysis.findOne({ userId: uid, mediaId, analysisType: 'diagnosis', analysisVersion: DIAGNOSIS_VERSION }).lean<ContentAnalysisDoc>();
    if (!saved?.result) return null;
    const ctx = await loadAnalyticsContext(uid);
    const evidence = await gatherPostEvidence(uid, mediaId);
    const cls = classifyFor(evidence, ctx);
    const baseline = baselineFor(evidence, ctx, cls);
    const ageHours = saved.analyzedAt ? (Date.now() - saved.analyzedAt.getTime()) / 3_600_000 : Infinity;
    const stale = ageHours > config.ai.contentAnalysis.staleHours;
    return toResponse(saved, cls, baseline, true, stale);
  },
};
