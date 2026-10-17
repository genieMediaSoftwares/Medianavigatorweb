import { config } from '../../config/env.js';
import { mediaUnavailable } from '../../lib/errors.js';
import { httpFetch } from '../../lib/http.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { readCredentials } from '../sync.service.js';
import { collectImageAttachments, collectVideoAttachment, collectDocumentAttachment, type MediaEvidence } from './contentEvidence.js';

/** Fetches only post/media metadata. No social-actions, analytics or account statistics. */
export async function collectLinkedInCreativeMedia(accountId: Parameters<typeof connectionRepository.findByIdWithCredentials>[0], postId: string, documents = false): Promise<{ media: MediaEvidence; caption: string }> {
  const account = await connectionRepository.findByIdWithCredentials(accountId);
  if (!account?.active || !account.credentialsEnc) throw mediaUnavailable('Reconnect LinkedIn to review the original post.');
  const creds = readCredentials(account);
  const headers = { Authorization: `Bearer ${creds.accessToken}`, 'LinkedIn-Version': config.providers.linkedinApiVersion, 'X-Restli-Protocol-Version': '2.0.0' };
  const get = async (path: string) => {
    const res = await httpFetch(`https://api.linkedin.com/rest/${path}`, { headers });
    if (!res.ok) throw mediaUnavailable('LinkedIn did not grant access to this original post or media. Reconnect with the required Company Page permissions and sync again.');
    return res.json() as Promise<any>;
  };
  const post = await get(`posts/${encodeURIComponent(postId)}`);
  const caption = typeof post.commentary === 'string' ? post.commentary : '';
  const content = post.content ?? {};
  const ids = content.multiImage?.images?.map((image: any) => image.id) ?? (content.media?.id ? [content.media.id] : []);
  const safeUrl = (url: unknown): string => {
    if (typeof url !== 'string') throw mediaUnavailable('LinkedIn did not provide an original media download URL.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443') || !parsed.hostname.endsWith('.licdn.com')) throw mediaUnavailable('LinkedIn did not provide a supported original media file.');
    return url;
  };
  if (ids.length && ids.every((id: unknown) => typeof id === 'string' && id.startsWith('urn:li:image:'))) {
    const urls: string[] = [];
    for (const id of ids.slice(0, 20)) urls.push(safeUrl((await get(`images/${encodeURIComponent(id)}`)).downloadUrl));
    const media = await collectImageAttachments(urls);
    if (media.basis === 'none') throw mediaUnavailable(media.failure!);
    if (ids.length > 20) media.notes.push('Only the first 20 LinkedIn images were reviewed.');
    return { media, caption };
  }
  if (ids.length === 1 && typeof ids[0] === 'string' && ids[0].startsWith('urn:li:video:')) {
    const video = await get(`videos/${encodeURIComponent(ids[0])}`);
    const media = await collectVideoAttachment(safeUrl(video.downloadUrl));
    if (typeof video.duration === 'number' && video.duration > 0) media.durationSeconds = media.videos[0].durationSeconds = video.duration / 1000;
    return { media, caption };
  }
  if (documents && ids.length === 1 && typeof ids[0] === 'string' && ids[0].startsWith('urn:li:document:')) {
    const metadata = await get(`documents/${encodeURIComponent(ids[0])}`);
    return { media: await collectDocumentAttachment(safeUrl(metadata.downloadUrl)), caption };
  }
  if (!Object.keys(content).length && caption.trim()) return { caption, media: { basis: 'text', images: [], videos: [], youtubeUrl: null, durationSeconds: null, notes: ['This is a text-only post. Motion, image quality and audio are not applicable.'], failure: null } };
  throw mediaUnavailable('This LinkedIn attachment format is unavailable for media review. The report cannot substitute a thumbnail or analytics for its original content.');
}
