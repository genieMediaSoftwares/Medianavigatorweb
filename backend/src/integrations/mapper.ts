import type { Types } from 'mongoose';
import type { NormalizedMedia } from '../../../shared/types.js';
import type { ContentItemDoc } from '../models/ContentItem.js';
import type { ProviderCapabilities } from './types.js';

/** Maps a provider-normalized record into the persisted ContentItem shape. Idempotent by (connectedAccountId, providerMediaId). */
export function toContentItem(
  n: NormalizedMedia,
  ctx: { userId: Types.ObjectId; connectedAccountId: Types.ObjectId; capabilities: ProviderCapabilities; syncedAt: Date },
): Omit<ContentItemDoc, '_id' | 'createdAt' | 'updatedAt'> | null {
  const publishedAt = new Date(n.publishedAt);
  if (!n.platformContentId || Number.isNaN(publishedAt.getTime())) return null;

  const unavailable = new Set(ctx.capabilities.unavailableMetrics);
  // A metric the platform returned as 0 for every field is indistinguishable from "not exposed"; only flag views when
  // there is no evidence the platform reported them for this item.
  if (n.platform === 'facebook' && !n.views) unavailable.add('views');
  if (!n.reach) unavailable.add('reach');
  for (const m of n.missingMetrics ?? []) unavailable.add(m);

  return {
    userId: ctx.userId,
    connectedAccountId: ctx.connectedAccountId,
    platform: n.platform,
    providerMediaId: n.platformContentId,
    legacyId: n.id,
    contentType: n.contentType,
    contentTypeBasis: n.platform === 'youtube' && (n.contentType === 'short' || n.contentType === 'video') ? 'inferred' : 'provider',
    title: n.title ?? '',
    caption: n.caption ?? '',
    thumbnailUrl: n.thumbnailUrl || undefined,
    mediaUrl: n.mediaUrl,
    publishedAt,
    durationSeconds: n.durationSeconds ?? null,
    views: n.views ?? 0,
    reach: n.reach ?? 0,
    likes: n.likes ?? 0,
    comments: n.comments ?? 0,
    shares: n.shares ?? 0,
    saves: null,
    watchTimeMinutes: n.watchTimeMinutes ?? null,
    engagementRate: n.engagementRate ?? 0,
    unavailableMetrics: [...unavailable],
    // The per-provider "explanation"/"primarySignal" strings were templated text, not analysis. Keep only what was measured;
    // real interpretation comes from the analytics engine and the AI layer.
    normalized: {
      ...n, isDemo: undefined,
      primarySignal: { ...n.primarySignal, label: 'Views', value: n.views ? `${n.views.toLocaleString('en-US')} views` : `${(n.likes + n.comments).toLocaleString('en-US')} likes and comments` },
      explanation: { observedFact: `${n.views.toLocaleString('en-US')} views, ${n.likes.toLocaleString('en-US')} likes, ${n.comments.toLocaleString('en-US')} comments.`, possibleReason: '', whatToRepeat: [] },
    },
    syncedAt: ctx.syncedAt,
  };
}

/** Restores the legacy client contract from a stored item. */
export function toNormalized(doc: Pick<ContentItemDoc, 'normalized' | 'legacyId' | 'unavailableMetrics' | 'contentTypeBasis'>): NormalizedMedia & { unavailableMetrics: string[]; contentTypeBasis: string } {
  return { ...doc.normalized, id: doc.legacyId, unavailableMetrics: doc.unavailableMetrics, contentTypeBasis: doc.contentTypeBasis };
}
