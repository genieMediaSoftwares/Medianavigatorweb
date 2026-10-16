import type { NormalizedMedia } from '../../../../shared/types.js';
import { config } from '../../config/env.js';
import { sha256 } from '../../lib/crypto.js';
import { httpFetch } from '../../lib/http.js';
import { downloadVideo } from './videoInput.js';
import { logger } from '../../lib/logger.js';
import { median } from '../analytics.stats.js';
import type { ProviderCredentials } from '../../integrations/types.js';

/**
 * Evidence for one post's content analysis: live platform numbers, the actual media to show the model,
 * and an account-relative comparison. Nothing here is estimated: a value the platform does not return is
 * recorded as unavailable together with the reason.
 */

type Media = NormalizedMedia & { unavailableMetrics?: string[]; missingMetrics?: string[] };

export interface MetricValue {
  key: string;
  label: string;
  value: number | null;
  unit: 'count' | 'percent' | 'seconds';
  available: boolean;
  /** instagram_live = asked Instagram at analysis time; synced = last sync; derived = exact formula over measured values. */
  source: 'instagram_live' | 'synced' | 'derived';
  note?: string;
}

export interface MetricsSnapshot {
  collectedAt: string;
  items: MetricValue[];
}

export interface Comparison {
  basis: string;
  sampleSize: number;
  sameType: boolean;
  ageDays: number;
  early: boolean;
  caveats: string[];
  rows: Array<{ key: string; label: string; post: number | null; median: number | null; differencePct: number | null }>;
}

export type MediaBasis = 'full_video' | 'youtube_video' | 'image' | 'carousel' | 'thumbnail' | 'none';

export interface VideoInput {
  bytes: Uint8Array;
  mimeType: string;
  label: string;
  /** Read from the MP4 header; null when the file does not say. */
  durationSeconds: number | null;
}

export interface MediaEvidence {
  basis: MediaBasis;
  /** Images to send inline (base64), in order. */
  images: Array<{ data: string; mimeType: string; label: string }>;
  /** Video files to upload to the model's file store, in order. */
  videos: VideoInput[];
  /** Public YouTube URL the model can read directly. */
  youtubeUrl: string | null;
  /** Length of the main video, when known. */
  durationSeconds: number | null;
  notes: string[];
  /** Why the real media could not be obtained (set when basis is thumbnail or none). */
  failure: string | null;
}

interface LiveInstagram {
  mediaType: string | null;
  productType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  children: Array<{ mediaType: string; mediaUrl: string | null; thumbnailUrl: string | null }>;
  likeCount: number | null;
  commentsCount: number | null;
}

const IG_INSIGHTS: Array<{ name: string; key: string; label: string; unit: MetricValue['unit']; reelsOnly?: boolean; ms?: boolean }> = [
  { name: 'views', key: 'views', label: 'Views', unit: 'count' },
  { name: 'reach', key: 'reach', label: 'Accounts reached', unit: 'count' },
  { name: 'saved', key: 'saves', label: 'Saves', unit: 'count' },
  { name: 'shares', key: 'shares', label: 'Shares', unit: 'count' },
  { name: 'total_interactions', key: 'totalInteractions', label: 'Total interactions', unit: 'count' },
  { name: 'profile_visits', key: 'profileVisits', label: 'Profile visits', unit: 'count' },
  { name: 'follows', key: 'follows', label: 'Follows from this post', unit: 'count' },
  { name: 'ig_reels_avg_watch_time', key: 'avgWatchTime', label: 'Average watch time', unit: 'seconds', reelsOnly: true, ms: true },
  { name: 'ig_reels_video_view_total_time', key: 'totalWatchTime', label: 'Total watch time', unit: 'seconds', reelsOnly: true, ms: true },
];

const hosts = () => [`https://graph.facebook.com/${config.providers.metaApiVersion}`, `https://graph.instagram.com/${config.providers.metaApiVersion}`];

