import { createPartFromBase64, createPartFromUri, type Part } from '@google/genai';
import type { DeepAnalysisV2, DeepSource } from '../../../../shared/deepAnalysisV2.js';
import { DEEP_CATEGORIES } from '../../../../shared/deepAnalysisV2.js';
import type { ContentItemDoc } from '../../models/ContentItem.js';
import { config } from '../../config/env.js';
import { collectDeepV2Media } from './deepV2.media.js';
import { EXTRACT } from './deepV2.prompts.js';
import { AppError } from '../../lib/errors.js';
import { toNormalized } from '../../integrations/mapper.js';
import type { MediaEvidence } from './contentEvidence.js';
import { generateMultimodalJson, uploadVideo, deleteUploaded, AiFailedError } from './geminiClient.js';
import { observationSchema } from './deepV2.validation.js';
import { generateOverview } from './deepV2.overview.js';
import { postTextSources } from './deepV2.text.js';
import { collectAudienceInputs, buildAudience } from './deepV2.audience.js';

export const V2_VERSION = 'app-deep-v2-editorial-4';
type Timeline = DeepAnalysisV2['overview']['timeline'];
export interface Progress { (stage: string, processed: number, total: number): Promise<void> }
export function videoWindows(duration: number | null): { start: number; end: number | null }[] {
  if (!duration || !Number.isFinite(duration) || duration <= 0) return [{ start: 0, end: null }];
  const step = duration > 600 ? 120 : 45;
  return Array.from({ length: Math.ceil(duration / step) }, (_, i) => ({ start: i * step, end: Math.min(duration, (i + 1) * step) }));
}
export async function buildDeepV2(doc: ContentItemDoc, goal: string, progress: Progress): Promise<DeepAnalysisV2> {
  await progress('Retrieving original content', 0, 1);
  let item = toNormalized(doc);
  let media: MediaEvidence;
  const limitations: string[] = [];
  const processingNotes: string[] = [];
  try { const loaded = await collectDeepV2Media(doc); item = loaded.item; media = loaded.media; }
  catch (error) { media = { basis: 'none', images: [], videos: [], youtubeUrl: null, durationSeconds: doc.durationSeconds ?? null, notes: [], failure: error instanceof AppError ? error.message : 'The original media was inaccessible. Only available post text can be assessed.' }; }
  if (['none', 'thumbnail'].includes(media.basis)) limitations.push(media.failure || 'Original media was not available; no full-content review is claimed.');
  limitations.push(...media.notes);
  const sources: DeepSource[] = [];
  const timeline: Timeline = [];
  const uploaded: string[] = [];
  let analyzedDuration = 0, analyzedAssets = 0, model = config.ai.model || 'unavailable';
  const videoCount = media.videos.length + (media.youtubeUrl ? 1 : 0);
  const hasPostText = Boolean(item.caption || doc.title);
  const assetCount = media.images.length + videoCount + (media.documents?.length ?? 0) + (hasPostText ? 1 : 0);
  let total = media.images.length + (media.documents?.length ?? 0) + (item.caption || doc.title ? 1 : 0) + media.videos.reduce((n, v) => n + videoWindows(v.durationSeconds).length, 0) + (media.youtubeUrl ? videoWindows(media.durationSeconds).length : 0);
  total = Math.max(total, 1);
  let processed = 0;
  const process = async (input: { id: string; label: string; kind: 'image' | 'video' | 'text' | 'document'; part: Part | null; start: number | null; end: number | null; slide: number | null }): Promise<boolean> => {
    await progress(`Reviewing ${input.label}`, processed, total);
    try {
      const parts: Part[] = [{ text: JSON.stringify({ assetId: input.id, label: input.label, kind: input.kind, startSeconds: input.start, endSeconds: input.end, postContext: { platform: doc.platform, title: doc.title || '', caption: item.caption || '' }, ...(input.kind === 'text' ? { caption: item.caption || '', title: doc.title || '' } : {}) }) }];
      if (input.part) parts.push(input.part);
      let generated;
      try { generated = await generateMultimodalJson({ system: EXTRACT, parts, schema: observationSchema, timeoutMs: config.ai.contentAnalysis.timeoutMs }); }
      catch (error) {
        if (!(error instanceof AiFailedError) || error.reason !== 'invalid_response') throw error;
        generated = await generateMultimodalJson({ system: EXTRACT, parts: [...parts, { text: 'Repair the invalid response using the exact extraction JSON shape. Include all required keys, null non-video timestamps/pageNumber, exact text quotes, and allowed enum values. Descriptions <=700 characters.' }], schema: observationSchema, timeoutMs: config.ai.contentAnalysis.timeoutMs });
      }
      model = generated.model;
      const data = observationSchema.parse(generated.data);
      // A text extraction request deliberately has no visual asset. Local model
      // caveats must not become contradictory whole-post coverage failures.
      for (const note of data.limitations) if (/illegible|unreadable|unclear|inaudible|sampling/i.test(note)) processingNotes.push(input.label + ': ' + note);
      if (!data.processed) throw new AiFailedError('The supplied media was not processed.', 'invalid_response');
      const ids: (string | null)[] = [];
      for (const observation of data.observations) {
        const isText = ['caption', 'title'].includes(observation.source);
        let valid = observation.pageNumber === null;
        if (input.kind === 'video') valid &&= !isText && !['image', 'document'].includes(observation.source) && observation.startSeconds !== null && observation.endSeconds !== null && observation.startSeconds >= input.start! && observation.endSeconds >= observation.startSeconds && (input.end === null || observation.endSeconds <= input.end + .1);
        else valid &&= observation.startSeconds === null && observation.endSeconds === null && !['audio', 'video_frame'].includes(observation.source);
        if (input.kind === 'text') valid &&= isText && Boolean(observation.quote) && (observation.source === 'caption' ? item.caption || '' : doc.title || '').includes(observation.quote!);
        else valid &&= !isText;
        if (input.kind === 'image') valid &&= ['image', 'on_screen_text'].includes(observation.source);
        if (input.kind === 'document') valid &&= ['document', 'on_screen_text'].includes(observation.source);
        if (observation.source === 'audio' && ['silent', 'unavailable', 'not_applicable'].includes(data.audioStatus)) valid = false;
        if (!valid) { ids.push(null); continue; }
        const id = `source_${sources.length + 1}`;
        ids.push(id);
        sources.push({ ...observation, id, assetId: isText ? null : input.id, slideNumber: input.slide, claimType: 'observed' });
      }
      const segments: Timeline = [];
      for (const segment of data.segments) {
        const evidenceIds = [...new Set(segment.observationIndexes.map((i) => ids[i]).filter((id): id is string => Boolean(id)))];
        if (input.kind === 'video') {
          if (segment.startSeconds === null || segment.endSeconds === null || segment.startSeconds < input.start! || segment.endSeconds <= segment.startSeconds || (input.end !== null && segment.endSeconds > input.end + .1)) continue;
        } else if (segment.startSeconds !== null || segment.endSeconds !== null) continue;
        segments.push({ assetId: input.id, label: input.label, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, slideNumber: input.slide, status: evidenceIds.length ? segment.status : 'insufficient_evidence', evidenceIds });
      }
      if (input.kind === 'video') {
        segments.sort((a, b) => a.startSeconds! - b.startSeconds!);
        let end = input.start!;
        for (const scene of segments) {
          if (scene.startSeconds! < end - .01) continue;
          if (scene.startSeconds! > end) timeline.push({ assetId: input.id, label: input.label, startSeconds: end, endSeconds: scene.startSeconds, slideNumber: input.slide, status: 'insufficient_evidence', evidenceIds: [] });
          timeline.push(scene); end = scene.endSeconds!;
          if (scene.status !== 'insufficient_evidence') analyzedDuration += scene.endSeconds! - scene.startSeconds!;
        }
        if (input.end !== null && end < input.end) timeline.push({ assetId: input.id, label: input.label, startSeconds: end, endSeconds: input.end, slideNumber: input.slide, status: 'insufficient_evidence', evidenceIds: [] });
        if (data.audioStatus === 'unavailable') limitations.push(`${input.label}: audio could not be assessed.`);
      } else if (segments.length && input.kind !== 'text') timeline.push(segments[0]);
      return ids.some(Boolean);
    } catch {
      limitations.push(`${input.label} could not be assessed successfully.`);
      if (input.kind === 'video' && input.end !== null) timeline.push({ assetId: input.id, label: input.label, startSeconds: input.start, endSeconds: input.end, slideNumber: input.slide, status: 'insufficient_evidence', evidenceIds: [] });
      else if (input.kind === 'image') timeline.push({ assetId: input.id, label: input.label, startSeconds: null, endSeconds: null, slideNumber: input.slide, status: 'insufficient_evidence', evidenceIds: [] });
      return false;
    } finally { processed++; await progress('Validating content evidence', processed, total); }
  };
  try {
    if (item.caption || doc.title) {
      sources.push(...postTextSources(item.caption || '', doc.title || '', sources.length));
      analyzedAssets++; processed++;
      await progress('Reading the complete post text', processed, total);
    }
    for (const [i, image] of media.images.entries()) {
      const slide = media.basis === 'carousel' ? Number(/(?:slide|image) (\d+) of/.exec(image.label)?.[1]) || i + 1 : null;
      if (await process({ id: `image_${i + 1}`, label: image.label, kind: 'image', part: createPartFromBase64(image.data, image.mimeType), start: null, end: null, slide })) analyzedAssets++;
    }
    for (const [i, document] of (media.documents ?? []).entries()) {
      if (await process({ id: `document_${i + 1}`, label: document.label, kind: 'document', part: createPartFromBase64(Buffer.from(document.bytes).toString('base64'), document.mimeType), start: null, end: null, slide: null })) analyzedAssets++;
    }
    const videos: { id: string; label: string; part: Part; duration: number | null; slide: number | null }[] = [];
    for (const [i, video] of media.videos.entries()) {
      await progress('Preparing original video', processed, total);
      try {
        const file = await uploadVideo(video.bytes, video.mimeType, config.ai.contentAnalysis.timeoutMs);
        uploaded.push(file.name);
        videos.push({ id: `video_${i + 1}`, label: video.label, part: createPartFromUri(file.uri, file.mimeType), duration: video.durationSeconds, slide: Number(/slide (\d+) of/.exec(video.label)?.[1]) || null });
      } catch { limitations.push(`${video.label}: original video processing failed.`); }
    }
    if (media.youtubeUrl) videos.push({ id: 'youtube_1', label: 'YouTube video', part: { fileData: { fileUri: media.youtubeUrl, mimeType: 'video/mp4' } }, duration: media.durationSeconds, slide: null });
    for (const video of videos) {
      let success = true;
      for (const window of videoWindows(video.duration)) {
        const part: Part = { ...video.part, videoMetadata: { startOffset: `${window.start}s`, ...(window.end !== null ? { endOffset: `${window.end}s` } : {}), fps: window.start === 0 ? 2 : video.duration && video.duration > 600 ? .5 : 1 } };
        success = await process({ id: video.id, label: `${video.label} ${window.start}s–${window.end ?? 'end'}s`, kind: 'video', part, start: window.start, end: window.end, slide: video.slide }) && success;
      }
      if (success) analyzedAssets++;
      if (video.duration === null) limitations.push(`${video.label}: duration could not be verified; complete coverage cannot be confirmed.`);
    }
  } finally { await Promise.allSettled(uploaded.map(deleteUploaded)); }
  if (videoCount) limitations.push('Video analysis uses adaptive provider frame sampling and multimodal audio. Every frame, word and OCR result has not been independently verified; full-content coverage is not certified.');
  await progress('Writing the complete post review', total, total);
  const format = media.basis === 'text' ? 'text' : media.basis === 'document' ? 'document' : media.basis === 'carousel' ? 'carousel' : media.basis === 'full_video' && doc.contentType === 'post' ? 'video' : doc.contentType;
  const textOnly = sources.length > 0 && sources.every((source) => ['caption', 'title'].includes(source.source));
  const scope = textOnly ? 'Available post caption/title only; original visual/audio content was not assessed.' : 'Original ' + media.basis + ' and available post text. ' + limitations.join(' ');
  const reviewed = await generateOverview(doc, item.caption || '', format, scope, goal, sources);
  model = reviewed.model;
  const priorityFindings = reviewed.findings;
  const actions = reviewed.actions;
  await progress('Reading permitted audience feedback', total, total);
  let audience: DeepAnalysisV2['audience'];
  try { audience = await buildAudience(await collectAudienceInputs(doc)); }
  catch { audience = { availability: 'unavailable', findings: [], limitations: ['Audience feedback could not be retrieved. We will not guess what viewers thought.'], sampledComments: 0, collectedAt: new Date().toISOString() }; }
  const isComplete = !videoCount && media.basis !== 'document' && !['none', 'thumbnail'].includes(media.basis) && assetCount > 0 && analyzedAssets === assetCount && !limitations.length;
  const timestamp = new Date().toISOString();
  return {
    postId: doc.legacyId, accountId: String(doc.connectedAccountId), platform: doc.platform, mediaType: format, post: { title: doc.title, caption: item.caption || '', publishedAt: doc.publishedAt.toISOString() }, goal,
    analysisStatus: isComplete ? 'complete' : 'partial', analysisVersion: V2_VERSION, generatedAt: timestamp,
    coverage: { accessibleDurationSeconds: videoCount ? media.videos.reduce((n, v) => n + (v.durationSeconds ?? 0), 0) + (media.youtubeUrl ? media.durationSeconds ?? 0 : 0) || null : null, analyzedDurationSeconds: Math.round(analyzedDuration * 100) / 100, isComplete, accessibleAssets: assetCount, analyzedAssets, limitations: [...new Set(limitations)], notes: [...new Set(processingNotes)], method: !sources.length ? 'No usable evidence was extracted from the available post content' : media.basis === 'text' ? 'Available written post supplied for text analysis' : textOnly ? 'Selected post caption/title only; original visual media was not assessed' : videoCount ? 'Adaptive frame sampling and provider multimodal audio across bounded video windows, plus available post text' : 'Original images, accessible document and available post text supplied to multimodal analysis' },
    overview: { editorial: reviewed.editorial, summary: reviewed.editorial.introduction.slice(0, 700), strongestQuality: null, mainOpportunity: null, keyTakeaway: reviewed.editorial.verdict.slice(0, 700), timeline: timeline.sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0) || (a.startSeconds ?? 0) - (b.startSeconds ?? 0)), priorityFindings }, audience, nextMove: { actions },
    processing: { model, promptVersion: V2_VERSION, validatedAt: timestamp, categoryEngine: DEEP_CATEGORIES, sources },
  };
}
