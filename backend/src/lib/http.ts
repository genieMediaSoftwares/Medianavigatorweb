import { config } from '../config/env.js';
import { logger } from './logger.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ProviderHttpError extends Error {
  constructor(message: string, public readonly status?: number, public readonly transient = false) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export interface HttpOptions extends RequestInit {
  timeoutMs?: number;
  /** Retries are only ever attempted for idempotent methods (GET/HEAD). */
  maxRetries?: number;
}

/**
 * fetch() with a hard timeout and bounded, jittered retries for transient failures only
 * (timeouts, network errors, 408/429/5xx). Authentication (401/403) and 4xx errors are never retried.
 * Drop-in replacement for fetch: returns the Response of the final attempt.
 */
export async function httpFetch(input: string | URL, init: HttpOptions = {}): Promise<Response> {
  const { timeoutMs = config.providers.timeoutMs, maxRetries = config.providers.maxRetries, ...rest } = init;
  const method = (rest.method || 'GET').toUpperCase();
  const retries = method === 'GET' || method === 'HEAD' ? maxRetries : 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...rest, signal: ctrl.signal });
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : backoff(attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      const aborted = (err as Error)?.name === 'AbortError';
      if (attempt < retries) {
        logger.warn('provider request failed, retrying', { attempt: attempt + 1, reason: aborted ? 'timeout' : 'network' });
        await sleep(backoff(attempt));
        continue;
      }
      throw new ProviderHttpError(aborted ? `Provider request timed out after ${timeoutMs}ms` : 'Provider request failed (network error)', undefined, true);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderHttpError('Provider request failed', undefined, true);
}

function backoff(attempt: number): number {
  const exp = config.providers.retryBaseMs * 2 ** attempt;
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}
