import { createPartFromBase64, createPartFromUri, type Part } from '@google/genai';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { AppError, mediaUnavailable, notFound, unavailable } from '../../lib/errors.js';
import { toObjectId } from '../../lib/ids.js';
import { logger } from '../../lib/logger.js';
import { toNormalized } from '../../integrations/mapper.js';
import { ContentAnalysis, type ContentAnalysisDoc, type ContentAnalysisType } from '../../models/ContentAnalysis.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { loadAnalyticsContext } from '../analytics.service.js';
import { readCredentials } from '../sync.service.js';
import { collectMedia, compare, derivedMetrics, evidenceHash, fetchInstagramLive, syncedMetrics, type Comparison, type MediaEvidence, type MetricsSnapshot, type MetricValue } from './contentEvidence.js';
import { AiFailedError, AiUnavailableError, aiAvailable, deleteUploaded, generateMultimodalJson, uploadVideo } from './geminiClient.js';

/** Bump when the prompt, evidence rules or output schema change: older saved analyses are then regenerated. */
export const CONTENT_ANALYSIS_VERSION = 'content-v3';

const TITLES: Record<ContentAnalysisType, string[]> = {
  deep: ['Scene-by-scene understanding', 'Hook and storytelling', 'Visual and audio techniques', 'Audience appeal', 'Performance evidence', 'Distribution insights and improvements'],
  why_top: ['Actual content strengths', 'Hook and retention potential', 'Creative strategy', 'Audience response', 'Performance and discoverability', 'Repeatable success'],
  why_bottom: ['Performance gap', 'Visual content and hook', 'Retention and pacing', 'Audience response', 'Discoverability and content fit', 'Prioritized recovery plan'],
};

const GUIDE: Record<ContentAnalysisType, string[]> = {
  deep: [
    'Walk through the content in order. For a video, cite at least 3 distinct moments with mm:ss timestamps from the beginning, the middle and the end: locations, subjects, actions, scenery, camera movement, transitions and visual details actually shown. For images and slides: what each one shows.',
    'The opening (first seconds or first frame), how the piece progresses, its pacing, narrative and payoff, and the specific moments that may hold or lose attention. Measured retention only if it is in the metrics.',
    'Composition, lighting, colours, editing rhythm, transitions, music, dialogue, sound effects, text overlays and the creative format actually used. Call a sound or format "trending" only if the evidence proves it.',
    'Why this specific content may be interesting, emotional, useful, entertaining or shareable, tied to named scenes or moments (not generic praise).',
    'Connect the observed content to the real metrics provided (views, reach, saves, shares, comments, watch time, profile actions) and to the comparison with earlier posts. Only use metrics marked available.',
    'Plausible reasons for the observed performance (clearly labelled as hypotheses), the evidence gaps, and specific improvements or repeatable creative strengths, ending with one concrete next action.',
  ],
  why_top: [
    'The specific scenes, subjects, moments and visual choices that distinguish this content, with mm:ss timestamps for a video (at least 3, from beginning, middle and end).',
    'The actual opening, pacing, scene changes and payoff. Measured retention only if present in the metrics.',
    'The storytelling, audio, editing, on-screen text and creative format observed, and how they may work for viewers.',
    'Connect what is in the content to the measured saves, shares, comments, watch time, profile actions and other available signals.',
    'Compare the real metrics with comparable posts (comparison rows) and give supported reasons for the relative performance; say when the sample is small or the post is young. High views alone do not explain success.',
    'The strongest evidence-supported creative elements and one specific follow-up post or experiment to test whether the success repeats.',
  ],
  why_bottom: [
    'Quantify the gap against comparable posts using the comparison rows; say if the post is young, the sample is small, or the gap is within normal variation.',
    'Observable weaknesses in the opening, subject clarity, framing, visual appeal or context, with mm:ss timestamps for a video (at least 3, from beginning, middle and end).',
    'Whether structure, length, pacing, scene progression or ending may create friction. Do not assert drop-off points without retention data.',
    'Interactions relative to reach, saves, shares, comments, profile activity and other available signals. A low-reach post can still do well among the people it reached.',
    'Caption, topic clarity, keywords, hashtags, audience fit and format mismatch, without claiming they caused low distribution.',
    'The three most useful changes to test, ranked by expected value, each with the metric that should improve if it works. State whether this looks like a content problem, a distribution problem, insufficient data or normal variation.',
  ],
};

