import 'server-only';
import { getEnv } from '@/env';
import { createRefresher, type RefreshOutcome } from './refresh';
import type { TokenPair } from './cookies';

export const API_PREFIX = '/api/v1';

/** Thrown when the API cannot be reached at all (DNS, refused connection, timeout). */
export class UpstreamUnreachableError extends Error {
  constructor(cause: unknown) {
    super('The Media Navigator API could not be reached');
    this.name = 'UpstreamUnreachableError';
    this.cause = cause;
  }
}

export interface UpstreamRequest {
  method: string;
  /** Path below /api/v1, starting with "/". */
  path: string;
  search?: string;
  headers?: Record<string, string>;
  body?: ArrayBuffer | string;
  accessToken?: string;
}

export async function callUpstream(r: UpstreamRequest): Promise<Response> {
  const url = `${getEnv().apiBaseUrl}${API_PREFIX}${r.path}${r.search ?? ''}`;
  const headers: Record<string, string> = { accept: 'application/json', ...r.headers };
  if (r.accessToken) headers.authorization = `Bearer ${r.accessToken}`;
  try {
    return await fetch(url, { method: r.method, headers, body: r.body, redirect: 'manual', cache: 'no-store' });
  } catch (err) {
    throw new UpstreamUnreachableError(err);
  }
}

const tokenPair = (v: unknown): TokenPair | null => {
  const t = v as Partial<TokenPair> | null | undefined;
  return t && typeof t.accessToken === 'string' && typeof t.refreshToken === 'string' && typeof t.expiresIn === 'number' && typeof t.refreshExpiresIn === 'number'
    ? { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn, refreshExpiresIn: t.refreshExpiresIn }
    : null;
};

export function extractTokens(body: unknown): TokenPair | null {
  const data = (body as { data?: { tokens?: unknown } } | null)?.data;
  return tokenPair(data?.tokens);
}

/** Shared, single-flight refresh against POST /auth/refresh. */
export const refreshTokens = createRefresher(async (refreshToken): Promise<RefreshOutcome> => {
  const res = await callUpstream({
    method: 'POST', path: '/auth/refresh',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return { ok: false };
  const tokens = extractTokens(await res.json().catch(() => null));
  return tokens ? { ok: true, tokens } : { ok: false };
});
