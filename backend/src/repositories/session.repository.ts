import type { Types } from 'mongoose';
import { Session, type SessionDoc } from '../models/Session.js';
import { toObjectId } from '../lib/ids.js';

const live = () => ({ revokedAt: null, expiresAt: { $gt: new Date() } });

export const sessionRepository = {
  create: async (data: { userId: Types.ObjectId; refreshTokenHash: string; expiresAt: Date; userAgent?: string; ip?: string }) =>
    (await Session.create({ ...data, lastUsedAt: new Date() })).toObject() as SessionDoc,

  findActiveById: (id: string) => Session.findOne({ _id: toObjectId(id, 'session id'), ...live() }).lean<SessionDoc>(),

  findByRefreshHash: (hash: string) => Session.findOne({ $or: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }] }).lean<SessionDoc>(),

  /** Atomic rotation: only succeeds if the presented hash is still the current one. */
  rotate: (id: Types.ObjectId, currentHash: string, newHash: string, expiresAt: Date) =>
    Session.findOneAndUpdate(
      { _id: id, refreshTokenHash: currentHash, ...live() },
      { $set: { refreshTokenHash: newHash, previousRefreshTokenHash: currentHash, expiresAt, lastUsedAt: new Date() } },
      { new: true },
    ).lean<SessionDoc>(),

  revoke: (id: Types.ObjectId | string, reason: string) =>
    Session.updateOne({ _id: typeof id === 'string' ? toObjectId(id) : id, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: reason } }),

  revokeAllForUser: (userId: Types.ObjectId | string, reason: string, exceptSessionId?: string) =>
    Session.updateMany(
      { userId: typeof userId === 'string' ? toObjectId(userId) : userId, revokedAt: null, ...(exceptSessionId ? { _id: { $ne: toObjectId(exceptSessionId) } } : {}) },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    ),

  listForUser: (userId: string) => Session.find({ userId: toObjectId(userId), ...live() }).sort({ lastUsedAt: -1 }).limit(50).lean<SessionDoc[]>(),

  /** Keeps at most `max` live sessions per user by revoking the least recently used. */
  async enforceLimit(userId: Types.ObjectId, max: number) {
    const sessions = await Session.find({ userId, ...live() }).sort({ lastUsedAt: -1 }).select('_id').lean();
    const excess = sessions.slice(max);
    if (excess.length) await Session.updateMany({ _id: { $in: excess.map((s) => s._id) } }, { $set: { revokedAt: new Date(), revokedReason: 'session_limit' } });
  },
  countActive: () => Session.countDocuments(live()),
};
