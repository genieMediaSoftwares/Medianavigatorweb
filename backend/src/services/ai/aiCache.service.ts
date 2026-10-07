import type { Types } from 'mongoose';
import { config } from '../../config/env.js';
import { sha256 } from '../../lib/crypto.js';
import { aiCacheRepository } from '../../repositories/aiCache.repository.js';
import { PROMPT_VERSION } from './prompts.js';

/**
 * Cache identity = user + analysis type + subject (post id / question hash) + data version + prompt version.
 * A change to the underlying numbers or the prompt produces a different key, so stale analysis is never served as current.
 */
export const cacheKey = (parts: { userId: Types.ObjectId; type: string; subject: string; dataVersion: string }) =>
  sha256([parts.userId, parts.type, parts.subject, parts.dataVersion, PROMPT_VERSION].join('|'));

export async function getCached<T>(userId: Types.ObjectId, key: string): Promise<{ payload: T; generatedAt: Date; model: string } | null> {
  const hit = await aiCacheRepository.get(userId, key);
  return hit ? { payload: hit.payload as T, generatedAt: hit.generatedAt, model: hit.model } : null;
}

export async function putCached(args: { userId: Types.ObjectId; key: string; type: string; payload: unknown; model: string; dataVersion: string }) {
  const now = new Date();
  await aiCacheRepository.put({
    userId: args.userId, cacheKey: args.key, analysisType: args.type, payload: args.payload, model: args.model,
    promptVersion: PROMPT_VERSION, dataVersion: args.dataVersion, generatedAt: now, expiresAt: new Date(now.getTime() + config.ai.cacheTtlHours * 3_600_000),
  });
}
