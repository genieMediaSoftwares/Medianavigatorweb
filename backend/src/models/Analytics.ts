import { Schema, model, type Types } from 'mongoose';
import type { PlatformType } from '../../../shared/types.js';

/** Daily per-account snapshot written after each sync. calcVersion identifies the calculation logic used. */
export interface AnalyticsDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  connectedAccountId: Types.ObjectId;
  platform: PlatformType;
  date: string; // YYYY-MM-DD (UTC)
  calcVersion: number;
  contentCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  meanEngagementRate: number;
  medianEngagementRate: number;
  followersCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AnalyticsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    connectedAccountId: { type: Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    platform: { type: String, required: true },
    date: { type: String, required: true },
    calcVersion: { type: Number, required: true },
    contentCount: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    meanEngagementRate: { type: Number, default: 0 },
    medianEngagementRate: { type: Number, default: 0 },
    followersCount: { type: Number, default: null },
  },
  { timestamps: true },
);
schema.index({ connectedAccountId: 1, date: 1 }, { unique: true });
schema.index({ userId: 1, date: -1 });

export const Analytics = model<AnalyticsDoc>('Analytics', schema);
