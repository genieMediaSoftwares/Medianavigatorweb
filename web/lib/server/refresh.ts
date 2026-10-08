import type { TokenPair } from './cookies';

/**
 * Single-flight refresh.
 *
 * The API rotates refresh tokens and treats a second use of an already-rotated token as theft (it revokes the whole
 * session). Browsers send several requests at once, and requests that left the browser before the new cookies arrived
 * still carry the old refresh token. So every refresh for the same token shares one upstream call, and its result is
 * remembered briefly so late requests reuse it instead of replaying the old token.
 *
 * This state is per server process. Run the web app as a single process, or put sticky sessions in front of it.
 */
export type RefreshOutcome = { ok: true; tokens: TokenPair } | { ok: false };

const REMEMBER_MS = 60_000;

interface Entry { promise: Promise<RefreshOutcome>; settledAt?: number }

export function createRefresher(doRefresh: (refreshToken: string) => Promise<RefreshOutcome>, now: () => number = Date.now) {
  const inflight = new Map<string, Entry>();

  const sweep = () => {
    const t = now();
    for (const [k, e] of inflight) if (e.settledAt !== undefined && t - e.settledAt > REMEMBER_MS) inflight.delete(k);
  };

  return function refresh(refreshToken: string): Promise<RefreshOutcome> {
    sweep();
    const existing = inflight.get(refreshToken);
    if (existing) return existing.promise;
    const entry: Entry = {
      promise: doRefresh(refreshToken)
        .catch((): RefreshOutcome => ({ ok: false }))
        .then((outcome) => {
          entry.settledAt = now();
          // A failed attempt (network blip) must not block a later retry with the same token.
          if (!outcome.ok) inflight.delete(refreshToken);
          return outcome;
        }),
    };
    inflight.set(refreshToken, entry);
    return entry.promise;
  };
}