/** GET on the Instagram Graph API, trying the Facebook host first and the Instagram host second. */
async function igGet(path: string, token: string): Promise<{ ok: true; data: any } | { ok: false; message: string }> {
  let message = 'No response';
  for (const base of hosts()) {
    try {
      const sep = path.includes('?') ? '&' : '?';
      const res = await httpFetch(`${base}/${path}${sep}access_token=${encodeURIComponent(token)}`);
      const body = await res.json().catch(() => null);
      if (res.ok && body && !body.error) return { ok: true, data: body };
      message = body?.error?.message ?? `HTTP ${res.status}`;
    } catch (err) {
      message = err instanceof Error ? err.message : 'Request failed';
    }
  }
  return { ok: false, message };
}

function insightValue(entry: any): number | null {
  if (typeof entry?.total_value?.value === 'number') return entry.total_value.value;
  if (typeof entry?.values?.[0]?.value === 'number') return entry.values[0].value;
  return null;
}

/** Fresh media URLs and lifetime insights for one Instagram post, one metric per request so one unsupported metric can't hide the rest. */
export async function fetchInstagramLive(creds: ProviderCredentials, providerMediaId: string): Promise<{ live: LiveInstagram | null; metrics: MetricValue[]; liveError: string | null }> {
  const token = creds.pageAccessToken || creds.accessToken;
  if (!token) return { live: null, metrics: [], liveError: 'No stored access token for this account' };

  const media = await igGet(`${providerMediaId}?fields=media_type,media_product_type,media_url,thumbnail_url,like_count,comments_count,children{media_type,media_url,thumbnail_url}`, token);
  const live: LiveInstagram | null = media.ok
    ? {
        mediaType: media.data.media_type ?? null,
        productType: media.data.media_product_type ?? null,
        mediaUrl: media.data.media_url ?? null,
        thumbnailUrl: media.data.thumbnail_url ?? null,
        children: (media.data.children?.data ?? []).map((c: any) => ({ mediaType: c.media_type, mediaUrl: c.media_url ?? null, thumbnailUrl: c.thumbnail_url ?? null })),
        likeCount: typeof media.data.like_count === 'number' ? media.data.like_count : null,
        commentsCount: typeof media.data.comments_count === 'number' ? media.data.comments_count : null,
      }
    : null;

  const isReel = live?.productType === 'REELS' || live?.mediaType === 'VIDEO';
  const wanted = IG_INSIGHTS.filter((m) => !m.reelsOnly || isReel);
  const results = await Promise.all(wanted.map((m) => igGet(`${providerMediaId}/insights?metric=${m.name}`, token)));
  const metrics: MetricValue[] = wanted.map((m, i) => {
    const r = results[i];
    const raw = r.ok ? insightValue(r.data?.data?.[0]) : null;
    const value = raw === null ? null : m.ms ? Math.round(raw / 100) / 10 : raw;
    return {
      key: m.key,
      label: m.label,
      value,
      unit: m.unit,
      available: value !== null,
      source: 'instagram_live',
      ...(value === null ? { note: r.ok ? 'Instagram returned no value for this post' : `Not available from Instagram: ${r.ok ? '' : r.message}`.slice(0, 200) } : {}),
    };
  });
  if (live) {
    metrics.unshift(
      { key: 'likes', label: 'Likes', value: live.likeCount, unit: 'count', available: live.likeCount !== null, source: 'instagram_live', ...(live.likeCount === null ? { note: 'Hidden or not returned by Instagram' } : {}) },
      { key: 'comments', label: 'Comments', value: live.commentsCount, unit: 'count', available: live.commentsCount !== null, source: 'instagram_live', ...(live.commentsCount === null ? { note: 'Not returned by Instagram' } : {}) },
    );
  }
  return { live, metrics, liveError: media.ok ? null : media.message };
}

/** Metrics from the last sync, for platforms without a live insights call (and as a fallback). */
export function syncedMetrics(item: Media): MetricValue[] {
  const missing = new Set([...(item.unavailableMetrics ?? []), ...(item.missingMetrics ?? [])]);
  const m = (key: 'views' | 'reach' | 'likes' | 'comments' | 'shares', label: string): MetricValue => ({
    key, label, value: missing.has(key) ? null : item[key], unit: 'count', available: !missing.has(key), source: 'synced',
    ...(missing.has(key) ? { note: 'Not provided by the platform for this post' } : {}),
  });
  const out = [m('views', 'Views'), m('reach', 'Accounts reached'), m('likes', 'Likes'), m('comments', 'Comments'), m('shares', 'Shares')];
  if (typeof item.watchTimeMinutes === 'number') out.push({ key: 'totalWatchTime', label: 'Total watch time', value: Math.round(item.watchTimeMinutes * 60), unit: 'seconds', available: true, source: 'synced' });
  return out;
}

