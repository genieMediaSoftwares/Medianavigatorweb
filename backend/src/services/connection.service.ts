import type { PlatformType } from '../../../shared/types.js';
import { badRequest, conflict, providerError, notFound } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { ProviderHttpError } from '../lib/http.js';
import { getAdapter, PLATFORMS } from '../integrations/registry.js';
import type { ProviderCredentials } from '../integrations/types.js';
import { connectionRepository } from '../repositories/connection.repository.js';
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
  async connectWithCredentials(userId: string, platform: PlatformType, input: ProviderCredentials, requestId?: string) {
    const adapter = getAdapter(platform);
    return connectionService.finishConnect(userId, platform, input, adapter, requestId);
  },

  async finishConnect(userId: string, platform: PlatformType, creds: ProviderCredentials, adapter = getAdapter(platform), requestId?: string) {
    const uid = toObjectId(userId);
    let resolvedCreds = creds;
    try {
      const v = await adapter.validate(creds);
      if (!v.isValid) throw badRequest(v.error || `${platform} authorization failed`);
      const account = await adapter.resolveAccount(creds);

      const owner = await ConnectedAccount.findOne({ platform, providerAccountId: account.providerAccountId, active: true }).select('userId').lean<{ userId: unknown }>();
      if (owner && String(owner.userId) !== userId) throw conflict('This account is already connected to another Media Navigator user');

      resolvedCreds = { ...creds, ...account.credentialsPatch };
      const doc = await connectionRepository.upsertConnected(uid, platform, {
        providerAccountId: account.providerAccountId, handle: account.handle, displayName: account.displayName, avatarUrl: account.avatarUrl,
        accountInfo: account.accountInfo, credentialsEnc: sealCredentials(resolvedCreds),
        credentialsExpiresAt: resolvedCreds.expiresAt ? new Date(resolvedCreds.expiresAt) : null,
        status: 'syncing', statusMessage: 'Connected. First synchronization queued.',
        nextSyncAt: null,
      });
      const { run } = await syncService.enqueue(doc, doc.lastSyncedAt ? 'manual' : 'initial', uid);
      await auditRepository.record({ actorId: uid, action: 'connection.connect', targetType: 'connected_account', targetId: String(doc._id), requestId, meta: { platform } });
      return { connection: toPlatformConnection(platform, doc), syncRun: syncRunView(run) };
    } catch (err) {
      if (err instanceof ProviderHttpError) throw providerError(`${platform} is not reachable right now: ${err.message}`);
      throw err;
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
    await auditRepository.record({ actorId: uid, action: 'connection.disconnect', targetType: 'connected_account', targetId: String(acc._id), requestId, meta: { platform } });
    return toPlatformConnection(platform, updated ?? undefined);
  },

  platforms: () => PLATFORMS,
};
