import { FileState, GoogleGenAI, type Part } from '@google/genai';
import type { ZodType, ZodTypeDef } from 'zod';
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
export async function generateJson<T>(opts: { system: string; prompt: string; schema: ZodType<T> }): Promise<{ data: T; model: string; latencyMs: number }> {
  const ai = getClient();
  const model = config.ai.model!;
  const started = Date.now();
  let text: string | undefined;
  try {
    const res = await Promise.race([
      ai.models.generateContent({ model, contents: opts.prompt.slice(0, config.ai.maxInputChars), config: { systemInstruction: opts.system, responseMimeType: 'application/json' } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new AiFailedError('Gemini request timed out', 'timeout')), config.ai.timeoutMs)),
    ]);
    text = res.text;
  } catch (err) {
    if (err instanceof AiFailedError) throw err;
    logger.warn('gemini request failed', { operation: 'ai', provider: 'gemini', error: err });
    throw new AiFailedError('Gemini request failed', 'provider_error');
  }
  if (!text) throw new AiFailedError('Gemini returned an empty response', 'invalid_response');
  let parsed: unknown;
  try { parsed = parseJson(text); } catch { throw new AiFailedError('Gemini returned malformed JSON', 'invalid_response'); }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) throw new AiFailedError('Gemini response did not match the expected structure', 'invalid_response');
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
  if (file.state !== FileState.ACTIVE || !file.uri || !file.name) throw new AiFailedError('Gemini could not process the video', 'provider_error');
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
      new Promise<never>((_, rej) => setTimeout(() => rej(new AiFailedError('Gemini request timed out', 'timeout')), opts.timeoutMs)),
    ]);
    text = res.text;
  } catch (err) {
    if (err instanceof AiFailedError) throw err;
    logger.warn('gemini multimodal request failed', { operation: 'ai', provider: 'gemini', error: err });
    throw new AiFailedError('Gemini request failed', 'provider_error');
  }
  if (!text) throw new AiFailedError('Gemini returned an empty response', 'invalid_response');
  let parsed: unknown;
  try { parsed = parseJson(text); } catch { throw new AiFailedError('Gemini returned malformed JSON', 'invalid_response'); }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) {
    logger.warn('gemini response failed validation', { operation: 'ai', provider: 'gemini', issues: checked.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) });
    throw new AiFailedError('Gemini response did not match the expected structure', 'invalid_response');
  }
  const latencyMs = Date.now() - started;
  logger.info('gemini multimodal call', { operation: 'ai', provider: 'gemini', model, latencyMs });
  return { data: checked.data, model, latencyMs };
}