/** Exact ratios over measured values only (never over a missing or zero denominator). */
export function derivedMetrics(items: MetricValue[]): MetricValue[] {
  const v = (k: string) => items.find((i) => i.key === k && i.available)?.value ?? null;
  const reach = v('reach');
  const pct = (num: number | null, key: string, label: string, formula: string): MetricValue => {
    const ok = num !== null && reach !== null && reach > 0;
    return { key, label, value: ok ? Math.round((num! / reach!) * 10000) / 100 : null, unit: 'percent', available: ok, source: 'derived', note: ok ? formula : `Needs ${formula}; a value is missing or zero` };
  };
  const interactions = v('totalInteractions') ?? (v('likes') !== null && v('comments') !== null ? v('likes')! + v('comments')! + (v('shares') ?? 0) + (v('saves') ?? 0) : null);
  return [
    pct(interactions, 'interactionsPerReach', 'Interactions per account reached', 'interactions ÷ accounts reached × 100'),
    pct(v('saves'), 'saveRate', 'Save rate', 'saves ÷ accounts reached × 100'),
    pct(v('shares'), 'shareRate', 'Share rate', 'shares ÷ accounts reached × 100'),
  ];
}

const MIN_COMPARABLE = 5;

/**
 * Compares the post with the same account's earlier posts on the same platform (same format when there are
 * at least five), using medians. Platforms report lifetime totals, so a young post is flagged as early.
 */
export function compare(item: Media, siblings: Media[], metrics: MetricValue[]): Comparison {
  const published = Date.parse(item.publishedAt);
  const ageDays = Number.isFinite(published) ? Math.max(0, Math.floor((Date.now() - published) / 86_400_000)) : 0;
  const earlier = siblings.filter((m) => m.platform === item.platform && m.id !== item.id && Date.parse(m.publishedAt) < published);
  const sameType = earlier.filter((m) => m.contentType === item.contentType);
  const pool = (sameType.length >= MIN_COMPARABLE ? sameType : earlier).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 30);
  const missing = (m: Media) => new Set([...(m.unavailableMetrics ?? []), ...(m.missingMetrics ?? [])]);
  const postValue = (key: string) => metrics.find((x) => x.key === key && x.available)?.value ?? null;

  const row = (key: 'views' | 'reach' | 'likes' | 'comments' | 'shares', label: string) => {
    const values = pool.filter((m) => !missing(m).has(key)).map((m) => m[key]);
    const med = values.length >= MIN_COMPARABLE ? median(values) : null;
    const post = postValue(key);
    return { key, label, post, median: med, differencePct: post !== null && med !== null && med > 0 ? Math.round(((post - med) / med) * 1000) / 10 : null };
  };
  const ers = pool.filter((m) => !missing(m).has('engagementRate')).map((m) => m.engagementRate);
  const erMed = ers.length >= MIN_COMPARABLE ? median(ers) : null;
  const postEr = missing(item).has('engagementRate') ? null : item.engagementRate;

  const caveats: string[] = [];
  if (pool.length < MIN_COMPARABLE) caveats.push(`Only ${pool.length} earlier ${item.platform} posts to compare with; differences are not reliable yet.`);
  if (sameType.length < MIN_COMPARABLE && pool.length >= MIN_COMPARABLE) caveats.push(`Fewer than ${MIN_COMPARABLE} earlier posts of the same format, so all earlier formats are compared.`);
  const early = ageDays < 7;
  if (early) caveats.push(`Posted ${ageDays} day(s) ago: totals are still growing, so it is compared with older posts' lifetime totals and will look lower than it may end up.`);
  caveats.push('Comparisons use lifetime totals; older posts have had more time to collect views.');

  return {
    basis: `${pool.length} earlier ${sameType.length >= MIN_COMPARABLE ? `${item.contentType} ` : ''}posts on ${item.platform} (median)`,
    sampleSize: pool.length,
    sameType: sameType.length >= MIN_COMPARABLE,
    ageDays,
    early,
    caveats,
    rows: [
      row('views', 'Views'),
      row('reach', 'Accounts reached'),
      row('likes', 'Likes'),
      row('comments', 'Comments'),
      row('shares', 'Shares'),
      { key: 'engagementRate', label: 'Engagement rate (%)', post: postEr, median: erMed, differencePct: postEr !== null && erMed !== null && erMed > 0 ? Math.round(((postEr - erMed) / erMed) * 1000) / 10 : null },
    ],
  };
}