const SYSTEM = `You are Media Navigator's content analyst. You analyse ONE specific social media post from the evidence supplied: the attached media itself (video with its audio, images or carousel slides), its caption, and the measured metrics and comparison provided as JSON.

Rules you must follow:
- Watch/look at the attached media first. The first points must be about what is actually in it, not about the numbers.
- Analyse this exact post, not a generic example of its category.
- Never invent scenes, people, places, objects, dialogue, audio, timestamps, trends, clicks or metrics.
- Only cite a timestamp for something you actually saw or heard at that moment of the attached video. Use mm:ss.
- When only a cover image was attached, you saw one still image: do not describe motion, audio or later scenes.
- Never present a hypothesis as fact. Never claim to know Instagram's private ranking or why it recommended a post. Correlation is not causation.
- Use the exact numbers provided; only use metrics marked available.
- Each of the six points answers its own question; do not repeat the same idea across points.
- No generic statements ("engaging", "attractive", "use trending music", "post consistently") unless tied to a specific observation or measured gap.
- Be concise and specific. Plain English. No numerical confidence percentages.
Return JSON only.`;

// Long or over-full fields are trimmed rather than rejected; the six-point structure itself is strict.
const text = (max: number) => z.string().min(1).transform((v) => v.slice(0, max));
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.array(item).transform((a) => a.slice(0, max));
const level = z.string().transform((v) => v.toLowerCase()).pipe(z.enum(['high', 'medium', 'low']));
const evidenceSchema = z.object({
  source: z.enum(['video_frame', 'audio', 'on_screen_text', 'image', 'caption', 'metric', 'comparison']),
  timestamp: z.string().max(12).nullable().optional(),
  description: text(400),
});
const pointSchema = z.object({
  number: z.number().int().min(1).max(6),
  title: z.string().optional(),
  observations: list(text(400), 5).pipe(z.array(z.string()).min(1)),
  evidence: list(evidenceSchema, 8).default([]),
  metricKeys: list(z.string().max(40), 8).default([]),
  interpretation: text(900),
  confidence: level,
});
const outputSchema = z.object({
  summary: text(600),
  /** What the model heard in the attached video. */
  audio: z.enum(['speech', 'music', 'speech_and_music', 'sound_effects', 'silent', 'not_applicable']).catch('not_applicable'),
  points: z.array(pointSchema).length(6),
  limitations: list(text(400), 8).default([]),
  recommendations: list(text(400), 5).default([]),
  confidence: z.object({ level, reason: text(400) }),
});
type ModelOutput = z.infer<typeof outputSchema>;

export interface EvidenceSummary {
  /** What the model actually received. */
  visual: MediaEvidence['basis'];
  videos: number;
  images: number;
  /** Timestamped moments the analysis cites from the video. */
  momentsCited: number;
  /** Whether the cited moments span the beginning, middle and end of the video. */
  coversTimeline: boolean;
  durationSeconds: number | null;
  audio: ModelOutput['audio'];
  metricsAvailable: number;
  caption: boolean;
}

export type ContentAnalysisResult = Omit<ModelOutput, 'audio'> & { evidence: EvidenceSummary };

const VIDEO_BASIS = new Set(['full_video', 'youtube_video']);
const VIDEO_TYPES = new Set(['reel', 'short', 'video']);
const TIMESTAMP = /^\d{1,2}:\d{2}(:\d{2})?$/;
const seconds = (t: string) => t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);

function moments(out: ModelOutput): number[] {
  return [...new Set(out.points.flatMap((p) => p.evidence).filter((e) => (e.source === 'video_frame' || e.source === 'audio') && e.timestamp && TIMESTAMP.test(e.timestamp)).map((e) => seconds(e.timestamp!)))].sort((a, b) => a - b);
}

