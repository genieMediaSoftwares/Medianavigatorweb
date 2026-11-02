import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { encodeCursor } from '../lib/pagination.js';
import { databaseHealth } from '../db/client.js';
import { userRepository } from '../repositories/user.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { connectionRepository } from '../repositories/connection.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { syncRunRepository } from '../repositories/syncRun.repository.js';
import { mediaRepository } from '../repositories/media.repository.js';
import { fileRepository } from '../repositories/file.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { AiCache } from '../models/AiCache.js';
import { syncService } from './sync.service.js';
import { syncRunView } from './connection.service.js';
import { publicUser } from './auth.service.js';
import { profileView } from './user.service.js';
import { User } from '../models/User.js';
import { CreditTransaction } from '../models/CreditTransaction.js';
import { SyncRun } from '../models/SyncRun.js';
import { aiAvailable, aiModel } from './ai/geminiClient.js';
import { storageEnabled } from '../lib/storage.js';
import { emailEnabled } from './email.service.js';
import { PLATFORMS } from '../integrations/registry.js';
import { oauthEnabled } from './oauth.service.js';
import type { ConnectedAccountDoc } from '../models/ConnectedAccount.js';
import { isSuperAdmin, type Role } from '../../../shared/admin.js';
import { releaseConfigurationChecks } from './releaseReadiness.js';

interface Actor { userId: string; requestId?: string; ip?: string }

/** Admin views never include credentials; connection records are projected to non-secret fields only. */
const accountView = (a: ConnectedAccountDoc) => ({
  id: String(a._id), userId: String(a.userId), platform: a.platform, handle: a.handle, status: a.status, active: a.active,
  lastSyncedAt: a.lastSyncedAt ?? null, nextSyncAt: a.nextSyncAt ?? null, lastSyncError: a.lastSyncError ?? null, dataPointsCount: a.dataPointsCount, createdAt: a.createdAt,
  authMethod: a.authMethod ?? null, credentialsExpiresAt: a.credentialsExpiresAt ?? null, missingPermissions: a.missingPermissions ?? [],
  statusMessage: a.statusMessage ?? null,
  // Exactly what the platform reported on the last sync; null where it reported nothing (never estimated).
  coverage: {
    profileCount: typeof a.accountInfo?.mediaCount === 'number' ? a.accountInfo.mediaCount : null,
    accessibleCount: typeof a.accountInfo?.accessibleMediaCount === 'number' ? a.accountInfo.accessibleMediaCount : null,
    syncedCount: a.dataPointsCount,
    listingComplete: typeof a.accountInfo?.mediaListComplete === 'boolean' ? a.accountInfo.mediaListComplete : null,
    checkedAt: a.accountInfo?.mediaListCheckedAt ?? null,
    followersCount: typeof a.accountInfo?.followersCount === 'number' ? a.accountInfo.followersCount : null,
    followsCount: typeof a.accountInfo?.followsCount === 'number' ? a.accountInfo.followsCount : null,
  },
});

/** The most recent sync run of each account (one query per page), for "last attempt" columns. */
async function latestRuns(accountIds: Types.ObjectId[]) {
  if (!accountIds.length) return new Map<string, { status: string; type: string; queuedAt: Date; completedAt: Date | null; errorKind: string | null }>();
  const rows = await SyncRun.aggregate<{ _id: Types.ObjectId; status: string; type: string; queuedAt: Date; completedAt: Date | null; errorKind: string | null }>([
    { $match: { connectedAccountId: { $in: accountIds } } },
    { $sort: { queuedAt: -1 } },
    { $group: { _id: '$connectedAccountId', status: { $first: '$status' }, type: { $first: '$type' }, queuedAt: { $first: '$queuedAt' }, completedAt: { $first: '$completedAt' }, errorKind: { $first: '$errorKind' } } },
  ]);
  return new Map(rows.map(({ _id, ...run }) => [String(_id), { ...run, completedAt: run.completedAt ?? null, errorKind: run.errorKind ?? null }]));
}

// Resolve identities once per page, selecting only fields allowed in staff views.
async function ownerEmails(ids: string[]) {
  const users = await User.find({ _id: { $in: [...new Set(ids)].map((id) => toObjectId(id)) }, deletedAt: null }).select('_id email').lean();
  return new Map(users.map((u) => [String(u._id), u.email]));
}

const page = <T extends { createdAt?: Date; queuedAt?: Date; _id: unknown }>(rows: T[], limit: number, ts: (r: T) => Date) => {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ t: ts(last).getTime(), id: String(last._id) }) : null, limit };
};

