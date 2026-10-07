import type { Types } from 'mongoose';
import { ConnectedAccount, type ConnectedAccountDoc, type ConnectionState } from '../models/ConnectedAccount.js';
import type { PlatformType } from '../../../shared/types.js';
import { toObjectId } from '../lib/ids.js';

export const connectionRepository = {
  listForUser: (userId: string | Types.ObjectId) =>
    ConnectedAccount.find({ userId: typeof userId === 'string' ? toObjectId(userId) : userId }).lean<ConnectedAccountDoc[]>(),

  findForUser: (userId: string | Types.ObjectId, platform: PlatformType) =>
    ConnectedAccount.findOne({ userId: typeof userId === 'string' ? toObjectId(userId) : userId, platform }).lean<ConnectedAccountDoc>(),

  /** Includes the encrypted credential blob. Use only inside sync/connection services. */
  findForUserWithCredentials: (userId: string | Types.ObjectId, platform: PlatformType) =>
    ConnectedAccount.findOne({ userId: typeof userId === 'string' ? toObjectId(userId) : userId, platform }).select('+credentialsEnc').lean<ConnectedAccountDoc>(),

  findByIdWithCredentials: (id: Types.ObjectId | string) =>
    ConnectedAccount.findById(typeof id === 'string' ? toObjectId(id) : id).select('+credentialsEnc').lean<ConnectedAccountDoc>(),

  async upsertConnected(userId: Types.ObjectId, platform: PlatformType, data: Partial<ConnectedAccountDoc> & { providerAccountId: string; handle: string; credentialsEnc: string }) {
    return ConnectedAccount.findOneAndUpdate(
      { userId, platform },
      { $set: { ...data, active: true, disconnectedAt: null, lastSyncError: null, missingPermissions: data.missingPermissions ?? [] }, $setOnInsert: { userId, platform } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean<ConnectedAccountDoc>();
  },

  setStatus: (id: Types.ObjectId, status: ConnectionState, statusMessage?: string, extra: Partial<ConnectedAccountDoc> = {}) =>
    ConnectedAccount.findOneAndUpdate({ _id: id }, { $set: { status, statusMessage, ...extra } }, { new: true }).lean<ConnectedAccountDoc>(),

  update: (id: Types.ObjectId, set: Partial<ConnectedAccountDoc>) =>
    ConnectedAccount.findOneAndUpdate({ _id: id }, { $set: set }, { new: true }).lean<ConnectedAccountDoc>(),

  markDisconnected: (userId: Types.ObjectId, platform: PlatformType) =>
    ConnectedAccount.findOneAndUpdate(
      { userId, platform },
      { $set: { status: 'disconnected', statusMessage: 'Disconnected', active: false, credentialsEnc: null, disconnectedAt: new Date(), nextSyncAt: null, lastSyncError: null } },
      { new: true },
    ).lean<ConnectedAccountDoc>(),

  /** Live, healthy accounts whose next sync is due. */
  findDue: (now: Date, limit: number) =>
    ConnectedAccount.find({ active: true, status: { $in: ['sync_complete', 'sync_failed'] }, nextSyncAt: { $lte: now } })
      .sort({ nextSyncAt: 1 })
      .limit(limit)
      .select('_id userId platform')
      .lean<Pick<ConnectedAccountDoc, '_id' | 'userId' | 'platform'>[]>(),

  async page(params: { limit: number; cursor?: { t: number; id: string }; status?: string; platform?: string }) {
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;
    if (params.platform) filter.platform = params.platform;
    if (params.cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(params.cursor.t) } },
        { createdAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return ConnectedAccount.find(filter).sort({ createdAt: -1, _id: -1 }).limit(params.limit + 1).lean<ConnectedAccountDoc[]>();
  },
  countByStatus: () => ConnectedAccount.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
};