/** True when cited moments include the beginning, middle and end (or, with unknown length, 3+ distinct moments). */
function coversTimeline(times: number[], duration: number | null): boolean {
  if (times.length < 3) return false;
  if (!duration || duration < 6) return true;
  return times.some((t) => t <= duration * 0.25) && times.some((t) => t >= duration * 0.3 && t <= duration * 0.7) && times.some((t) => t >= duration * 0.75);
}

/** Enforces what the model may claim given the evidence it actually had; anything else is removed and disclosed. */
function sanitize(out: ModelOutput, type: ContentAnalysisType, basis: string, metrics: MetricValue[], duration: number | null): ModelOutput {
  if (out.points.map((p) => p.number).sort().join(',') !== '1,2,3,4,5,6') throw new AiFailedError('The analysis did not contain points 1 to 6', 'invalid_response');
  const available = new Set(metrics.filter((m) => m.available).map((m) => m.key));
  const videoAllowed = VIDEO_BASIS.has(basis) || basis === 'carousel';
  let removed = 0;
  const points = [...out.points]
    .sort((a, b) => a.number - b.number)
    .map((p, i) => ({
      ...p,
      title: TITLES[type][i],
      metricKeys: p.metricKeys.filter((k) => available.has(k)),
      evidence: p.evidence.filter((e) => {
        const fromVideo = e.source === 'video_frame' || e.source === 'audio';
        const ok =
          (!fromVideo || videoAllowed) &&
          (e.source !== 'on_screen_text' || basis !== 'none') &&
          (!e.timestamp || (videoAllowed && TIMESTAMP.test(e.timestamp) && (duration === null || seconds(e.timestamp) <= duration + 1)));
        if (!ok) removed += 1;
        return ok;
      }),
    }));
  const limitations = [...out.limitations];
  if (removed) limitations.push(`${removed} evidence reference(s) were removed because they referred to media or moments the analysis did not have.`);
  return { ...out, points, limitations };
}

function promptText(type: ContentAnalysisType, item: ReturnType<typeof toNormalized>, metrics: MetricsSnapshot, comparison: Comparison, media: MediaEvidence, listContext: string | null): string {
  const attached =
    media.basis === 'full_video' ? `The complete video file with its audio track is attached${media.durationSeconds ? ` (${media.durationSeconds} seconds long)` : ''}. Watch the whole timeline, every scene change and the ending.`
      : media.basis === 'youtube_video' ? 'The public YouTube video is attached by URL. Watch the whole timeline, including audio.'
        : media.basis === 'image' ? 'The full image is attached.'
          : media.basis === 'carousel' ? `The carousel is attached in order as ${media.images.length} image slide(s) and ${media.videos.length} video slide(s); each is preceded by its label.`
            : 'ONLY the cover image is attached. You cannot see motion, audio or later scenes.';
  const evidence = {
    post: { platform: item.platform, format: item.contentType, publishedAt: item.publishedAt, ageDays: comparison.ageDays, durationSeconds: media.durationSeconds, caption: (item.caption || item.title || '').slice(0, 2200) },
    mediaAttached: attached,
    mediaNotes: media.notes,
    metrics: metrics.items.map((m) => ({ key: m.key, label: m.label, value: m.available ? m.value : 'not available', unit: m.unit, ...(m.note ? { note: m.note } : {}) })),
    comparisonWithEarlierPosts: comparison,
    ...(listContext ? { ranking: listContext } : {}),
  };
  const titles = TITLES[type];
  return `${type === 'deep' ? 'Deep analysis of this post' : type === 'why_top' ? 'Why is this post among the top performers?' : 'Why is this post among the posts that need attention?'}

EVIDENCE (JSON):
${JSON.stringify(evidence, null, 2)}

Write exactly six points, in this order:
${titles.map((t, i) => `${i + 1}. ${t}: ${GUIDE[type][i]}`).join('\n')}

JSON shape:
{
  "summary": "one or two sentences: the strongest evidence-based conclusion about this content and its performance",
  "audio": "speech | music | speech_and_music | sound_effects | silent | not_applicable",
  "points": [
    { "number": 1, "title": "${titles[0]}", "observations": ["specific findings for this post"], "evidence": [{ "source": "video_frame|audio|on_screen_text|image|caption|metric|comparison", "timestamp": "mm:ss or null", "description": "what is actually present" }], "metricKeys": ["keys from the metrics list that support this point"], "interpretation": "what it means, labelled as observed / measured / hypothesis", "confidence": "high|medium|low" }
    ... exactly 6 points, numbered 1 to 6 ...
  ],
  "limitations": ["evidence that was missing or could not be analysed"],
  "recommendations": ["up to 5 actions, each tied to a specific finding"],
  "confidence": { "level": "high|medium|low", "reason": "why" }
}`;
}

