import type { PlatformType } from '../../../shared/types.js';
import { DeepAnalysisJob } from '../models/DeepAnalysisJob.js';
import { YouTubeApiError } from '../integrations/youtube/errors.js';
import { AppError, badRequest, conflict, ConnectError, notFound, type ConnectFailureReason, type ConnectStage } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { sha256 } from '../lib/crypto.js';
import { MetaApiError, logMetaError } from '../integrations/meta/metaErrors.js';
import { toObjectId } from '../lib/ids.js';
import { ProviderHttpError } from '../lib/http.js';
import { getAdapter, PLATFORMS } from '../integrations/registry.js';
import type { ProviderCredentials } from '../integrations/types.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { syncRunRepository } from '../repositories/syncRun.repository.js';
import { ConnectedAccount } from '../models/ConnectedAccount.js';
import { sealCredentials, syncService } from './sync.service.js';
import { toPlatformConnection, toPlatformConnections } from './connection.view.js';
import { oauthEnabled } from './oauth.service.js';
import { auditRepository } from '../repositories/audit.repository.js';

export const syncRunView = (r: { _id: unknown; status: string; type: string; platform: string; queuedAt: Date; startedAt?: Date | null; completedAt?: Date | null; durationMs?: number | null; itemsFetched: number; itemsCreated: number; itemsUpdated: number; itemsSkipped: number; itemsFailed: number; errorKind?: string | null; errorSummary?: string | null; attempts: number }) => ({
  id: String(r._id), platform: r.platform, type: r.type, status: r.status, queuedAt: r.queuedAt, startedAt: r.startedAt ?? null, completedAt: r.completedAt ?? null, durationMs: r.durationMs ?? null,
  items: { fetched: r.itemsFetched, created: r.itemsCreated, updated: r.itemsUpdated, skipped: r.itemsSkipped, failed: r.itemsFailed },
  attempts: r.attempts, errorKind: r.errorKind ?? null, errorSummary: r.errorSummary ?? null,
});

const REASON_FOR_KIND: Record<'expired' | 'permission' | 'invalid', ConnectFailureReason> = { expired: 'token_expired', permission: 'permission_missing', invalid: 'token_invalid' };
const REASON_FOR_YOUTUBE: Record<YouTubeApiError['kind'], ConnectFailureReason> = {
  invalid: 'token_invalid', expired: 'token_expired', permission: 'permission_missing', quota: 'provider_unavailable', not_found: 'account_not_found', unavailable: 'provider_unavailable',
};

/**
 * One error shape for every failed connection: a stable `reason`, the right status and a message with the next step.
 * What the provider actually answered is logged (without credentials) for diagnosis.
 */
function connectFailure(platform: PlatformType, err: unknown, stage: ConnectStage, requestId?: string): unknown {
  let out: unknown = err;
  if (err instanceof MetaApiError) { logMetaError(`connect:${platform}`, err, requestId); out = err.toConnectError(); }
  else if (err instanceof ProviderHttpError) out = new ConnectError('provider_unavailable', `${platform[0].toUpperCase()}${platform.slice(1)} isn’t reachable right now (${err.message}). Please try again in a few minutes.`);
  // Plain-language provider errors (invalid key, API not enabled, channel not found, quota) are the user's to fix.
  else if (err instanceof YouTubeApiError) out = new ConnectError(REASON_FOR_YOUTUBE[err.kind], err.message);
  if (out instanceof ConnectError) {
    out = out.atStage(stage);
    logger.warn('connect refused', { operation: 'connect', provider: platform, requestId, stage, reason: (out as ConnectError).reason, status: (out as ConnectError).status });
  }
  else if (!(out instanceof AppError)) logger.error('connect failed unexpectedly', { operation: 'connect', provider: platform, requestId, error: err });
  return out;
}

/**
 * Safe description of a pasted credential: its kind (from the public prefix), length and a short one-way hash. Two
 * attempts with the same fingerprint used the same token; nothing here can be turned back into the token.
 */
export function credentialFingerprint(c: ProviderCredentials): { kind: string; length: number; sha256: string } | null {
  const value = (c.accessToken || c.apiKey || '').trim();
  if (!value) return null;
  const kind = /^EAA/.test(value) ? 'meta_user_or_page_token' : /^IG/.test(value) ? 'instagram_login_token'
    : /^AIza/.test(value) ? 'google_api_key' : /^ya29\./.test(value) ? 'google_oauth_token' : /^AQ/.test(value) ? 'linkedin_token' : 'unrecognised';
  return { kind, length: value.length, sha256: sha256(value).slice(0, 10) };
}