export const adminService = {
  async users(q: { limit: number; cursor?: { t: number; id: string }; search?: string }) {
    const rows = await userRepository.page(q);
    const p = page(rows, q.limit, (r) => r.createdAt);
    return { ...p, items: p.items.map(publicUser), total: await userRepository.count() };
  },

  async userDetail(actor: Actor, id: string) {
    const user = await userRepository.findById(id);
    if (!user || user.deletedAt) throw notFound('User not found');
    const [profile, accounts, sessions] = await Promise.all([profileRepository.findByUserId(user._id), connectionRepository.listForUser(user._id), sessionRepository.listForUser(id)]);
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'admin.view_user', targetType: 'user', targetId: id, requestId: actor.requestId, ip: actor.ip });
    const runs = await latestRuns(accounts.map((a) => a._id));
    return { user: publicUser(user), profile: profileView(profile), connections: accounts.map((a) => ({ ...accountView(a), lastRun: runs.get(String(a._id)) ?? null })), activeSessions: sessions.length, lockedUntil: user.lockedUntil ?? null, failedLoginCount: user.failedLoginCount };
  },

  async setRole(actor: Actor, id: string, role: Role) {
    if (id === actor.userId) throw badRequest('You cannot change your own role');
    const target = await userRepository.findById(id);
    if (!target) throw notFound('User not found');
    if (isSuperAdmin(target.role) && !isSuperAdmin(role) && (await userRepository.countAdmins()) <= 1) throw conflict('Cannot remove the last administrator');
    const updated = await userRepository.setRole(id, role);
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'user.role_change', targetType: 'user', targetId: id, ip: actor.ip, requestId: actor.requestId, meta: { from: target.role, to: role } });
    return publicUser(updated!);
  },

  async setStatus(actor: Actor, id: string, status: 'active' | 'disabled') {
    if (id === actor.userId) throw badRequest('You cannot change your own status');
    const target = await userRepository.findById(id);
    if (!target) throw notFound('User not found');
    if (isSuperAdmin(target.role) && status === 'disabled' && (await userRepository.countAdmins()) <= 1) throw conflict('Cannot disable the last administrator');
    const updated = await userRepository.setStatus(id, status);
    if (status === 'disabled') await sessionRepository.revokeAllForUser(id, 'disabled_by_admin');
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: status === 'disabled' ? 'user.disable' : 'user.enable', targetType: 'user', targetId: id, ip: actor.ip, requestId: actor.requestId });
    return publicUser(updated!);
  },

  async adjustCredits(actor: Actor, id: string, amount: number, reason?: string) {
    if (id === actor.userId) throw badRequest('You cannot adjust your own credits');
    const target = await userRepository.findById(id);
    if (!target || target.deletedAt) throw notFound('User not found');
    const updated = await User.findOneAndUpdate({ _id: toObjectId(id), ...(amount < 0 ? { $expr: { $gte: [{ $ifNull: ['$credits', 50] }, -amount] } } : {}) }, [{ $set: { credits: { $add: [{ $ifNull: ['$credits', 50] }, amount] }, updatedAt: '$$NOW' } }], { new: true });
    if (!updated) throw badRequest('Credits cannot go below zero');
    const next = updated.credits ?? 0;
    // Each atomic update knows its own resulting balance, so concurrent adjustments still record correct balances.
    await CreditTransaction.create({ userId: updated._id, kind: 'admin_adjustment', delta: amount, balanceAfter: next, reason: reason ?? null, actorId: toObjectId(actor.userId), requestId: actor.requestId ?? null });
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'user.credits_adjust', targetType: 'user', targetId: id, ip: actor.ip, requestId: actor.requestId, meta: { from: next - amount, to: next, amount, ...(reason ? { reason } : {}) } });
    return publicUser(updated!);
  },

  async creditLedger(id: string, q: { limit: number; cursor?: { t: number; id: string } }) {
    const user = await userRepository.findById(id);
    if (!user || user.deletedAt) throw notFound('User not found');
    const filter: Record<string, unknown> = { userId: user._id };
    if (q.cursor) filter.$or = [{ createdAt: { $lt: new Date(q.cursor.t) } }, { createdAt: new Date(q.cursor.t), _id: { $lt: toObjectId(q.cursor.id) } }];
    const rows = await CreditTransaction.find(filter).sort({ createdAt: -1, _id: -1 }).limit(q.limit + 1).lean();
    const p = page(rows, q.limit, (r) => r.createdAt);
    const actors = await ownerEmails(p.items.flatMap((r) => (r.actorId ? [String(r.actorId)] : [])));
    return {
      ...p,
      items: p.items.map((r) => ({ id: String(r._id), kind: r.kind, delta: r.delta, balanceAfter: r.balanceAfter, reason: r.reason, actorId: r.actorId ? String(r.actorId) : null, actorEmail: r.actorId ? actors.get(String(r.actorId)) ?? null : null, createdAt: r.createdAt })),
      // Stated so clients never present the ledger as a billing history.
      billingEnforced: false,
    };
  },

  async connections(q: { limit: number; cursor?: { t: number; id: string }; status?: string; platform?: string }) {
    const p = page(await connectionRepository.page(q), q.limit, (r) => r.createdAt);
    const [owners, runs] = await Promise.all([ownerEmails(p.items.map((a) => String(a.userId))), latestRuns(p.items.map((a) => a._id))]);
    return { ...p, items: p.items.map((a) => ({ ...accountView(a), ownerEmail: owners.get(String(a.userId)) ?? null, lastRun: runs.get(String(a._id)) ?? null })) };
  },

  async syncRuns(q: { limit: number; cursor?: { t: number; id: string }; status?: string; platform?: string }) {
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.platform) filter.platform = q.platform;
    const p = page(await syncRunRepository.page(filter, q), q.limit, (r) => r.queuedAt!);
    const owners = await ownerEmails(p.items.flatMap((r) => [String(r.userId), ...(r.requestedBy ? [String(r.requestedBy)] : [])]));
    return { ...p, items: p.items.map((r) => ({ ...syncRunView(r), userId: String(r.userId), ownerEmail: owners.get(String(r.userId)) ?? null, connectedAccountId: String(r.connectedAccountId), requestedBy: r.requestedBy ? String(r.requestedBy) : null, requestedByEmail: r.requestedBy ? owners.get(String(r.requestedBy)) ?? null : null })) };
  },

  async triggerSync(actor: Actor, accountId: string) {
    const acc = await connectionRepository.findByIdWithCredentials(toObjectId(accountId));
    if (!acc || !acc.active) throw notFound('Connected account not found');
    const { run, created } = await syncService.enqueue(acc, syncService.typeFor(acc, 'manual'), toObjectId(actor.userId));
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'sync.manual_trigger', targetType: 'connected_account', targetId: accountId, ip: actor.ip, requestId: actor.requestId });
    return { alreadyQueued: !created, syncRun: syncRunView(run) };
  },

  async audit(q: { limit: number; cursor?: { t: number; id: string }; action?: string }) {
    const p = page(await auditRepository.page(q), q.limit, (r) => r.createdAt);
    return { ...p, items: p.items.map((a) => ({ id: String(a._id), actorId: a.actorId ? String(a.actorId) : null, action: a.action, targetType: a.targetType ?? null, targetId: a.targetId ?? null, requestId: a.requestId ?? null, meta: a.meta ?? null, createdAt: a.createdAt })) };
  },

  async system() {
    const [db, users, sessions, byStatus, runsByStatus, content, files, aiEntries] = await Promise.all([
      databaseHealth(), userRepository.count(), sessionRepository.countActive(), connectionRepository.countByStatus(), syncRunRepository.countByStatus(),
      mediaRepository.total(), fileRepository.stats(), AiCache.estimatedDocumentCount(),
    ]);
    return {
      app: { environment: config.server.nodeEnv, uptimeSeconds: Math.round(process.uptime()), node: process.version },
      database: { status: db, readyState: mongoose.connection.readyState },
      counts: { users, activeSessions: sessions, contentItems: content, aiCacheEntries: aiEntries },
      connectedAccountsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
      syncRunsByStatus: Object.fromEntries(runsByStatus.map((s) => [s._id, s.n])),
      storage: { configured: storageEnabled(), files: files[0]?.count ?? 0, bytes: files[0]?.bytes ?? 0 },
      features: {
        ai: { configured: aiAvailable(), model: aiModel() },
        email: { configured: emailEnabled(), provider: config.email?.provider ?? null },
        syncWorker: config.sync.workerEnabled, syncScheduler: config.sync.schedulerEnabled,
        oauth: Object.fromEntries(PLATFORMS.map((p) => [p, oauthEnabled(p)])),
      },
      configurationChecks: releaseConfigurationChecks(config),
    };
  },
};
export type { Types };