/** Frames per second for the model to sample: denser for short reels so quick cuts are not missed. */
function fpsFor(duration: number | null): number | undefined {
  if (!duration) return undefined; // provider default (1 fps)
  if (duration <= 30) return 3;
  if (duration <= 90) return 2;
  return undefined;
}

export interface ContentAnalysisResponse {
  mediaId: string;
  analysisType: ContentAnalysisType;
  analysisVersion: string;
  result: ContentAnalysisResult;
  metrics: MetricsSnapshot;
  comparison: Comparison;
  mediaBasis: string;
  model: string | null;
  analyzedAt: string;
  /** true when this result was saved earlier and returned without calling the model. */
  fromCache: boolean;
  /** true when the post's data changed materially or the result is older than the stale window. */
  stale: boolean;
  /** Set when a refresh was attempted and failed; the previous valid result is returned. */
  refreshError?: string;
}

function toResponse(doc: ContentAnalysisDoc, fromCache: boolean, stale: boolean, refreshError?: string): ContentAnalysisResponse {
  return {
    mediaId: doc.mediaId,
    analysisType: doc.analysisType,
    analysisVersion: doc.analysisVersion,
    result: doc.result as ContentAnalysisResult,
    metrics: doc.metrics as MetricsSnapshot,
    comparison: doc.comparison as Comparison,
    mediaBasis: doc.mediaBasis ?? 'none',
    model: doc.model,
    analyzedAt: (doc.analyzedAt ?? doc.updatedAt).toISOString(),
    fromCache,
    stale,
    ...(refreshError ? { refreshError } : {}),
  };
}

// One generation per (user, post, type) at a time: repeated taps share the same promise.
const inFlight = new Map<string, Promise<ContentAnalysisResponse>>();

