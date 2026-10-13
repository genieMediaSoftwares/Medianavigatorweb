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
    ...(n.videoUrl ? { videoUrl: n.videoUrl } : {}),
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
export function toNormalized(doc: any): NormalizedMedia & { unavailableMetrics: string[]; contentTypeBasis: string } {
  const norm = doc?.normalized ?? {};
  const pub = doc?.publishedAt ? (doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : String(doc.publishedAt)) : (norm.publishedAt ?? new Date().toISOString());
  const unavail = Array.isArray(doc?.unavailableMetrics) ? doc.unavailableMetrics : Array.isArray(norm.unavailableMetrics) ? norm.unavailableMetrics : [];
  return {
    ...norm,
    id: doc?.legacyId || norm.id || String(doc?._id ?? ''),
    platform: doc?.platform ?? norm.platform ?? 'instagram',
    platformContentId: doc?.providerMediaId ?? norm.platformContentId ?? '',
    contentType: doc?.contentType ?? norm.contentType ?? 'post',
    contentTypeBasis: doc?.contentTypeBasis ?? norm.contentTypeBasis ?? 'provider',
    title: doc?.title !== undefined && doc?.title !== null ? doc.title : (norm.title ?? ''),
    caption: doc?.caption !== undefined && doc?.caption !== null ? doc.caption : (norm.caption ?? ''),
    thumbnailUrl: doc?.thumbnailUrl !== undefined && doc?.thumbnailUrl !== null ? doc.thumbnailUrl : (norm.thumbnailUrl ?? ''),
    mediaUrl: doc?.mediaUrl !== undefined ? doc.mediaUrl : norm.mediaUrl,
    publishedAt: pub,
    views: typeof doc?.views === 'number' ? doc.views : (typeof norm.views === 'number' ? norm.views : 0),
    reach: typeof doc?.reach === 'number' ? doc.reach : (typeof norm.reach === 'number' ? norm.reach : 0),
    likes: typeof doc?.likes === 'number' ? doc.likes : (typeof norm.likes === 'number' ? norm.likes : 0),
    comments: typeof doc?.comments === 'number' ? doc.comments : (typeof norm.comments === 'number' ? norm.comments : 0),
    shares: typeof doc?.shares === 'number' ? doc.shares : (typeof norm.shares === 'number' ? norm.shares : 0),
    saves: doc?.saves !== undefined ? doc.saves : (norm.saves ?? null),
    watchTimeMinutes: doc?.watchTimeMinutes !== undefined ? doc.watchTimeMinutes : (norm.watchTimeMinutes ?? null),
    durationSeconds: doc?.durationSeconds !== undefined ? doc.durationSeconds : (norm.durationSeconds ?? null),
    engagementRate: typeof doc?.engagementRate === 'number' ? doc.engagementRate : (typeof norm.engagementRate === 'number' ? norm.engagementRate : 0),
    unavailableMetrics: unavail,
  };
}
