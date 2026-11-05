import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import type { ContentItemDoc } from '../src/models/ContentItem.js';
import { collectDeepV2Media } from '../src/services/ai/deepV2.media.js';
const state = vi.hoisted(() => ({ account: {} as any, responses: [] as any[], calls: [] as any[], imageUrls: [] as string[], videoUrls: [] as string[], creds: {} as any }));
vi.mock('../src/repositories/connection.repository.js', () => ({ connectionRepository: { findByIdWithCredentials: async () => state.account } }));
vi.mock('../src/services/sync.service.js', () => ({ readCredentials: () => state.creds }));
vi.mock('../src/lib/http.js', () => ({ httpFetch: async (url: URL, options?: any) => {
  state.calls.push({ url: String(url), options });
  const next = state.responses.shift();
  if (!next) throw new Error('Unexpected provider request');
  return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
} }));
vi.mock('../src/services/ai/contentEvidence.js', () => ({
  collectImageAttachments: async (urls: string[]) => { state.imageUrls.push(...urls); return { basis: 'image', images: [{ data: 'aW1hZ2U=', mimeType: 'image/jpeg', label: 'image' }], videos: [], youtubeUrl: null, durationSeconds: null, notes: [], failure: null }; },
  mp4DurationSeconds: () => 24,
}));
vi.mock('../src/services/ai/videoInput.js', () => ({ INSTAGRAM_LOGIN_EXPIRED: 'Your Instagram login has expired. Reconnect Instagram from Connections, then run the analysis again.', downloadVideo: async (url: string) => { state.videoUrls.push(url); return new Blob(['original-video'], { type: 'video/mp4' }); } }));
vi.mock('../src/services/ai/creativeReport.service.js', () => ({ collectCreativeMedia: vi.fn(async () => ({ item: {}, media: { basis: 'text' } })) }));
let doc: ContentItemDoc;
beforeEach(() => {
  const userId = new Types.ObjectId(), accountId = new Types.ObjectId();
  doc = { userId, connectedAccountId: accountId, platform: 'instagram', providerMediaId: '123', legacyId: 'ig_123', title: 'A heartfelt thank-you', caption: 'Thank you for joining our first event.', publishedAt: new Date('2025-04-06'), syncedAt: new Date(), contentType: 'post', thumbnailUrl: 'https://cdn.example/cover.jpg', mediaUrl: 'https://www.instagram.com/p/owned-post/', unavailableMetrics: [] } as unknown as ContentItemDoc;
  Object.assign(state, { account: { _id: accountId, userId, platform: 'instagram', active: true, credentialsEnc: 'test' }, responses: [], calls: [], imageUrls: [], videoUrls: [], creds: { accessToken: 'IG-fake-token', instagramLogin: true } });
});
describe('app-only original media retrieval', () => {
  it('refreshes the selected Instagram image URL and full caption instead of using the cached cover', async () => {
    state.responses = [{ body: { id: '123', media_type: 'IMAGE', media_url: 'https://cdn.example/original.jpg', caption: 'Full original thank-you caption.' } }];
    const result = await collectDeepV2Media(doc);
    expect(state.imageUrls).toEqual(['https://cdn.example/original.jpg']);
    expect(result.item.caption).toBe('Full original thank-you caption.');
    expect(new URL(state.calls[0].url).hostname).toBe('graph.instagram.com');
    expect(state.calls[0].url).not.toContain('IG-fake-token');
  });
  it('retries the same owned endpoint with alternate token transport', async () => {
    state.responses = [{ status: 400, body: { error: { code: 100 } } }, { body: { id: '123', media_type: 'VIDEO', media_url: 'https://cdn.example/original.mp4' } }];
    const result = await collectDeepV2Media(doc);
    expect(result.media.basis).toBe('full_video');
    expect(state.calls).toHaveLength(2);
    expect(new URL(state.calls[1].url).pathname).toBe(new URL(state.calls[0].url).pathname);
    expect(state.videoUrls).toEqual(['https://cdn.example/original.mp4']);
    expect(JSON.stringify(result)).not.toContain('IG-fake-token');
  });
  it('recovers the original image when expanded children fields are unsupported', async () => {
    state.responses = [{ status: 400, body: { error: { code: 100 } } }, { status: 400, body: { error: { code: 100 } } }, { body: { id: '123', media_type: 'IMAGE', media_url: 'https://cdn.example/original.jpg' } }];
    const { media } = await collectDeepV2Media(doc);
    expect(media.basis).toBe('image');
    expect(new URL(state.calls[2].url).searchParams.get('fields')).not.toContain('children');
    expect(state.imageUrls).toEqual(['https://cdn.example/original.jpg']);
  });
  it('uses only the owning account and refuses a mismatched media identity', async () => {
    state.account.userId = new Types.ObjectId();
    await expect(collectDeepV2Media(doc)).rejects.toThrow('owns this post');
    expect(state.calls).toHaveLength(0);
    state.account.userId = doc.userId;
    state.responses = [{ body: { id: 'another-post', media_type: 'IMAGE', media_url: 'https://cdn.example/wrong.jpg' } }];
    await expect(collectDeepV2Media(doc)).rejects.toThrow('different post');
    expect(state.imageUrls).toHaveLength(0);
    state.responses = [{ body: { media_type: 'IMAGE', media_url: 'https://cdn.example/unverified.jpg' } }];
    await expect(collectDeepV2Media(doc)).rejects.toThrow('different post');
    expect(state.imageUrls).toHaveLength(0);
  });
  it('preserves carousel slide identity, mixed media and missing-slide limits', async () => {
    state.responses = [{ body: { id: '123', media_type: 'CAROUSEL_ALBUM', children: { data: [{ media_type: 'IMAGE', media_url: 'https://cdn.example/slide1.jpg' }, { media_type: 'VIDEO', media_url: 'https://cdn.example/slide2.mp4' }, { media_type: 'IMAGE' }] } } }];
    const { media } = await collectDeepV2Media(doc);
    expect(media.basis).toBe('carousel');
    expect(media.images[0].label).toBe('slide 1 of 3');
    expect(media.videos[0].label).toBe('slide 2 of 3');
    expect(media.notes.join(' ')).toContain('slide 3 of 3');
  });
  it('retrieves children separately when expanded carousel assets are absent', async () => {
    state.responses = [{ body: { id: '123', media_type: 'CAROUSEL_ALBUM' } }, { body: { data: [{ media_type: 'IMAGE', media_url: 'https://cdn.example/slide1.jpg' }] } }];
    const { media } = await collectDeepV2Media(doc);
    expect(new URL(state.calls[1].url).pathname).toMatch(/123\/children$/);
    expect(media.images[0].label).toBe('slide 1 of 1');
  });
  it('reports expired access explicitly without substituting the post thumbnail', async () => {
    state.responses = [{ status: 403, body: { error: { code: 190 } } }];
    await expect(collectDeepV2Media(doc)).rejects.toThrow('login has expired');
    expect(state.imageUrls).toHaveLength(0);
  });
  it('never treats a cached thumbnail as original media when the file is withheld', async () => {
    state.responses = [{ body: { id: '123', media_type: 'VIDEO', thumbnail_url: doc.thumbnailUrl } }];
    await expect(collectDeepV2Media(doc)).rejects.toThrow('original file');
    expect(state.imageUrls).toHaveLength(0);
  });
});
