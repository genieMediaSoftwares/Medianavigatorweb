import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import type { NormalizedMedia } from '../../../shared/types.js';
import { config } from '../config/env.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';
import { ProviderHttpError } from '../lib/http.js';
import { getAdapter } from '../integrations/registry.js';
import { toContentItem } from '../integrations/mapper.js';
import type { ProviderCredentials, ResolvedAccount } from '../integrations/types.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { syncRunRepository } from '../repositories/syncRun.repository.js';
import { ContentItem } from '../models/ContentItem.js';
import type { ConnectedAccountDoc } from '../models/ConnectedAccount.js';
import type { SyncRunDoc, SyncType } from '../models/SyncRun.js';
import { analyticsService } from './analytics.service.js';
import { notificationService } from './notification.service.js';

export type FailureKind = 'expired' | 'permission' | 'transient' | 'timeout' | 'fatal';

/**
 * Maps provider errors to a failure kind. Existing provider clients throw plain Errors with human messages, so this is
 * necessarily message-based; the patterns are deliberately narrow.
 */
export function classifyFailure(err: unknown): FailureKind {
  if (err instanceof ProviderHttpError) return err.transient ? 'transient' : 'fatal';
  const msg = String((err as Error)?.message ?? err);
  if (/timed out|timeout/i.test(msg)) return 'timeout';
  if (/expired|invalid[_ ]token|invalid_grant|code 190|session has been invalidated|revoked|unauthori[sz]ed|401/i.test(msg)) return 'expired';
  if (/permission|scope|forbidden|403|access denied|not authorized/i.test(msg)) return 'permission';
  if (/rate limit|429|try again|temporar|unavailable|502|503|504|network|ECONN|ETIMEDOUT|fetch failed/i.test(msg)) return 'transient';
  return 'fatal';
}

const safeMessage = (err: unknown) => String((err as Error)?.message ?? err).replace(/(access_token|key|token|secret)=[^&\s]+/gi, '$1=[redacted]').slice(0, 500);

export function readCredentials(account: ConnectedAccountDoc): ProviderCredentials {
  if (!account.credentialsEnc) throw new Error('No stored credentials');
  return JSON.parse(decryptSecret(account.credentialsEnc)) as ProviderCredentials;
}
export const sealCredentials = (c: ProviderCredentials) => encryptSecret(JSON.stringify(c));

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Sync timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });

export const syncService = {
  /** Idempotent: pressing "sync" twice returns the run that is already queued or running. */
  async enqueue(account: Pick<ConnectedAccountDoc, '_id' | 'userId' | 'platform'>, type: SyncType, requestedBy?: Types.ObjectId | null) {
    return syncRunRepository.enqueue({ userId: account.userId, connectedAccountId: account._id, platform: account.platform, type, requestedBy: requestedBy ?? null });
  },

  /** Picks the sync type for a new request: first-ever sync is `initial`, anything else is `incremental`-style. */
  typeFor(account: Pick<ConnectedAccountDoc, 'lastSyncedAt'>, trigger: 'manual' | 'scheduled'): SyncType {
    return account.lastSyncedAt ? trigger : 'initial';
  },

  /** Executes a claimed run end-to-end. Never throws: every outcome is recorded on the run and the account. */
  async execute(run: SyncRunDoc, owner: string): Promise<void> {
    const beat = setInterval(() => { void syncRunRepository.heartbeat(run._id, owner, config.sync.leaseSeconds); }, Math.max(1000, (config.sync.leaseSeconds * 1000) / 3));
    const started = Date.now();
    const log = (msg: string, f: Record<string, unknown> = {}) => logger.info(msg, { operation: 'sync', provider: run.platform, syncRunId: String(run._id), ...f });
    try {
      const account = await connectionRepository.findByIdWithCredentials(run.connectedAccountId);
      if (!account || !account.active || !account.credentialsEnc) {
        await syncRunRepository.finish(run._id, 'cancelled', { errorKind: 'not_connected', errorSummary: 'Account is no longer connected' });
        return;
      }
      if (account.status === 'connection_expired') {
        // Known-bad credentials: do not call the provider again until the user reconnects.
        await syncRunRepository.finish(run._id, 'failed', { errorKind: 'expired', errorSummary: 'Connection expired; reconnect required' });
        return;
      }

      await connectionRepository.setStatus(account._id, 'syncing', 'Synchronizing content…');
      const adapter = getAdapter(account.platform);
      let creds = readCredentials(account);

      if (creds.refreshToken && creds.expiresAt && new Date(creds.expiresAt).getTime() - Date.now() < 5 * 60_000 && adapter.refreshCredentials) {
        creds = await adapter.refreshCredentials(creds);
        await connectionRepository.update(account._id, { credentialsEnc: sealCredentials(creds), credentialsExpiresAt: creds.expiresAt ? new Date(creds.expiresAt) : null });
      }

      const resolved: ResolvedAccount = {
        providerAccountId: account.providerAccountId, handle: account.handle, displayName: account.displayName, avatarUrl: account.avatarUrl,
        accountInfo: account.accountInfo ?? { id: account.providerAccountId },
      };

      // Incremental runs hand known items to the provider client so it skips expensive per-item calls (e.g. Instagram insights).
      const existing = new Map<string, NormalizedMedia>();
      if (run.type !== 'initial') {
        const known = await ContentItem.find({ connectedAccountId: account._id }).select('providerMediaId normalized').lean<Array<{ providerMediaId: string; normalized: NormalizedMedia }>>();
        for (const k of known) { existing.set(k.providerMediaId, k.normalized); existing.set(k.normalized.id, k.normalized); }
      }

      const fetched = await withTimeout(adapter.fetchContent(creds, resolved, { existing }), config.sync.timeoutMs);
      const syncedAt = new Date();
      const docs = fetched.items
        .map((n) => toContentItem(n, { userId: account.userId, connectedAccountId: account._id, capabilities: adapter.capabilities, syncedAt }))
        .filter((d): d is NonNullable<typeof d> => d !== null);
      const skipped = fetched.items.length - docs.length;
      const upserted = await mediaRepository.bulkUpsert(docs);
      const total = await mediaRepository.countForAccount(account._id);

      const permissionBlocked = Boolean(fetched.permissionError);
      const status = permissionBlocked ? 'permission_required' : 'sync_complete';
      const statusMessage = permissionBlocked
        ? fetched.permissionError!.message
        : fetched.partialReason
          ? `Synchronized ${docs.length} items. ${fetched.partialReason}`
          : `Synchronized ${docs.length} items from ${account.handle}.`;
      const updated = await connectionRepository.setStatus(account._id, status, statusMessage, {
        lastSyncedAt: syncedAt,
        lastSyncError: permissionBlocked ? fetched.permissionError!.message : null,
        // Permission problems need user action; scheduling more attempts would only repeat the same failure.
        nextSyncAt: permissionBlocked ? null : new Date(syncedAt.getTime() + config.sync.intervalMinutes * 60_000),
        dataPointsCount: total,
        missingPermissions: permissionBlocked ? fetched.permissionError!.missing : [],
      });

      await analyticsService.recordSnapshot(updated ?? account, docs);
      await notificationService.refreshAlerts(account.userId);
      await notificationService.notify(
        account.userId, permissionBlocked ? 'sync_permission_required' : 'sync_completed',
        permissionBlocked ? `${account.handle}: permissions needed` : `${account.handle}: sync complete`, statusMessage,
        permissionBlocked ? 'medium' : 'info', { platform: account.platform, syncRunId: String(run._id) },
      );

      const outcome = permissionBlocked || fetched.partialReason ? 'partial' : 'succeeded';
      await syncRunRepository.finish(run._id, outcome, {
        itemsFetched: fetched.items.length, itemsCreated: upserted.created, itemsUpdated: upserted.updated, itemsSkipped: skipped, itemsFailed: 0,
        errorKind: permissionBlocked ? 'permission' : null, errorSummary: permissionBlocked ? fetched.permissionError!.message : fetched.partialReason ?? null,
      });
      log('sync finished', { outcome, fetched: fetched.items.length, created: upserted.created, durationMs: Date.now() - started });
    } catch (err) {
      await syncService.recordFailure(run, err);
    } finally {
      clearInterval(beat);
    }
  },

  async recordFailure(run: SyncRunDoc, err: unknown) {
    const kind = classifyFailure(err);
    const summary = safeMessage(err);
    logger.warn('sync failed', { operation: 'sync', provider: run.platform, syncRunId: String(run._id), failureKind: kind, error: summary });
    const account = await connectionRepository.findByIdWithCredentials(run.connectedAccountId);
    if (!account) { await syncRunRepository.finish(run._id, 'failed', { errorKind: kind, errorSummary: summary }); return; }

    const retryable = (kind === 'transient' || kind === 'timeout') && run.attempts < config.sync.maxAttempts;
    if (retryable) {
      // Exponential backoff with jitter; authentication/permission failures are never retried.
      const delay = Math.round(config.providers.retryBaseMs * 2 ** run.attempts * (0.5 + Math.random() / 2) * 10);
      await syncRunRepository.requeue(run._id, delay, summary);
      await connectionRepository.setStatus(account._id, 'syncing', `Temporary provider problem; retrying (attempt ${run.attempts}/${config.sync.maxAttempts}).`);
      return;
    }

    if (kind === 'expired') {
      await connectionRepository.setStatus(account._id, 'connection_expired', 'Your connection has expired. Reconnect to continue analyzing your media.', { lastSyncError: summary, nextSyncAt: null });
      await notificationService.notify(account.userId, 'connection_expired', `${account.handle}: reconnect required`, 'Your access token expired or was revoked.', 'high', { platform: account.platform });
    } else if (kind === 'permission') {
      await connectionRepository.setStatus(account._id, 'permission_required', summary, { lastSyncError: summary, nextSyncAt: null });
    } else {
      await connectionRepository.setStatus(account._id, 'sync_failed', summary, {
        lastSyncError: summary, nextSyncAt: new Date(Date.now() + config.sync.intervalMinutes * 60_000),
      });
      await notificationService.notify(account.userId, 'sync_failed', `${account.handle}: sync failed`, summary, 'medium', { platform: account.platform, syncRunId: String(run._id) });
    }
    await notificationService.refreshAlerts(account.userId);
    await syncRunRepository.finish(run._id, 'failed', { errorKind: kind, errorSummary: summary });
  },

  /** Claims and executes at most one queued run. Returns false when the queue is empty. */
  async runOne(owner: string = `worker-${process.pid}-${crypto.randomBytes(3).toString('hex')}`): Promise<boolean> {
    await syncRunRepository.failExhausted(config.sync.maxAttempts);
    const run = await syncRunRepository.claimNext(owner, config.sync.leaseSeconds, config.sync.maxAttempts);
    if (!run) return false;
    await syncService.execute(run, owner);
    return true;
  },
};