export const connectionService = {
  async list(userId: string) {
    const accounts = await connectionRepository.listForUser(userId);
    return toPlatformConnections(accounts).map((c) => ({ ...c, oauthAvailable: oauthEnabled(c.platform) }));
  },

  /**
   * Connects with a user-supplied token/key (existing flow), after validating it with the provider.
   * Credentials are encrypted before they touch the database and are never returned.
   * The first sync is queued; the HTTP request does not wait for provider pagination.
   */
  async connectWithCredentials(userId: string, platform: PlatformType, input: ProviderCredentials, requestId?: string, client = 'unknown') {
    const adapter = getAdapter(platform);
    // Lets two attempts (e.g. from the web app and the mobile app) be compared without ever logging the credential.
    logger.info('connect attempt', { operation: 'connect', provider: platform, requestId, client, credential: credentialFingerprint(input) });
    return connectionService.finishConnect(userId, platform, input, adapter, requestId);
  },

  async finishConnect(userId: string, platform: PlatformType, creds: ProviderCredentials, adapter = getAdapter(platform), requestId?: string) {
    const uid = toObjectId(userId);
    let resolvedCreds = creds;
    let stage: ConnectStage = 'token';
    try {
      const v = await adapter.validate(creds);
      if (!v.isValid) {
        const reason = v.reason ?? REASON_FOR_KIND[v.kind ?? 'invalid'];
        throw new ConnectError(reason, v.error || `${platform} authorization failed`, { stage: reason === 'permission_missing' ? 'permissions' : 'token' });
      }
      stage = 'account';
      const account = await adapter.resolveAccount(creds);

      // A provider account may be connected by more than one Media Navigator user, so we no longer block reuse.
      // (Historical ownership conflicts are intentionally not enforced.)

      // Reconnecting must never leave the previous channel's media in the analysis: when the resolved channel
      // differs from the stored one, its content and daily snapshots are cleared before the new sync runs.
      const previous = await connectionRepository.findForUser(uid, platform);
      const changedChannel = Boolean(previous && previous.providerAccountId !== account.providerAccountId);

      resolvedCreds = { ...creds, ...account.credentialsPatch };
      const doc = await connectionRepository.upsertConnected(uid, platform, {
        providerAccountId: account.providerAccountId, handle: account.handle, displayName: account.displayName, avatarUrl: account.avatarUrl,
        accountInfo: account.accountInfo, credentialsEnc: sealCredentials(resolvedCreds),
        // Only the kind of credential is recorded (never the credential), so clients can say what data is available.
        authMethod: resolvedCreds.refreshToken || resolvedCreds.instagramLogin ? 'oauth' : resolvedCreds.apiKey && !resolvedCreds.accessToken ? 'api_key' : 'token',
        credentialsExpiresAt: resolvedCreds.expiresAt ? new Date(resolvedCreds.expiresAt) : null,
        ...(changedChannel ? { dataPointsCount: 0 } : {}),
        status: 'syncing', statusMessage: 'Connected. First synchronization queued.',
        nextSyncAt: null,
      });
      if (changedChannel && previous) {
        await Promise.all([
          mediaRepository.deleteForAccount(previous._id),
          analyticsRepository.deleteForAccount(previous._id),
        ]);
      }
      const { run } = await syncService.enqueue(doc, doc.lastSyncedAt ? 'manual' : 'initial', uid);
      await auditRepository.record({ actorId: uid, action: 'connection.connect', targetType: 'connected_account', targetId: String(doc._id), requestId, meta: { platform } });
      return { connection: toPlatformConnection(platform, doc), syncRun: syncRunView(run) };
    } catch (err) {
      throw connectFailure(platform, err, stage, requestId);
    }
  },

  async requestSync(userId: string, platform: PlatformType, requestedBy: string) {
    const acc = await connectionRepository.findForUser(userId, platform);
    if (!acc || !acc.active) throw notFound(`${platform} is not connected`);
    if (acc.status === 'connection_expired') throw badRequest('This connection has expired. Reconnect to continue.');
    const { run, created } = await syncService.enqueue(acc, syncService.typeFor(acc, 'manual'), toObjectId(requestedBy));
    return { alreadyQueued: !created, syncRun: syncRunView(run) };
  },

  async requestSyncAll(userId: string) {
    const accounts = (await connectionRepository.listForUser(userId)).filter((a) => a.active && a.status !== 'connection_expired');
    const runs = [];
    for (const a of accounts) runs.push(syncRunView((await syncService.enqueue(a, syncService.typeFor(a, 'manual'), toObjectId(userId))).run));
    return { syncRuns: runs };
  },

  async getRun(userId: string, runId: string) {
    const run = await syncRunRepository.findByIdForUser(runId, toObjectId(userId));
    if (!run) throw notFound('Sync run not found');
    return syncRunView(run);
  },

  /** Stops future syncing and destroys stored credentials. Historical content is retained until the user deletes their account. */
  async disconnect(userId: string, platform: PlatformType, requestId?: string) {
    const uid = toObjectId(userId);
    const acc = await connectionRepository.findForUser(uid, platform);
    if (!acc) throw notFound(`${platform} is not connected`);
    const updated = await connectionRepository.markDisconnected(uid, platform);
    await DeepAnalysisJob.updateMany({ userId: uid, accountId: acc._id, status: { $in: ['queued', 'processing'] } }, { $set: { status: 'cancelled', error: 'The connected account was disconnected.', leaseOwner: null, leaseExpiresAt: null } });
    await auditRepository.record({ actorId: uid, action: 'connection.disconnect', targetType: 'connected_account', targetId: String(acc._id), requestId, meta: { platform } });
    return toPlatformConnection(platform, updated ?? undefined);
  },

  platforms: () => PLATFORMS,
};