/** Downloads media with a hard size limit. Returns a reason instead of throwing. */
async function download(url: string, maxBytes: number): Promise<{ bytes: Uint8Array; mimeType: string } | { error: string }> {
  try {
    const res = await httpFetch(url, { timeoutMs: Math.min(config.ai.contentAnalysis.timeoutMs, 120_000) });
    if (!res.ok) return { error: `the media address answered HTTP ${res.status} (it may have expired)` };
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) return { error: `the file is ${Math.round(declared / 1048576)} MB, above the ${Math.round(maxBytes / 1048576)} MB limit` };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) return { error: `the file is larger than the ${Math.round(maxBytes / 1048576)} MB limit` };
    if (buf.byteLength === 0) return { error: 'the media address returned no data' };
    return { bytes: buf, mimeType: (res.headers.get('content-type') ?? '').split(';')[0] || 'application/octet-stream' };
  } catch (err) {
    logger.warn('content analysis media download failed', { operation: 'content-analysis', error: err });
    return { error: 'the file could not be downloaded' };
  }
}

const toImage = (d: { bytes: Uint8Array; mimeType: string }, label: string) => ({ data: Buffer.from(d.bytes).toString('base64'), mimeType: d.mimeType.startsWith('image/') ? d.mimeType : 'image/jpeg', label });

/** Duration from an MP4/MOV `mvhd` box (timescale + duration), or null when it can't be read. */
export function mp4DurationSeconds(bytes: Uint8Array): number | null {
  const at = (i: number) => ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
  for (let i = 4; i + 32 < bytes.length; i++) {
    // 'mvhd' = 0x6d 0x76 0x68 0x64
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue;
    const version = bytes[i + 4];
    const box = i + 8;
    const timescale = version === 1 ? at(box + 16) : at(box + 8);
    const duration = version === 1 ? at(box + 20) * 2 ** 32 + at(box + 24) : at(box + 12);
    if (timescale > 0 && duration > 0) return Math.round((duration / timescale) * 10) / 10;
    return null;
  }
  return null;
}

const asVideo = (d: { bytes: Uint8Array; mimeType: string }, label: string): VideoInput => ({
  bytes: d.bytes,
  mimeType: d.mimeType.startsWith('video/') ? d.mimeType : 'video/mp4',
  label,
  durationSeconds: mp4DurationSeconds(d.bytes),
});

/** Thumbnail-only evidence, clearly labelled; used only where the platform never provides the media file. */
export async function thumbnailOnly(item: Media, url: string | null | undefined, why: string): Promise<MediaEvidence> {
  const empty: MediaEvidence = { basis: 'none', images: [], videos: [], youtubeUrl: null, durationSeconds: item.durationSeconds ?? null, notes: [], failure: why };
  if (url) {
    const d = await download(url, config.ai.contentAnalysis.maxMediaBytes);
    if ('bytes' in d) return { ...empty, basis: 'thumbnail', images: [toImage(d, 'thumbnail')], notes: [`${why} Only the cover image was analyzed, not the full content.`] };
  }
  return empty;
}

const VIDEO_FORMATS = new Set(['reel', 'short', 'video']);
const WITHHELD = 'Instagram did not return a usable video file. The API does not explain why. Upload the original video to analyze this post.';

/**
 * Fetches the post's own media through the connected account's authorized API, automatically:
 * the full video for reels/videos, the full image for photos and every slide for carousels.
 * A video is never replaced by its cover image: when the file can't be obtained, `failure` says why.
 */
