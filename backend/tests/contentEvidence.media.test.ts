import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedMedia } from '../../shared/types.js';
import { collectMedia } from '../src/services/ai/contentEvidence.js';
const net = vi.hoisted(() => ({ calls: [] as string[], failed: [] as string[] }));
vi.mock('../src/lib/http.js', () => ({ httpFetch: async (url: string) => {
  net.calls.push(url);
  return net.failed.includes(url) ? new Response('expired', { status: 404 }) : new Response(new Uint8Array([255, 216, 255, 224]), { headers: { 'content-type': 'image/jpeg' } });
} }));
const item = { platform: 'instagram', contentType: 'post', mediaUrl: 'https://cdn.example/cached.jpg', thumbnailUrl: 'https://cdn.example/cover.jpg' } as NormalizedMedia;
const live = { mediaType: 'IMAGE', mediaUrl: 'https://cdn.example/original.jpg', thumbnailUrl: item.thumbnailUrl, productType: null, children: [], likeCount: null, commentsCount: null };
beforeEach(() => { net.calls = []; net.failed = []; });
describe('original Instagram evidence used by existing production analyses', () => {
  it('does not download cached media or thumbnails when the provider lookup fails', async () => {
    const media = await collectMedia(item, null, 'expired session');
    expect(media.basis).toBe('none');
    expect(media.failure).toContain('expired session');
    expect(net.calls).toEqual([]);
  });
  it.each([null, live.mediaUrl])('does not replace a withheld or failed original image with its cover (%s)', async (url) => {
    net.failed = [live.mediaUrl];
    const media = await collectMedia(item, { ...live, mediaUrl: url });
    expect(media.basis).toBe('none');
    expect(media.failure).toBeTruthy();
    expect(media.images).toEqual([]);
    expect(net.calls).toEqual(url ? [url] : []);
  });
  it.each([{ children: [] }, { children: [{ mediaType: 'IMAGE', mediaUrl: live.mediaUrl, thumbnailUrl: item.thumbnailUrl }] }])('does not promote a carousel cover when original slides are inaccessible', async ({ children }) => {
    net.failed = [live.mediaUrl];
    const media = await collectMedia(item, { ...live, mediaType: 'CAROUSEL_ALBUM', children });
    expect(media.basis).toBe('none');
    expect(media.failure).toContain('carousel slides');
    expect(net.calls).not.toContain(item.thumbnailUrl);
    expect(net.calls).not.toContain(item.mediaUrl);
  });
  it('preserves original image and carousel analysis', async () => {
    expect((await collectMedia(item, live)).basis).toBe('image');
    const media = await collectMedia(item, { ...live, mediaType: 'CAROUSEL_ALBUM', children: [{ mediaType: 'IMAGE', mediaUrl: live.mediaUrl, thumbnailUrl: null }] });
    expect(media.basis).toBe('carousel');
    expect(media.images[0].label).toBe('slide 1 of 1');
    expect(media.failure).toBeNull();
  });
});
