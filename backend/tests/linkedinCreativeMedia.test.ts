import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { collectLinkedInCreativeMedia } from '../src/services/ai/linkedinCreativeMedia.js';

const state = vi.hoisted(() => ({ post: {} as any, calls: [] as string[], fail: false, url: 'https://media.licdn.com/original', images: [] as string[], video: '' }));
vi.mock('../src/repositories/connection.repository.js', () => ({ connectionRepository: { findByIdWithCredentials: async () => ({ active: true, credentialsEnc: 'test' }) } }));
vi.mock('../src/services/sync.service.js', () => ({ readCredentials: () => ({ accessToken: 'fake-token' }) }));
vi.mock('../src/lib/http.js', () => ({ httpFetch: async (input: string) => {
  state.calls.push(input);
  if (state.fail) return new Response('{}', { status: 403 });
  return new Response(JSON.stringify(input.includes('/posts/') ? state.post : { downloadUrl: state.url, duration: 24000 }));
} }));
vi.mock('../src/services/ai/contentEvidence.js', () => ({
  collectImageAttachments: async (urls: string[]) => { state.images = urls; return { basis: urls.length > 1 ? 'carousel' : 'image', notes: [] }; },
  collectVideoAttachment: async (url: string) => { state.video = url; return { basis: 'full_video', videos: [{ durationSeconds: null }], durationSeconds: null }; },
}));
const collect = () => collectLinkedInCreativeMedia(new Types.ObjectId(), 'urn:li:share:test');
beforeEach(() => { state.post = { commentary: 'The actual post text.' }; state.calls = []; state.images = []; state.video = ''; state.fail = false; state.url = 'https://media.licdn.com/original'; });

describe('original LinkedIn creative media', () => {
  it('recognizes text-only content from the post API rather than substituting metrics', async () => {
    const result = await collect();
    expect(result.media.basis).toBe('text');
    expect(result.caption).toBe('The actual post text.');
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0]).toContain('/posts/urn%3Ali%3Ashare%3Atest');
  });
  it('loads every original image in a multi-image post', async () => {
    state.post.content = { multiImage: { images: [{ id: 'urn:li:image:one' }, { id: 'urn:li:image:two' }] } };
    expect((await collect()).media.basis).toBe('carousel');
    expect(state.images).toHaveLength(2);
    expect(state.calls.every((url) => !/statistics|socialActions|analytics/.test(url))).toBe(true);
  });
  it('loads the original video rather than the thumbnail', async () => {
    state.post.content = { media: { id: 'urn:li:video:one' } };
    const result = await collect();
    expect(state.video).toBe(state.url);
    expect(result.media.durationSeconds).toBe(24);
  });
  it('refuses inaccessible attachments and link/document previews', async () => {
    state.post.content = { article: { source: 'https://example.com', thumbnail: 'urn:li:image:preview' } };
    await expect(collect()).rejects.toThrow(/cannot substitute/);
    state.fail = true;
    await expect(collect()).rejects.toThrow(/Company Page permissions/);
  });
  it('does not download arbitrary or non-HTTPS hosts', async () => {
    state.post.content = { media: { id: 'urn:li:video:one' } };
    for (const url of ['http://media.licdn.com/video', 'https://localhost/private', 'https://media.licdn.com.attacker.example/video']) {
      state.url = url;
      await expect(collect()).rejects.toThrow(/supported original media/);
    }
    expect(state.video).toBe('');
  });
});
