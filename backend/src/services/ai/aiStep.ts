import { z } from 'zod';
import type { Types } from 'mongoose';
import { AiFailedError, AiUnavailableError, aiAvailable, generateJson } from './geminiClient.js';
import { PROMPT_VERSION } from './prompts.js';
import { cacheKey, getCached, putCached } from './aiCache.service.js';

export interface AiMeta {
  /** ran = fresh model output; cached = previous model output for identical data+prompt; unavailable = not configured; failed = call errored; not_needed = nothing to analyse */
  status: 'ran' | 'cached' | 'unavailable' | 'failed' | 'not_needed';
  model: string | null;
  promptVersion: string;
  generatedAt: string | null;
  reason?: string;
}

export const aiMeta = (status: AiMeta['status'], extra: Partial<AiMeta> = {}): AiMeta => ({ status, model: null, promptVersion: PROMPT_VERSION, generatedAt: null, ...extra });

/** Runs (or reuses) one AI step. Never throws for AI problems: the caller still gets deterministic content plus an honest status. */
export async function runAiStep<T>(args: { userId: Types.ObjectId; type: string; subject: string; dataVersion: string; system: string; prompt: string; schema: z.ZodType<T> }): Promise<{ data: T | null; ai: AiMeta }> {
  if (!aiAvailable()) return { data: null, ai: aiMeta('unavailable', { reason: 'Gemini is not configured on this server' }) };
  const key = cacheKey({ userId: args.userId, type: args.type, subject: args.subject, dataVersion: args.dataVersion });
  const hit = await getCached<T>(args.userId, key);
  if (hit) return { data: hit.payload, ai: aiMeta('cached', { model: hit.model, generatedAt: hit.generatedAt.toISOString() }) };
  try {
    const out = await generateJson({ system: args.system, prompt: args.prompt, schema: args.schema });
    await putCached({ userId: args.userId, key, type: args.type, payload: out.data, model: out.model, dataVersion: args.dataVersion });
    return { data: out.data, ai: aiMeta('ran', { model: out.model, generatedAt: new Date().toISOString() }) };
  } catch (err) {
    if (err instanceof AiUnavailableError) return { data: null, ai: aiMeta('unavailable', { reason: err.message }) };
    if (err instanceof AiFailedError) return { data: null, ai: aiMeta('failed', { reason: err.reason }) };
    throw err;
  }
}

