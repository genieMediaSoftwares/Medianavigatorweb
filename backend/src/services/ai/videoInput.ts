import type { Types } from 'mongoose';
import { config } from '../../config/env.js';
import { decryptSecret } from '../../lib/crypto.js';
import { mediaRepository } from '../../repositories/media.repository.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import type { ProviderCredentials } from '../../integrations/types.js';
import { AiFailedError } from './geminiClient.js';
import { badRequest } from '../../lib/errors.js';

/** `fps` is how many frames per second Gemini samples; omitted = provider default. */
export type VideoInput = ({ blob: Blob } | { youtubeUrl: string }) & { fps?: number };
const failure = (message: string) => new AiFailedError(message, 'provider_error');
const MAX_BYTES = 100 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120_000;

/** MP4/MOV containers start with an `ftyp` box at byte 4. Anything else (an HTML error page, a truncated body) is not a playable video. */
export const looksLikeMp4 = (bytes: Uint8Array) => bytes.length > 12 && String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === 'ftyp';

export function isVideoCdn(url: URL): boolean {
  return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
    && ['cdninstagram.com', 'fbcdn.net'].some((domain) => url.hostname.endsWith(`.${domain}`));
}

/** Download only provider-owned video CDNs, never a user-supplied arbitrary host. */
export async function downloadVideo(source: string): Promise<Blob> {
  let url = new URL(source);
  const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isVideoCdn(url)) throw failure('The platform did not provide a supported video file URL. Sync this post again.');
    const response = await fetch(url, { redirect: 'manual', signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) break;
      url = new URL(location, url);
      continue;
    }
    const mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !(mimeType.startsWith('video/') || mimeType === 'application/octet-stream') || !response.body) {
      await response.body?.cancel();
      throw failure('The video file is unavailable or expired. Sync the account and retry.');
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body.cancel();
      throw failure('This video exceeds the current 100 MB analysis limit.');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) throw failure('This video exceeds the current 100 MB analysis limit.');
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); }
    if (!size) throw failure('The platform returned an empty video file.');
    const bytes = Buffer.concat(chunks);
    if (!looksLikeMp4(bytes)) throw failure('The platform returned a file that is not a valid MP4 video. Sync the account and retry.');
    return new Blob([bytes], { type: 'video/mp4' });
  }
  throw failure('The video download redirected too many times. Sync the account and retry.');
}

export async function loadVideoInput(userId: Types.ObjectId, mediaId: string): Promise<VideoInput> {
  const doc = await mediaRepository.findByLegacyId(userId, mediaId);
  if (!doc) throw failure('Video not found.');
  if (doc.platform === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(doc.providerMediaId)) {
    return { youtubeUrl: `https://www.youtube.com/watch?v=${doc.providerMediaId}` };
  }
  if (doc.platform !== 'instagram') throw failure('Full video input is currently supported for Instagram and public YouTube videos.');
  const account = await connectionRepository.findForUserWithCredentials(userId, 'instagram');
  if (!account?.active || String(account._id) !== String(doc.connectedAccountId)) throw failure('Reconnect the Instagram account that owns this video.');
  if (!account.credentialsEnc) throw failure('Reconnect Instagram to restore video access.');
  const credentials = JSON.parse(decryptSecret(account.credentialsEnc)) as ProviderCredentials;
  const token = credentials.pageAccessToken || credentials.accessToken;
  if (!token) throw failure('Reconnect Instagram to grant access to the video.');
  // Refresh signed CDN URLs on demand: persisted permalinks are HTML pages, not videos.
  let source: string | undefined;
  const problems: string[] = [];
  for (const host of ['graph.facebook.com', 'graph.instagram.com']) {
    const url = new URL(`https://${host}/${config.providers.metaApiVersion}/${encodeURIComponent(doc.providerMediaId)}`);
    url.searchParams.set('fields', 'media_url,media_type,media_product_type');
    try {
      // Some token types are only accepted as a query parameter, so retry that way before giving up on a host.
      let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(10_000) });
      if (response.status === 400 || response.status === 401) {
        const withQuery = new URL(url); withQuery.searchParams.set('access_token', token);
        response = await fetch(withQuery, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
      }
      const body = await response.json().catch(() => ({})) as { media_url?: string; media_type?: string; media_product_type?: string; error?: { code?: number; message?: string } };
      if (!response.ok) { problems.push(describeGraphError(body.error)); continue; }
      const isVideo = body.media_type === 'VIDEO' || body.media_product_type === 'REELS';
      if (isVideo && body.media_url) { source = body.media_url; break; }
      problems.push(isVideo ? 'Instagram returned no video URL for this post (it can be withheld for Reels with licensed music, or when the account is connected without media access).' : 'This post is not a video.');
    } catch { problems.push('Instagram could not be reached.'); }
  }
  // Last resort: the direct file URL saved at sync time, which is still valid for a while after syncing.
  const synced = (doc as { mediaUrl?: string }).mediaUrl;
  if (!source && synced) { try { if (isVideoCdn(new URL(synced))) source = synced; } catch { /* not a URL */ } }
  if (!source) throw failure(`${[...new Set(problems)].join(' ') || 'Instagram did not grant access to the video file.'} Reconnect Instagram (Instagram Business/Creator account with media permissions) and sync again.`);
  return { blob: await downloadVideo(source) };
}

function describeGraphError(error?: { code?: number; message?: string }): string {
  if (error?.code === 190) return 'The Instagram login has expired.';
  if (error?.code === 10 || error?.code === 200 || (error?.code ?? 0) >= 200 && (error?.code ?? 0) < 300) return 'The Instagram connection lacks permission to read this media.';
  if (error?.code === 100) return 'Instagram could not find this media (it may have been deleted or belongs to another account).';
  return `Instagram refused the request${error?.code ? ` (code ${error.code})` : ''}.`;
}