async function generate(userId: string, mediaId: string, type: ContentAnalysisType, listContext: string | null) {
  const uid = toObjectId(userId);
  const doc = await mediaRepository.findByLegacyId(uid, mediaId);
  if (!doc) throw notFound('Media not found');
  const item = toNormalized(doc);
  const ctx = await loadAnalyticsContext(uid);
  const account = await connectionRepository.findByIdWithCredentials(doc.connectedAccountId);

  // 1. Measured numbers: live from Instagram when possible, otherwise the last sync.
  let metricItems: MetricValue[] = syncedMetrics(item);
  let live = null;
  let liveError: string | null = null;
  if (item.platform === 'instagram') {
    if (!account?.credentialsEnc) liveError = 'the Instagram connection has no stored access';
    else {
      try {
        const r = await fetchInstagramLive(readCredentials(account), doc.providerMediaId);
        live = r.live;
        liveError = r.liveError;
        if (r.metrics.length) metricItems = r.metrics;
      } catch (err) {
        liveError = 'Instagram could not be reached';
        logger.warn('content analysis live instagram fetch failed', { operation: 'content-analysis', error: err });
      }
    }
  }
  const metrics: MetricsSnapshot = { collectedAt: new Date().toISOString(), items: [...metricItems, ...derivedMetrics(metricItems)] };
  const comparison = compare(item, ctx.media, metricItems);

  // 2. The post's own media, fetched automatically. Without real visual evidence there is no content analysis.
  const media = await collectMedia(item, live, liveError);
  // Instagram's live media type decides whether this is a video; the synced format is the fallback.
  const videoPost = live ? live.mediaType === 'VIDEO' : VIDEO_TYPES.has(item.contentType);
  if (media.basis === 'none' || (videoPost && !VIDEO_BASIS.has(media.basis))) {
    throw mediaUnavailable(media.failure ?? 'The post’s media could not be obtained, so its content cannot be analyzed.');
  }

  // 3. Model call over text + media. An invalid answer, or a video answer that does not cover the
  //    beginning, middle and end, is asked for once more with the problem spelled out.
  const call = async (correction?: string) => {
    const parts: Part[] = [{ text: promptText(type, item, metrics, comparison, media, listContext) + (correction ? `\n\nIMPORTANT: ${correction}` : '') }];
    const uploaded: string[] = [];
    try {
      for (const v of media.videos) {
        const f = await uploadVideo(v.bytes, v.mimeType, config.ai.contentAnalysis.timeoutMs);
        uploaded.push(f.name);
        if (media.basis === 'carousel') parts.push({ text: `[${v.label}]` });
        const fps = fpsFor(v.durationSeconds);
        parts.push({ ...createPartFromUri(f.uri, f.mimeType), ...(fps ? { videoMetadata: { fps } } : {}) });
      }
      if (media.youtubeUrl) parts.push({ fileData: { fileUri: media.youtubeUrl } });
      for (const img of media.images) {
        if (media.basis === 'carousel') parts.push({ text: `[${img.label}]` });
        parts.push(createPartFromBase64(img.data, img.mimeType));
      }
      return await generateMultimodalJson({ system: SYSTEM, parts, schema: outputSchema, timeoutMs: config.ai.contentAnalysis.timeoutMs });
    } finally {
      for (const name of uploaded) await deleteUploaded(name);
    }
  };

  let out;
  try {
    out = await call();
  } catch (err) {
    if (!(err instanceof AiFailedError) || err.reason !== 'invalid_response') throw err;
    out = await call('Your previous answer did not match the required JSON. Return exactly six points numbered 1 to 6 with every required field.');
  }
  const isVideo = VIDEO_BASIS.has(media.basis);
  if (isVideo && !coversTimeline(moments(out.data), media.durationSeconds)) {
    try {
      const again = await call(`You were given the complete video${media.durationSeconds ? ` (${media.durationSeconds}s)` : ''}. Watch it from start to end and cite at least 3 distinct moments as video_frame or audio evidence with mm:ss timestamps: one near the beginning, one in the middle and one near the end. Base points 1 to 3 on what happens in the video, not on the numbers.`);
      if (moments(again.data).length > moments(out.data).length) out = again;
    } catch (err) {
      logger.warn('content analysis video retry failed', { operation: 'content-analysis', error: err });
    }
  }

  const clean = sanitize(out.data, type, media.basis, metrics.items, media.durationSeconds);
  const times = moments(clean);
  const covers = isVideo ? coversTimeline(times, media.durationSeconds) : false;
  if (isVideo && !covers) clean.limitations.push('The analysis does not cite moments from the beginning, middle and end of the video, so its scene coverage may be partial.');
  if (media.notes.length) clean.limitations = [...new Set([...media.notes, ...clean.limitations])];
  const { audio, ...rest } = clean;
  const result: ContentAnalysisResult = {
    ...rest,
    evidence: {
      visual: media.basis,
      videos: media.videos.length + (media.youtubeUrl ? 1 : 0),
      images: media.images.length,
      momentsCited: times.length,
      coversTimeline: covers,
      durationSeconds: media.durationSeconds,
      audio: isVideo || media.videos.length ? audio : 'not_applicable',
      metricsAvailable: metrics.items.filter((m) => m.available && m.source !== 'derived').length,
      caption: Boolean(item.caption),
    },
  };
  return { result, metrics, comparison, basis: media.basis, model: out.model, contentType: item.contentType };
}

function failureMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof AiUnavailableError) return 'AI analysis is not configured on this server.';
  if (err instanceof AiFailedError) {
    if (err.reason === 'timeout') return 'The analysis took too long. Please try again.';
    if (err.reason === 'invalid_response') return 'The AI returned an incomplete analysis. Please try again.';
    return 'The AI service could not complete the analysis. Please try again.';
  }
  return 'The analysis could not be completed.';
}

