import type { Types } from 'mongoose';
import { SyncRun, type SyncRunDoc, type SyncType, type SyncStatus } from '../models/SyncRun.js';
import type { PlatformType } from '../../../shared/types.js';
import { toObjectId } from '../lib/ids.js';

export const syncRunRepository = {
  /**
   * Enqueues a run. The partial unique index (one active run per account) makes this safe against double clicks and
   * concurrent schedulers: a duplicate returns the already-active run with `created: false`.
   */
  async enqueue(data: { userId: Types.ObjectId; connectedAccountId: Types.ObjectId; platform: PlatformType; type: SyncType; requestedBy?: Types.ObjectId | null }) {
    try {
      const doc = await SyncRun.create({ ...data, status: 'queued', active: true, queuedAt: new Date() });
      return { run: doc.toObject() as SyncRunDoc, created: true };
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await SyncRun.findOne({ connectedAccountId: data.connectedAccountId, active: true }).lean<SyncRunDoc>();
        if (existing) return { run: existing, created: false };
      }
      throw err;
    }
  },

  /** Atomically claims the oldest queued run, or a running run whose lease expired (crashed worker). */
  claimNext: (owner: string, leaseSeconds: number, maxAttempts: number) => {
    const now = new Date();
    return SyncRun.findOneAndUpdate(
      {
        active: true,
        attempts: { $lt: maxAttempts },
        $or: [{ status: 'queued', queuedAt: { $lte: now } }, { status: 'running', leaseExpiresAt: { $lt: now } }],
      },
      { $set: { status: 'running', leaseOwner: owner, leaseExpiresAt: new Date(now.getTime() + leaseSeconds * 1000), startedAt: now }, $inc: { attempts: 1 } },
      { sort: { queuedAt: 1 }, new: true },
    ).lean<SyncRunDoc>();
  },

  /** Puts a failed-but-retryable run back on the queue after a delay. */
  requeue: (id: Types.ObjectId, delayMs: number, errorSummary: string) =>
    SyncRun.updateOne({ _id: id }, { $set: { status: 'queued', queuedAt: new Date(Date.now() + delayMs), leaseOwner: null, leaseExpiresAt: null, errorSummary } }),

  heartbeat: (id: Types.ObjectId, owner: string, leaseSeconds: number) =>
    SyncRun.updateOne({ _id: id, leaseOwner: owner, status: 'running' }, { $set: { leaseExpiresAt: new Date(Date.now() + leaseSeconds * 1000) } }),

  async finish(id: Types.ObjectId, status: Extract<SyncStatus, 'succeeded' | 'partial' | 'failed' | 'cancelled'>, fields: Partial<SyncRunDoc>) {
    const run = await SyncRun.findById(id).select('startedAt').lean<{ startedAt?: Date }>();
    const completedAt = new Date();
    return SyncRun.findOneAndUpdate(
      { _id: id },
      {
        $set: { ...fields, status, completedAt, durationMs: run?.startedAt ? completedAt.getTime() - run.startedAt.getTime() : null, leaseOwner: null, leaseExpiresAt: null },
        $unset: { active: '' },
      },
      { new: true },
    ).lean<SyncRunDoc>();
  },

  /** Runs that exhausted their attempts while still marked active would block the account forever; close them out. */
  failExhausted: (maxAttempts: number) =>
    SyncRun.updateMany(
      { active: true, status: 'running', attempts: { $gte: maxAttempts }, leaseExpiresAt: { $lt: new Date() } },
      { $set: { status: 'failed', errorKind: 'lease_expired', errorSummary: 'Worker stopped before the sync completed', completedAt: new Date() }, $unset: { active: '' } },
    ),

  findActiveForAccount: (connectedAccountId: Types.ObjectId) => SyncRun.findOne({ connectedAccountId, active: true }).lean<SyncRunDoc>(),
  findByIdForUser: (id: string, userId: Types.ObjectId) => SyncRun.findOne({ _id: toObjectId(id, 'sync run id'), userId }).lean<SyncRunDoc>(),
  latestForAccount: (connectedAccountId: Types.ObjectId) => SyncRun.findOne({ connectedAccountId }).sort({ queuedAt: -1 }).lean<SyncRunDoc>(),

  async page(filter: Record<string, unknown>, params: { limit: number; cursor?: { t: number; id: string } }) {
    const f: Record<string, unknown> = { ...filter };
    if (params.cursor) {
      f.$or = [
        { queuedAt: { $lt: new Date(params.cursor.t) } },
        { queuedAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return SyncRun.find(f).sort({ queuedAt: -1, _id: -1 }).limit(params.limit + 1).lean<SyncRunDoc[]>();
  },
  countByStatus: () => SyncRun.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
};
