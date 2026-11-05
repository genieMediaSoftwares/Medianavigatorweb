import type { ContentItemDoc } from '../../models/ContentItem.js';
import { config } from '../../config/env.js';
import { mediaUnavailable } from '../../lib/errors.js';
import { httpFetch } from '../../lib/http.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { toNormalized } from '../../integrations/mapper.js';
import { readCredentials } from '../sync.service.js';
import { collectCreativeMedia } from './creativeReport.service.js';
import { collectImageAttachments, mp4DurationSeconds, type MediaEvidence } from './contentEvidence.js';
import { downloadVideo, INSTAGRAM_LOGIN_EXPIRED } from './videoInput.js';

interface InstagramAsset { id?: string; media_type?: string; media_product_type?: string; media_url?: string; caption?: string; children?: { data?: InstagramAsset[]; paging?: { next?: string } }; error?: { code?: number } }

/** App Deep V2 only. Refresh original media URLs without treating covers as full posts. */
export async function collectDeepV2Media(doc: ContentItemDoc) {
  const account = await connectionRepository.findByIdWithCredentials(doc.connectedAccountId);
  if (!account?.active || String(account.userId) !== String(doc.userId) || account.platform !== doc.platform) throw mediaUnavailable('Reconnect the account that owns this post, then refresh analysis.');
  if (doc.platform !== 'instagram') return collectCreativeMedia(doc, { documents: true, textPosts: true });
  if (!account.credentialsEnc) throw mediaUnavailable('Reconnect Instagram to restore access to this post’s original media.');
  const creds = readCredentials(account);
  const instagramLogin = creds.instagramLogin || creds.accessToken?.startsWith('IG');
  const token = instagramLogin ? creds.accessToken : creds.pageAccessToken || creds.accessToken;
  if (!token) throw mediaUnavailable('Reconnect Instagram to restore media permissions.');
  const item = toNormalized(doc);
  const base: MediaEvidence = { basis: 'none', images: [], videos: [], youtubeUrl: null, durationSeconds: doc.durationSeconds ?? null, notes: [], failure: null };
  const url = new URL(`https://${instagramLogin ? 'graph.instagram.com' : 'graph.facebook.com'}/${config.providers.metaApiVersion}/${encodeURIComponent(doc.providerMediaId)}`);
  url.searchParams.set('fields', 'id,caption,media_type,media_product_type,media_url,children.limit(20){id,media_type,media_url}');
  const get = async (target: URL): Promise<InstagramAsset> => {
    let response = await httpFetch(target, { headers: { Authorization: `Bearer ${token}` } });
    // Retry the same authorized endpoint using Meta's alternate token transport.
    if ([400, 401].includes(response.status)) {
      await response.body?.cancel();
      const authenticated = new URL(target); authenticated.searchParams.set('access_token', token);
      response = await httpFetch(authenticated);
    }
    const body = await response.json().catch(() => null) as InstagramAsset | null;
    if (!response.ok || !body || body.error) {
      const code = body?.error?.code;
      if (code === 100 && target.searchParams.get('fields')?.includes(',children.')) {
        const basic = new URL(target);
        basic.searchParams.set('fields', target.searchParams.get('fields')!.split(',children.')[0]);
        return get(basic);
      }
      throw mediaUnavailable(code === 190 ? INSTAGRAM_LOGIN_EXPIRED : [10, 200].includes(code ?? 0) ? 'Instagram has not granted permission to read this post. Reconnect Instagram with media access, then refresh analysis.' : 'Instagram could not return this post’s original media. Sync the owning account and refresh analysis.');
    }
    return body;
  };
  const original = await get(url);
  if (original.id !== doc.providerMediaId) throw mediaUnavailable('Instagram returned a different post. Sync this account before retrying.');
  const withText = { ...item, caption: typeof original.caption === 'string' ? original.caption : item.caption };
  const readAsset = async (asset: InstagramAsset, label: string): Promise<MediaEvidence> => {
    if (!asset.media_url) return { ...base, notes: [`${label}: Instagram did not return the original file.`] };
    if (asset.media_type === 'VIDEO') {
      try {
        const blob = await downloadVideo(asset.media_url);
        if (blob.size > config.ai.contentAnalysis.maxMediaBytes) return { ...base, notes: [`${label}: the original video exceeds the configured analysis limit.`] };
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const durationSeconds = mp4DurationSeconds(bytes) ?? (label === 'Original video' ? doc.durationSeconds ?? null : null);
        return { ...base, basis: 'full_video', durationSeconds, videos: [{ bytes, mimeType: 'video/mp4', label, durationSeconds }] };
      } catch { return { ...base, notes: [`${label}: the original video could not be downloaded. Sync the account to refresh the file URL.`] }; }
    }
    if (asset.media_type !== 'IMAGE') return { ...base, notes: [`${label}: the media format could not be verified.`] };
    const media = await collectImageAttachments([asset.media_url]);
    return { ...media, images: media.images.map((image) => ({ ...image, label })) };
  };
  if (original.media_type === 'CAROUSEL_ALBUM') {
    let slides = original.children?.data;
    let truncated = Boolean(original.children?.paging?.next);
    if (!slides?.length) {
      // Some permission combinations omit expanded children but allow the owned media edge.
      const childrenUrl = new URL(url); childrenUrl.pathname += '/children'; childrenUrl.searchParams.set('fields', 'id,media_type,media_url'); childrenUrl.searchParams.set('limit', '20');
      const children = await get(childrenUrl) as { data?: InstagramAsset[]; paging?: { next?: string } };
      slides = children.data; truncated = Boolean(children.paging?.next);
    }
    const media: MediaEvidence = { ...base, basis: 'carousel', notes: [], images: [], videos: [] };
    let usedBytes = 0;
    for (const [index, slide] of (slides ?? []).slice(0, 20).entries()) {
      const loaded = await readAsset(slide, `slide ${index + 1} of ${slides!.length}`);
      const size = loaded.images.reduce((n, image) => n + Buffer.byteLength(image.data, 'base64'), 0) + loaded.videos.reduce((n, video) => n + video.bytes.byteLength, 0);
      if (usedBytes + size > config.ai.contentAnalysis.maxMediaBytes) { media.notes.push('The remaining carousel slides exceed the analysis size budget and were not assessed.'); break; }
      usedBytes += size;
      media.images.push(...loaded.images); media.videos.push(...loaded.videos); media.notes.push(...loaded.notes);
    }
    if (truncated || (slides?.length ?? 0) > 20) media.notes.push('Additional carousel slides were not returned in the bounded media request and were not assessed.');
    if (!media.images.length && !media.videos.length) throw mediaUnavailable('Instagram did not return accessible original carousel slides. Sync the account and refresh analysis.');
    return { item: withText, media };
  }
  const media = await readAsset(original, original.media_type === 'VIDEO' ? 'Original video' : 'Original image');
  if (media.basis === 'none') throw mediaUnavailable(media.notes[0] || 'The original post media is unavailable. Sync Instagram and refresh analysis.');
  return { item: withText, media };
}
