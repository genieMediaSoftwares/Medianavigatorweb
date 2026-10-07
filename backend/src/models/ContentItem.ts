import { Schema, model, type Types } from 'mongoose';
import type { PlatformType, NormalizedMedia } from '../../../shared/types.js';

export interface ContentItemDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  connectedAccountId: Types.ObjectId;
  platform: PlatformType;
  providerMediaId: string;
  /** Stable id used by existing clients (e.g. ig_1789...). */
  legacyId: string;
  contentType: NormalizedMedia['contentType'];
  /** 'provider' = declared by the platform API; 'inferred' = our heuristic (e.g. YouTube Shorts vs long video). */
  contentTypeBasis: 'provider' | 'inferred';
  title: string;
  caption: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  publishedAt: Date;
  durationSeconds?: number | null;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number | null;
  watchTimeMinutes?: number | null;
  engagementRate: number;
  /** Metrics the provider/API/permissions do not expose for this item. They are NOT zero, they are unknown. */
  unavailableMetrics: string[];
  /** Full normalized record as produced by the provider mapper (kept for contract compatibility). */
  normalized: NormalizedMedia;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ContentItemDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    connectedAccountId: { type: Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    platform: { type: String, enum: ['instagram', 'facebook', 'youtube', 'linkedin'], required: true },
    providerMediaId: { type: String, required: true },
    legacyId: { type: String, required: true },
    contentType: { type: String, enum: ['reel', 'short', 'video', 'post', 'article', 'carousel'], required: true },
    contentTypeBasis: { type: String, enum: ['provider', 'inferred'], default: 'provider' },
    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    thumbnailUrl: { type: String },
    mediaUrl: { type: String },
    publishedAt: { type: Date, required: true },
    durationSeconds: { type: Number, default: null },
    views: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: null },
    watchTimeMinutes: { type: Number, default: null },
    engagementRate: { type: Number, default: 0 },
    unavailableMetrics: { type: [String], default: [] },
    normalized: { type: Schema.Types.Mixed, required: true },
    syncedAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ connectedAccountId: 1, providerMediaId: 1 }, { unique: true });
schema.index({ connectedAccountId: 1, publishedAt: -1 });
schema.index({ userId: 1, publishedAt: -1 });
schema.index({ userId: 1, platform: 1, publishedAt: -1 });
schema.index({ userId: 1, legacyId: 1 }, { unique: true });
schema.index({ platform: 1, contentType: 1 });

export const ContentItem = model<ContentItemDoc>('ContentItem', schema);
