import 'server-only';
import { getEnv } from '@/env';
import type { Tokens } from './session';

/** Upper bound for any call from the web server to the API. */
const UPSTREAM_TIMEOUT_MS = 30_000;

export class UpstreamUnreachable extends Error {}

export async function callApi(path: string, init: RequestInit & { accessToken?: string; requestId: string; userAgent?: string | null }): Promise<Response> {
  const { accessToken, requestId, userAgent, headers, ...rest } = init;
  const h = new Headers(headers);
  h.set('x-request-id', requestId);
  // So the "signed-in devices" list can say which browser a session belongs to.
  if (userAgent) h.set('user-agent', userAgent);
  if (accessToken) h.set('authorization', `Bearer ${accessToken}`);
  try {
    return await fetch(`${getEnv().API_BASE_URL}/api/v1${path}`, { ...rest, headers: h, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch {
    throw new UpstreamUnreachable('API unreachable');
  }
}

// One refresh per refresh token at a time: refresh tokens rotate, so two parallel refreshes with the same token
// would look like a replay and end the session.
const inflight = new Map<string, Promise<Tokens | null>>();

export function refreshTokens(refreshToken: string, requestId: string): Promise<Tokens | null> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;
  const run = (async (): Promise<Tokens | null> => {
    try {
      const res = await callApi('/auth/refresh', { method: 'POST', requestId, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: { tokens?: Tokens } };
      return json.data?.tokens ?? null;
    } catch {
      return null;
    }
  })();
  inflight.set(refreshToken, run);
  void run.finally(() => setTimeout(() => inflight.delete(refreshToken), 10_000));
  return run;
}
