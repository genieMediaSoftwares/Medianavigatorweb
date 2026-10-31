import type { Types } from 'mongoose';
import { config } from '../../config/env.js';
import { AppError, mediaUnavailable } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { toNormalized } from '../../integrations/mapper.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { readCredentials } from '../sync.service.js';
import { loadAnalyticsContext } from '../analytics.service.js';
import {
  collectMedia, compare, derivedMetrics, fetchInstagramLive, mp4DurationSeconds, syncedMetrics, thumbnailOnly,
  type Comparison, type MediaEvidence, type MetricsSnapshot, type MetricValue,
} from './contentEvidence.js';
import { INSTAGRAM_LOGIN_EXPIRED, loadFacebookVideo, loadVideoInput } from './videoInput.js';

export { INSTAGRAM_LOGIN_EXPIRED };

const VIDEO_TYPES = new Set(['reel', 'short', 'video']);
const VIDEO_BASIS = new Set(['full_video', 'youtube_video']);

export interface PostEvidence {
  item: ReturnType<typeof toNormalized>;
  /** Measured metrics for this post: live from the platform when possible, otherwise the last sync. */
  metrics: MetricsSnapshot;
  /** This post against the account's own earlier posts on the same platform. */
  comparison: Comparison;
  /** The post's own media: the real video, the real images, or an explicitly labelled limited review. */
  media: MediaEvidence;
  /** True when the post is a video (live media type first, synced format as the fallback). */
  videoPost: boolean;
  /** Why live metrics could not be read, when they could not. */
  liveError: string | null;
  /** The freshest cover image for this post: live from the platform when available, otherwise the synced one. */
  coverUrl: string | null;
}

export interface GatherOptions {
  /** A video the user uploaded for this post, used instead of fetching the platform's file. */
  uploadedVideo?: Uint8Array;
  /** When false, a missing video is an error instead of a limited (cover-only) review. */
  allowLimitedReview?: boolean;
}

/**
 * Gathers everything an analysis may claim from: the post's own media, its measured metrics and its
 * comparison with the account's earlier posts. One implementation, so every analysis of a post sees
 * exactly the same evidence and can never disagree about the numbers.
 */
export async function gatherPostEvidence(uid: Types.ObjectId, mediaId: string, opts: GatherOptions = {}): Promise<PostEvidence> {
  const doc = await mediaRepository.findByIdOrLegacy(uid, mediaId);
  if (!doc) throw new AppError('NOT_FOUND', 'Media not found');
  const item = toNormalized(doc);
  const ctx = await loadAnalyticsContext(uid);
  const account = await connectionRepository.findByIdWithCredentials(doc.connectedAccountId);

  // 1. Measured numbers: live from Instagram when possible, otherwise the last sync.
  let metricItems: MetricValue[] = syncedMetrics(item);
  let live = null;
  let liveError: string | null = null;
  let loginExpired = false;
  if (item.platform === 'instagram') {
    if (!account?.credentialsEnc) liveError = 'the Instagram connection has no stored access';
    else {
      try {
        const r = await fetchInstagramLive(readCredentials(account), doc.providerMediaId);
        live = r.live;
        liveError = r.liveError;
        loginExpired = r.loginExpired;
        if (r.metrics.length) metricItems = r.metrics;
      } catch (err) {
        liveError = 'Instagram could not be reached';
        logger.warn('post evidence live instagram fetch failed', { operation: 'post-evidence', error: err });
      }
    }
  }
  const metrics: MetricsSnapshot = { collectedAt: new Date().toISOString(), items: [...metricItems, ...derivedMetrics(metricItems)] };
  const comparison = compare(item, ctx.media, metricItems);

  // 2. The post's own media, fetched automatically. Without real visual evidence there is no content analysis.
  const loadInstagramVideo = async (): Promise<Blob> => {
    const input = await loadVideoInput(uid, mediaId);
    if (!('blob' in input)) throw new AppError('MEDIA_UNAVAILABLE', 'Instagram did not return a video file for this post.');
    return input.blob;
  };
  let media: MediaEvidence = opts.uploadedVideo ? {
    basis: 'full_video', images: [], videos: [{ bytes: opts.uploadedVideo, mimeType: 'video/mp4', label: 'User-provided original video', durationSeconds: mp4DurationSeconds(opts.uploadedVideo) }], youtubeUrl: null,
    durationSeconds: mp4DurationSeconds(opts.uploadedVideo), failure: null,
    notes: ['This analysis uses the video you uploaded alongside this post’s metrics. Its match to the published post has not been independently verified.'],
  } : await collectMedia(item, live, liveError,
    item.platform === 'instagram' ? { loadVideo: loadInstagramVideo }
      : item.platform === 'facebook' ? { loadVideo: () => loadFacebookVideo(uid, mediaId) } : {});
  const videoPost = live ? live.mediaType === 'VIDEO' : VIDEO_TYPES.has(item.contentType);
  if (loginExpired && account && !opts.uploadedVideo) {
    await connectionRepository.setStatus(account._id, 'connection_expired', 'Instagram login expired; reconnect required').catch(() => undefined);
    throw mediaUnavailable(INSTAGRAM_LOGIN_EXPIRED);
  }
  if (videoPost && !VIDEO_BASIS.has(media.basis)) {
    if (opts.allowLimitedReview === false) throw mediaUnavailable(media.failure ?? 'The full video is unavailable.');
    media = await thumbnailOnly(item, live?.thumbnailUrl || item.thumbnailUrl,
      'The full video is unavailable. This is a limited review of the cover, caption and measured performance; scenes, audio and pacing were not assessed.');
  }
  if (media.basis === 'none' && !item.caption && !item.title) throw mediaUnavailable('There is not enough content available to review this post. Sync the account and try again.');
  if (media.basis === 'none') media.notes.push('No visual media was available. Only the caption and measured performance were reviewed.');

  return { item, metrics, comparison, media, videoPost, liveError, coverUrl: live?.thumbnailUrl || item.thumbnailUrl || null };
}
