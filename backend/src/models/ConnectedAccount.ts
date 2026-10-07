import { Schema, model, type Types } from 'mongoose';
import type { PlatformType } from '../../../shared/types.js';

export type ConnectionState =
  | 'connecting' | 'syncing' | 'sync_complete' | 'sync_failed'
  | 'permission_required' | 'connection_expired' | 'disconnected';

export interface ConnectedAccountDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  platform: PlatformType;
  providerAccountId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  /** AES-256-GCM encrypted JSON of provider credentials. Never returned by any API. */
  credentialsEnc?: string | null;
  credentialsExpiresAt?: Date | null;
  status: ConnectionState;
  statusMessage?: string;
  missingPermissions: string[];
  accountInfo?: { id: string; name?: string; username?: string; followersCount?: number; mediaCount?: number };
  /** true while the connection is live. Used by the partial unique index so a provider account has at most one live owner. */
  active: boolean;
  dataPointsCount: number;
  lastSyncedAt?: Date | null;
  lastSyncError?: string | null;
  nextSyncAt?: Date | null;
  syncCursor?: string | null;
  disconnectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ConnectedAccountDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, enum: ['instagram', 'facebook', 'youtube', 'linkedin'], required: true },
    providerAccountId: { type: String, required: true },
    handle: { type: String, required: true, maxlength: 200 },
    displayName: { type: String, maxlength: 200 },
    avatarUrl: { type: String, maxlength: 2000 },
    credentialsEnc: { type: String, default: null, select: false },
    credentialsExpiresAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['connecting', 'syncing', 'sync_complete', 'sync_failed', 'permission_required', 'connection_expired', 'disconnected'],
      required: true,
    },
    statusMessage: { type: String, maxlength: 1000 },
    missingPermissions: { type: [String], default: [] },
    accountInfo: { type: Schema.Types.Mixed },
    active: { type: Boolean, default: true },
    dataPointsCount: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null, maxlength: 1000 },
    nextSyncAt: { type: Date, default: null },
    syncCursor: { type: String, default: null },
    disconnectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
// One connection document per user per platform (reconnecting reuses it).
schema.index({ userId: 1, platform: 1 }, { unique: true });
// A provider account can have only one live owner.
schema.index({ platform: 1, providerAccountId: 1 }, { unique: true, partialFilterExpression: { active: true } });
schema.index({ active: 1, nextSyncAt: 1 });
schema.index({ status: 1, updatedAt: -1 });

export const ConnectedAccount = model<ConnectedAccountDoc>('ConnectedAccount', schema);
