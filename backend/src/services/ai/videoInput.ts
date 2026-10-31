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
export const INSTAGRAM_LOGIN_EXPIRED = 'Your Instagram login has expired. Reconnect Instagram from Connections, then run the analysis again.';
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

/**
 * A Facebook Page video's file, through the connected Page token: the post's video attachment → the video's `source`
 * (a signed fbcdn.net MP4, fetched fresh because it expires). Only the Page that owns the post can be used.
 */
export async function loadFacebookVideo(userId: Types.ObjectId, mediaId: string): Promise<Blob> {
  const doc = await mediaRepository.findByIdOrLegacy(userId, mediaId);
  if (!doc || doc.platform !== 'facebook') throw failure('Video not found.');
  const account = await connectionRepository.findForUserWithCredentials(userId, 'facebook');
  if (!account?.active || String(account._id) !== String(doc.connectedAccountId) || !account.credentialsEnc) throw failure('Reconnect the Facebook Page that owns this video.');
  const credentials = JSON.parse(decryptSecret(account.credentialsEnc)) as ProviderCredentials;
  const token = credentials.pageAccessToken || credentials.accessToken;
  if (!token) throw failure('Reconnect Facebook to grant access to the video.');
  const graph = async (path: string, fields: string): Promise<any> => {
    const url = new URL(`https://graph.facebook.com/${config.providers.metaApiVersion}/${encodeURIComponent(path)}`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('access_token', token);
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    const body = await response.json().catch(() => ({})) as any;
    if (!response.ok) throw failure(`Facebook did not return this video (${describeGraphError(body.error)})`);
    return body;
  };
  const post = await graph(doc.providerMediaId, 'attachments{media_type,target{id}}');
  const attachment = (post.attachments?.data ?? []).find((a: any) => a.media_type === 'video');
  if (!attachment?.target?.id) throw failure('This Facebook post has no video attachment.');
  const video = await graph(attachment.target.id, 'source');
  if (!video.source) throw failure('Facebook did not provide the video file for this post (it can be withheld for some videos, e.g. with licensed music).');
  return downloadVideo(video.source);
}

export async function loadVideoInput(userId: Types.ObjectId, mediaId: string, options: { allowThirdParty?: boolean } = {}): Promise<VideoInput> {
  const doc = await mediaRepository.findByIdOrLegacy(userId, mediaId);
  if (!doc) throw failure('Video not found.');
  if (doc.platform === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(doc.providerMediaId)) {
    return { youtubeUrl: `https://www.youtube.com/watch?v=${doc.providerMediaId}` };
  }
  if (doc.platform !== 'instagram') throw failure('Full video input is currently supported for Instagram and public YouTube videos.');
  // The post ownership lookup above authorizes this request. Public media does not
  // require a still-valid token; private API data continues to require one below.
  const publicVideo = await retrievePublicVideo(doc.mediaUrl);
  if (publicVideo) return { blob: publicVideo };
  const account = await connectionRepository.findForUserWithCredentials(userId, 'instagram');
  if (!account?.active || String(account._id) !== String(doc.connectedAccountId)) throw failure('Reconnect the Instagram account that owns this video.');
  if (!account.credentialsEnc) throw failure('Reconnect Instagram to restore video access.');
  const credentials = JSON.parse(decryptSecret(account.credentialsEnc)) as ProviderCredentials;
  const token = credentials.pageAccessToken || credentials.accessToken;
  if (!token) throw failure('Reconnect Instagram to grant access to the video.');
  // Refresh signed CDN URLs on demand: persisted permalinks are HTML pages, not videos.
  let source: string | undefined;
  const problems: string[] = [];
  let loginExpired = false;
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
      if (!response.ok) { if (body.error?.code === 190) loginExpired = true; problems.push(describeGraphError(body.error)); continue; }
      const isVideo = body.media_type === 'VIDEO' || body.media_product_type === 'REELS';
      if (isVideo && body.media_url) { source = body.media_url; break; }
      problems.push(isVideo ? 'Instagram returned no video URL for this post (it can be withheld for Reels with licensed music, or when the account is connected without media access).' : 'This post is not a video.');
    } catch { problems.push('Instagram could not be reached.'); }
  }
  // Last resort 1: the direct file URL saved at sync time, which is still valid for a while after syncing.
  const synced = (doc as { videoUrl?: string }).videoUrl;
  if (!source && synced) { try { if (isVideoCdn(new URL(synced))) source = synced; } catch { /* not a URL */ } }