export const contentAnalysisService = {
  /**
   * Returns the saved analysis for (user, post, type) when it is still valid; otherwise (or on
   * `reanalyze`) fetches the post's media automatically and generates a new one. A failed refresh
   * never replaces a valid saved result.
   */
  async analyze(userId: string, mediaId: string, type: ContentAnalysisType, opts: { reanalyze?: boolean; rank?: string | null } = {}): Promise<ContentAnalysisResponse> {
    if (!aiAvailable()) throw unavailable('AI analysis is not configured on this server (GEMINI_API_KEY / GEMINI_MODEL).');
    const uid = toObjectId(userId);
    const doc = await mediaRepository.findByLegacyId(uid, mediaId);
    if (!doc) throw notFound('Media not found');
    const item = toNormalized(doc);
    const hash = evidenceHash(item, CONTENT_ANALYSIS_VERSION);
    const key = { userId: uid, mediaId, analysisType: type, analysisVersion: CONTENT_ANALYSIS_VERSION };
    const saved = await ContentAnalysis.findOne(key).lean<ContentAnalysisDoc>();
    const ageHours = saved?.analyzedAt ? (Date.now() - saved.analyzedAt.getTime()) / 3_600_000 : Infinity;
    const stale = Boolean(saved?.result) && (saved!.evidenceHash !== hash || ageHours > config.ai.contentAnalysis.staleHours);

    if (saved?.result && !stale && !opts.reanalyze) return toResponse(saved, true, false);

    const flightKey = `${userId}:${mediaId}:${type}`;
    const running = inFlight.get(flightKey);
    if (running) return running;

    const listContext = type === 'deep' ? null : `This post is in the account's ${type === 'why_top' ? 'top-performing' : 'needs-attention'} list${opts.rank ? ` (${opts.rank})` : ''}.`;
    const job = (async () => {
      try {
        const g = await generate(userId, mediaId, type, listContext);
        const updated = await ContentAnalysis.findOneAndUpdate(
          key,
          {
            $set: { platform: item.platform, contentType: g.contentType, evidenceHash: hash, result: g.result, metrics: g.metrics, comparison: g.comparison, mediaBasis: g.basis, model: g.model, analyzedAt: new Date(), lastError: null, lastErrorAt: null },
            $inc: { attempts: 1 },
          },
          { upsert: true, new: true, lean: true },
        );
        return toResponse(updated as ContentAnalysisDoc, false, false);
      } catch (err) {
        const message = failureMessage(err);
        await ContentAnalysis.updateOne(key, { $set: { platform: item.platform, contentType: item.contentType, lastError: message, lastErrorAt: new Date() }, $inc: { attempts: 1 } }, { upsert: true });
        if (saved?.result) return toResponse(saved, true, true, message);
        if (err instanceof AppError) throw err;
        throw unavailable(message);
      } finally {
        inFlight.delete(flightKey);
      }
    })();
    inFlight.set(flightKey, job);
    return job;
  },

  /** Saved result only (no generation). */
  async get(userId: string, mediaId: string, type: ContentAnalysisType): Promise<ContentAnalysisResponse | null> {
    const uid = toObjectId(userId);
    const doc = await mediaRepository.findByLegacyId(uid, mediaId);
    if (!doc) throw notFound('Media not found');
    const saved = await ContentAnalysis.findOne({ userId: uid, mediaId, analysisType: type, analysisVersion: CONTENT_ANALYSIS_VERSION }).lean<ContentAnalysisDoc>();
    if (!saved?.result) return null;
    const ageHours = saved.analyzedAt ? (Date.now() - saved.analyzedAt.getTime()) / 3_600_000 : Infinity;
    const stale = saved.evidenceHash !== evidenceHash(toNormalized(doc), CONTENT_ANALYSIS_VERSION) || ageHours > config.ai.contentAnalysis.staleHours;
    return toResponse(saved, true, stale);
  },
};
