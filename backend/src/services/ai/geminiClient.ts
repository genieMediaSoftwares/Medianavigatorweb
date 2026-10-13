import { FileState, GoogleGenAI, type Part } from '@google/genai';
import type { ZodType, ZodTypeDef } from 'zod';
import type { VideoInput } from './videoInput.js';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export class AiUnavailableError extends Error {
  constructor(message = 'AI analysis is not configured on this server') { super(message); this.name = 'AiUnavailableError'; }
}
export class AiFailedError extends Error {
  constructor(message: string, public readonly reason: 'timeout' | 'provider_error' | 'invalid_response') { super(message); this.name = 'AiFailedError'; }
}

let client: GoogleGenAI | null = null;
export const aiAvailable = () => config.ai.enabled;
export const aiModel = () => config.ai.model ?? null;

function getClient(): GoogleGenAI {
  if (!config.ai.enabled || !config.ai.apiKey) throw new AiUnavailableError();
  client ??= new GoogleGenAI({ apiKey: config.ai.apiKey, httpOptions: { timeout: config.ai.timeoutMs } });
  return client;
}

function parseJson(raw: string): unknown {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a !== -1 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}

/** One model call, JSON out, validated against `schema`. Throws AiUnavailableError / AiFailedError; never returns made-up data. */
export async function generateJson<T>(opts: { system: string; prompt: string; schema: ZodType<T, ZodTypeDef, unknown>; video?: VideoInput }): Promise<{ data: T; model: string; latencyMs: number }> {
  const ai = getClient();
  const model = config.ai.model!;
  const started = Date.now();
  let text: string | undefined;
  let uploadedName: string | undefined;
  const timeout = opts.video ? 240_000 : config.ai.timeoutMs;
  try {
    // The structured video prompt carries the JSON shape at its end, so it must never be clipped by the short-prompt limit.
    const parts: Part[] = [{ text: opts.prompt.slice(0, opts.video ? Math.max(config.ai.maxInputChars, 20_000) : config.ai.maxInputChars) }];
    const sampling = opts.video?.fps ? { videoMetadata: { fps: opts.video.fps } } : {};
    if (opts.video && 'youtubeUrl' in opts.video) {
      parts.unshift({ fileData: { fileUri: opts.video.youtubeUrl, mimeType: 'video/mp4' }, ...sampling });
    } else if (opts.video && 'blob' in opts.video) {
      let file = await ai.files.upload({ file: opts.video.blob, config: { mimeType: opts.video.blob.type, httpOptions: { timeout: 120_000 } } });
      uploadedName = file.name;
      const deadline = Date.now() + 180_000;
      while (file.state === 'PROCESSING' && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        file = await ai.files.get({ name: uploadedName!, config: { httpOptions: { timeout: 10_000 } } });
      }
      if (file.state !== 'ACTIVE' || !file.uri) throw new AiFailedError('Video processing did not complete. Please retry.', 'provider_error');
      parts.unshift({ fileData: { fileUri: file.uri, mimeType: file.mimeType || opts.video.blob.type }, ...sampling });
    }
    const res = await ai.models.generateContent({
      model, contents: [{ role: 'user', parts }],
      config: { systemInstruction: opts.system, responseMimeType: 'application/json', temperature: opts.video ? 0.2 : undefined, httpOptions: { timeout } },
    });
    text = res.text;
  } catch (err) {
    if (err instanceof AiFailedError) throw err;
    const status = (err as { status?: number }).status;
    // Do not log provider payloads: they can include signed media URLs.
    logger.warn('gemini request failed', { operation: 'ai', provider: 'gemini', status });
    throw new AiFailedError(status === 429 ? 'Analysis service rate limit reached. Retry later.' : 'The analysis service could not process this request.', 'provider_error');
  } finally {
    if (uploadedName) await ai.files.delete({ name: uploadedName, config: { httpOptions: { timeout: 10_000 } } }).catch(() => logger.warn('temporary Gemini file cleanup failed'));
  }
  if (!text) throw new AiFailedError('The analysis service returned an empty result.', 'invalid_response');
  let parsed: unknown;
  try { parsed = parseJson(text); } catch { throw new AiFailedError('The analysis service returned an invalid result.', 'invalid_response'); }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) throw new AiFailedError('The analysis service returned an unusable result.', 'invalid_response');
  const latencyMs = Date.now() - started;
  logger.info('gemini call', { operation: 'ai', provider: 'gemini', model, latencyMs });
  return { data: checked.data, model, latencyMs };
}

/** Uploads a video to Gemini's Files API and waits until it can be used in a prompt. */
export async function uploadVideo(bytes: Uint8Array, mimeType: string, timeoutMs: number): Promise<{ name: string; uri: string; mimeType: string }> {
  const ai = getClient();
  const started = Date.now();
  let file = await ai.files.upload({ file: new Blob([bytes as BlobPart], { type: mimeType }), config: { mimeType } });
  while (file.state === FileState.PROCESSING) {
    if (Date.now() - started > timeoutMs) throw new AiFailedError('Video processing timed out', 'timeout');
    await new Promise((r) => setTimeout(r, 2000));
    file = await ai.files.get({ name: file.name! });
  }
  if (file.state !== FileState.ACTIVE || !file.uri || !file.name) throw new AiFailedError('The analysis service could not process the video.', 'provider_error');
  return { name: file.name, uri: file.uri, mimeType: file.mimeType ?? mimeType };
}

/** Removes an uploaded file. Best effort: files also expire on Google's side after 48 hours. */
export async function deleteUploaded(name: string): Promise<void> {
  try {
    await getClient().files.delete({ name });
  } catch (err) {
    logger.warn('gemini file delete failed', { operation: 'ai', provider: 'gemini', error: err });
  }
}

/** One multimodal call (text + images/video parts), JSON out, validated against `schema`. */
export async function generateMultimodalJson<T>(opts: { system: string; parts: Part[]; schema: ZodType<T, ZodTypeDef, unknown>; timeoutMs: number }): Promise<{ data: T; model: string; latencyMs: number }> {
  const ai = getClient();
  const model = config.ai.model!;
  const started = Date.now();
  let text: string | undefined;
  try {
    const res = await Promise.race([
      ai.models.generateContent({ model, contents: [{ role: 'user', parts: opts.parts }], config: { systemInstruction: opts.system, responseMimeType: 'application/json', temperature: 0.2 } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new AiFailedError('The analysis request timed out.', 'timeout')), opts.timeoutMs)),
    ]);
    text = res.text;
  } catch (err) {
    if (err instanceof AiFailedError) throw err;
    logger.warn('gemini multimodal request failed', { operation: 'ai', provider: 'gemini', error: err });
    throw new AiFailedError('The analysis request failed.', 'provider_error');
  }
  if (!text) throw new AiFailedError('The analysis service returned an empty result.', 'invalid_response');
  let parsed: unknown;
  try { parsed = parseJson(text); } catch { throw new AiFailedError('The analysis service returned an invalid result.', 'invalid_response'); }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) {
    logger.warn('gemini response failed validation', { operation: 'ai', provider: 'gemini', issues: checked.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) });
    throw new AiFailedError('The analysis service returned an unusable result.', 'invalid_response');
  }
  const latencyMs = Date.now() - started;
  logger.info('gemini multimodal call', { operation: 'ai', provider: 'gemini', model, latencyMs });
  return { data: checked.data, model, latencyMs };
}