export async function collectMedia(item: Media, live: LiveInstagram | null, liveError: string | null = null): Promise<MediaEvidence> {
  const max = config.ai.contentAnalysis.maxMediaBytes;
  const base: MediaEvidence = { basis: 'none', images: [], videos: [], youtubeUrl: null, durationSeconds: item.durationSeconds ?? null, notes: [], failure: null };
  const fail = (failure: string): MediaEvidence => ({ ...base, failure });

  if (item.platform === 'youtube') {
    return { ...base, basis: 'youtube_video', youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(item.platformContentId)}` };
  }

  if (item.platform === 'instagram') {
    if (!live) return fail(`The post could not be fetched from Instagram${liveError ? ` (${liveError})` : ''}. Check that the connection is still valid and try again.`);
    const type = live.mediaType;

    if (type === 'VIDEO') {
      if (!live.mediaUrl) {
        if (item.videoUrl) {
          try {
            const blob = await downloadVideo(item.videoUrl);
            const v = asVideo({ bytes: new Uint8Array(await blob.arrayBuffer()), mimeType: blob.type }, 'synced video');
            return { ...base, basis: 'full_video', videos: [v], durationSeconds: v.durationSeconds ?? base.durationSeconds };
          } catch { /* An expired synced URL cannot replace the real video. */ }
        }
        return fail(WITHHELD);
      }
      const d = await download(live.mediaUrl, max);
      if (!('bytes' in d)) return fail(`The video file from Instagram could not be used: ${d.error}.`);
      const v = asVideo(d, 'video');
      return { ...base, basis: 'full_video', videos: [v], durationSeconds: v.durationSeconds ?? base.durationSeconds };
    }

    if (type === 'IMAGE') {
      if (!live.mediaUrl) return fail('Instagram did not return the image file for this post.');
      const d = await download(live.mediaUrl, max);
      if (!('bytes' in d)) return fail(`The image from Instagram could not be used: ${d.error}.`);
      return { ...base, basis: 'image', images: [toImage(d, 'image')] };
    }

    if (type === 'CAROUSEL_ALBUM') {
      const slides = live.children.slice(0, 20);
      const ev: MediaEvidence = { ...base, basis: 'carousel' };
      const missing: number[] = [];
      let budget = max;
      for (const [i, c] of slides.entries()) {
        const label = `slide ${i + 1} of ${slides.length}`;
        if (!c.mediaUrl) { missing.push(i + 1); continue; }
        const d = await download(c.mediaUrl, Math.max(1, budget));
        if (!('bytes' in d)) { missing.push(i + 1); continue; }
        budget -= d.bytes.byteLength;
        if (c.mediaType === 'VIDEO') ev.videos.push(asVideo(d, `${label} (video)`));
        else ev.images.push(toImage(d, label));
      }
      if (live.children.length > 20) ev.notes.push(`Only the first 20 of ${live.children.length} slides were analyzed.`);
      if (missing.length) ev.notes.push(`Slide(s) ${missing.join(', ')} could not be loaded from Instagram and were not analyzed.`);
      if (!ev.images.length && !ev.videos.length) return fail('None of the carousel slides could be loaded from Instagram.');
      return ev;
    }
    return fail(`Instagram returned an unsupported media type (${type ?? 'unknown'}).`);
  }

  // Facebook and LinkedIn do not provide post media files through their APIs.
  if (VIDEO_FORMATS.has(item.contentType)) return fail(`${item.platform} does not provide this video file through its API, so the video cannot be watched.`);
  return thumbnailOnly(item, item.thumbnailUrl, `${item.platform} does not provide the post's full image through its API.`);
}

/** Bucket so tiny changes (a few new views) don't count as new evidence, but real changes (~5%+) do. */
const bucket = (n: number) => Math.round(Math.log1p(Math.max(0, n)) * 20);

/** Fingerprint of the evidence that matters, from synced data (cheap: no platform calls). */
export function evidenceHash(item: Media, version: string): string {
  const missing = [...(item.unavailableMetrics ?? []), ...(item.missingMetrics ?? [])].sort().join(',');
  return sha256([version, item.id, item.contentType, item.caption ?? '', item.thumbnailUrl ?? '', bucket(item.views), bucket(item.reach), bucket(item.likes), bucket(item.comments), bucket(item.shares), missing].join('|')).slice(0, 24);
}