// Last resort 2: read the reel's public page and extract the direct video URL embedded in it.
  // This keeps analysis working when the graph token is expired or the API withheld the URL,
  // provided the post is public.
  const publicUrl = instagramPermalink(doc.mediaUrl);
  if (!source && publicUrl) {
    try {
      const response = await fetch(publicUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', accept: 'text/html' },
      });
      if (response.ok) {
        const html = await response.text();
        const unescape = (s: string) => s.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        const patterns = [
          /property=["']og:video["'][^>]*content=["']([^"']+)["']/i,
          /content=["']([^"']+)["'][^>]*property=["']og:video(?::secure_url)?["']/i,
          /"video_url"\s*:\s*"([^"]+)"/i,
          /"video_versions"\s*:\s*\[[^\]]*"url"\s*:\s*"([^"]+)"/i,
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            const candidate = unescape(match[1]);
            try {
              const url = new URL(candidate);
              if (isVideoCdn(url)) { source = candidate; break; }
            } catch { /* not a URL */ }
          }
        }
      }
    } catch { /* public page not reachable */ }
  }

  // Last resort 3: ask Firecrawl to render and scrape the public page when direct fetching is blocked.
  if (!source && options.allowThirdParty && config.firecrawl && publicUrl) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.firecrawl}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, formats: ['html'], onlyMainContent: false, timeout: 20000 }),
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = await response.json().catch(() => ({}) as Record<string, unknown>);
        const html = (body.data as { html?: string } | undefined)?.html ?? (typeof body.html === 'string' ? body.html : '');
        const unescape = (s: string) => s.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        const patterns = [
          /property=["']og:video["'][^>]*content=["']([^"']+)["']/i,
          /content=["']([^"']+)["'][^>]*property=["']og:video(?::secure_url)?["']/i,
          /"video_url"\s*:\s*"([^"]+)"/i,
          /"video_versions"\s*:\s*\[[^\]]*"url"\s*:\s*"([^"]+)"/i,
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            const candidate = unescape(match[1]);
            try {
              const url = new URL(candidate);
              if (isVideoCdn(url)) { source = candidate; break; }
            } catch { /* not a URL */ }
          }
        }
      }
    } catch { /* Firecrawl not reachable */ }
  }

  if (!source && loginExpired) {
    // The token is dead: record it so the Connections page asks for a reconnect instead of failing again later.
    await connectionRepository.setStatus(account._id, 'connection_expired', 'Instagram login expired; reconnect required').catch(() => undefined);
    throw failure(INSTAGRAM_LOGIN_EXPIRED);
  }
  if (!source) throw failure(`${[...new Set(problems)].join(' ') || 'Instagram did not grant access to the video file.'} Reconnect Instagram (Instagram Business/Creator account with media permissions), make sure the reel is public, and sync again.`);
  return { blob: await downloadVideo(source) };
}

function describeGraphError(error?: { code?: number; message?: string }): string {
  if (error?.code === 190) return 'The Instagram login has expired.';
  if (error?.code === 10 || error?.code === 200 || (error?.code ?? 0) >= 200 && (error?.code ?? 0) < 300) return 'The Instagram connection lacks permission to read this media.';
  if (error?.code === 100) return 'Instagram could not find this media (it may have been deleted or belongs to another account).';
  return `Instagram refused the request${error?.code ? ` (code ${error.code})` : ''}.`;
}

/** Accept only public Instagram post URLs, never arbitrary hosts or embedded credentials. */
export function instagramPermalink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(u.hostname) || u.username || u.password || u.port) return null;
    if (!/^\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return null;
    u.hostname = 'www.instagram.com';
    u.search = ''; u.hash = '';
    return u.toString();
  } catch { return null; }
}

async function retrievePublicVideo(permalink: unknown): Promise<Blob | null> {
  const page = instagramPermalink(permalink);
  if (!page) return null;
  try {
    const response = await fetch(page, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' } });
    if (!response.ok) return null;
    const html = await response.text();
    const patterns = [
      /property=["']og:video(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:video(?::secure_url)?["']/i,
      /"video_url"\s*:\s*"([^"]+)"/i,
      /"video_versions"\s*:\s*\[[^\]]*"url"\s*:\s*"([^"]+)"/i,
    ];
    for (const pattern of patterns) {
      const raw = html.match(pattern)?.[1];
      if (!raw) continue;
      const source = raw.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');
      try { if (isVideoCdn(new URL(source))) return await downloadVideo(source); } catch { /* try another declared video source */ }
    }
  } catch { /* public file unavailable */ }
  return null;
}
