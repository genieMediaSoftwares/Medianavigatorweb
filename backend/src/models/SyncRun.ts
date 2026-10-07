import { Schema, model, type Types } from 'mongoose';
import type { PlatformType } from '../../../shared/types.js';

export type SyncType = 'initial' | 'incremental' | 'manual' | 'scheduled' | 'retry';
export type SyncStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';

export interface SyncRunDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  connectedAccountId: Types.ObjectId;
  platform: PlatformType;
  type: SyncType;
  status: SyncStatus;
  /** true while queued or running. Backed by a partial unique index: at most one active run per account. */
  active?: boolean;
  requestedBy?: Types.ObjectId | null;
  queuedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
  attempts: number;
  leaseOwner?: string | null;
  leaseExpiresAt?: Date | null;
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errorKind?: string | null;
  errorSummary?: string | null;
  cursor?: string | null;
}

const schema = new Schema<SyncRunDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  connectedAccountId: { type: Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
  platform: { type: String, required: true },
  type: { type: String, enum: ['initial', 'incremental', 'manual', 'scheduled', 'retry'], required: true },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled'], required: true },
  active: { type: Boolean },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  queuedAt: { type: Date, required: true },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, default: null },
  attempts: { type: Number, default: 0 },
  leaseOwner: { type: String, default: null },
  leaseExpiresAt: { type: Date, default: null },
  itemsFetched: { type: Number, default: 0 },
  itemsCreated: { type: Number, default: 0 },
  itemsUpdated: { type: Number, default: 0 },
  itemsSkipped: { type: Number, default: 0 },
  itemsFailed: { type: Number, default: 0 },
  errorKind: { type: String, default: null },
  errorSummary: { type: String, default: null, maxlength: 1000 },
  cursor: { type: String, default: null },
});
schema.index({ connectedAccountId: 1, queuedAt: -1 });
schema.index({ userId: 1, queuedAt: -1 });
schema.index({ status: 1, queuedAt: 1 });
schema.index({ status: 1, leaseExpiresAt: 1 });
schema.index({ connectedAccountId: 1 }, { unique: true, partialFilterExpression: { active: true } });

export const SyncRun = model<SyncRunDoc>('SyncRun', schema);
