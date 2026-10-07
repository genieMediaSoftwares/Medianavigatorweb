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
import { aiAvailable, aiModel } from './ai/geminiClient.js';
import { storageEnabled } from '../lib/storage.js';
import { emailEnabled } from './email.service.js';
import { PLATFORMS } from '../integrations/registry.js';
import { oauthEnabled } from './oauth.service.js';
import type { ConnectedAccountDoc } from '../models/ConnectedAccount.js';

interface Actor { userId: string; requestId?: string; ip?: string }

/** Admin views never include credentials; connection records are projected to non-secret fields only. */
const accountView = (a: ConnectedAccountDoc) => ({
  id: String(a._id), userId: String(a.userId), platform: a.platform, handle: a.handle, status: a.status, active: a.active,
  lastSyncedAt: a.lastSyncedAt ?? null, nextSyncAt: a.nextSyncAt ?? null, lastSyncError: a.lastSyncError ?? null, dataPointsCount: a.dataPointsCount, createdAt: a.createdAt,
});

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

  async userDetail(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw notFound('User not found');
    const [profile, accounts, sessions] = await Promise.all([profileRepository.findByUserId(user._id), connectionRepository.listForUser(user._id), sessionRepository.listForUser(id)]);
    return { user: publicUser(user), profile, connections: accounts.map(accountView), activeSessions: sessions.length };
  },

  async setRole(actor: Actor, id: string, role: 'user' | 'admin') {
    if (id === actor.userId) throw badRequest('You cannot change your own role');
    const target = await userRepository.findById(id);
    if (!target) throw notFound('User not found');
    if (target.role === 'admin' && role !== 'admin' && (await userRepository.countAdmins()) <= 1) throw conflict('Cannot remove the last administrator');
    const updated = await userRepository.setRole(id, role);
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'user.role_change', targetType: 'user', targetId: id, ip: actor.ip, requestId: actor.requestId, meta: { from: target.role, to: role } });
    return publicUser(updated!);
  },

  async setStatus(actor: Actor, id: string, status: 'active' | 'disabled') {
    if (id === actor.userId) throw badRequest('You cannot change your own status');
    const target = await userRepository.findById(id);
    if (!target) throw notFound('User not found');
    if (target.role === 'admin' && status === 'disabled' && (await userRepository.countAdmins()) <= 1) throw conflict('Cannot disable the last administrator');
    const updated = await userRepository.setStatus(id, status);
    if (status === 'disabled') await sessionRepository.revokeAllForUser(id, 'disabled_by_admin');
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: status === 'disabled' ? 'user.disable' : 'user.enable', targetType: 'user', targetId: id, ip: actor.ip, requestId: actor.requestId });
    return publicUser(updated!);
  },

  async connections(q: { limit: number; cursor?: { t: number; id: string }; status?: string; platform?: string }) {
    const p = page(await connectionRepository.page(q), q.limit, (r) => r.createdAt);
    return { ...p, items: p.items.map(accountView) };
  },

  async syncRuns(q: { limit: number; cursor?: { t: number; id: string }; status?: string; platform?: string }) {
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.platform) filter.platform = q.platform;
    const p = page(await syncRunRepository.page(filter, q), q.limit, (r) => r.queuedAt!);
    return { ...p, items: p.items.map(syncRunView) };
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
        email: { configured: emailEnabled() },
        syncWorker: config.sync.workerEnabled, syncScheduler: config.sync.schedulerEnabled,
        oauth: Object.fromEntries(PLATFORMS.map((p) => [p, oauthEnabled(p)])),
      },
    };
  },
};
export type { Types };
