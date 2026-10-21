import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

// Test doubles only: no real Instagram, media or Gemini calls are made, and nothing here is presented as real analytics.
vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});

const net = vi.hoisted(() => ({ calls: [] as string[], imageFails: false, mediaMode: 'image' as 'image' | 'reel_withheld' | 'reel' | 'carousel' | 'expired' }));
/** Fixture: an MP4 header whose mvhd box says 24 seconds (timescale 1000, duration 24000). Not a real video. */
const MP4_24S = vi.hoisted(() => {
  const b = new Uint8Array(64);
  b.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70], 0); // ftyp
  b.set([0, 0, 0, 108, 0x6d, 0x76, 0x68, 0x64], 24); // mvhd
  b.set([0, 0, 0, 0], 32); // version 0 + flags
  b.set([0, 0, 0x03, 0xe8], 44); // timescale 1000
  b.set([0, 0, 0x5d, 0xc0], 48); // duration 24000
  return b;
});
vi.mock('../src/lib/http.js', async (orig) => {
  const real: any = await orig();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return {
    ...real,
    httpFetch: async (url: string) => {
      net.calls.push(String(url));
      const u = String(url);
      if (u.includes('/insights?metric=reach')) return json({ data: [{ name: 'reach', total_value: { value: 1200 } }] });
      if (u.includes('/insights?metric=views')) return json({ data: [{ name: 'views', total_value: { value: 1800 } }] });
      if (u.includes('/insights?metric=saved')) return json({ data: [{ name: 'saved', total_value: { value: 0 } }] });
      if (u.includes('/insights')) return json({ error: { message: 'metric not supported for this media' } }, 400);
      if (net.mediaMode === 'expired') return json({ error: { code: 190, message: 'Error validating access token: Session has expired.' } }, 400);
      if (u.includes('fields=media_type')) {
        if (net.mediaMode === 'reel_withheld') return json({ media_type: 'VIDEO', media_product_type: 'REELS', thumbnail_url: 'https://cdn.example/cover.jpg', like_count: 61, comments_count: 4 });
        if (net.mediaMode === 'reel') return json({ media_type: 'VIDEO', media_product_type: 'REELS', media_url: 'https://cdn.example/reel.mp4', thumbnail_url: 'https://cdn.example/cover.jpg', like_count: 61, comments_count: 4 });
        if (net.mediaMode === 'carousel') return json({ media_type: 'CAROUSEL_ALBUM', like_count: 61, comments_count: 4, children: { data: [
          { media_type: 'IMAGE', media_url: 'https://cdn.example/s1.jpg' },
          { media_type: 'VIDEO', media_url: 'https://cdn.example/reel.mp4', thumbnail_url: 'https://cdn.example/s2.jpg' },
          { media_type: 'IMAGE' },
        ] } });
        return json({ media_type: 'IMAGE', media_url: 'https://cdn.example/full.jpg', like_count: 61, comments_count: 4 });
      }
      if (u === 'https://cdn.example/reel.mp4') return new Response(MP4_24S, { status: 200, headers: { 'content-type': 'video/mp4' } });
      if (u.startsWith('https://cdn.example/') || u.startsWith('https://img.example/')) {
        if (net.imageFails) return new Response('gone', { status: 403 });
        return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
      }
      return json({ error: { message: 'unexpected url in test' } }, 404);
    },
  };
});

const gem = vi.hoisted(() => ({ calls: [] as any[], impl: null as null | ((o: any) => any) }));
vi.mock('../src/services/ai/geminiClient.js', async () => {
  class AiUnavailableError extends Error {}
  class AiFailedError extends Error { constructor(m: string, public reason: string) { super(m); } }
  return {
    AiUnavailableError, AiFailedError,
    aiAvailable: () => true,
    aiModel: () => 'test-model',
    generateJson: async () => { throw new AiFailedError('not used', 'provider_error'); },
    uploadVideo: async () => ({ name: 'files/x', uri: 'https://files.example/x', mimeType: 'video/mp4' }),
    deleteUploaded: async () => undefined,
    generateMultimodalJson: async (o: any) => { gem.calls.push(o); return gem.impl!(o); },
  };
});

import { loadVideoInput, instagramPermalink } from '../src/services/ai/videoInput.js';
// The web's Deep Video Analysis loader, which content analysis falls back to for Instagram videos. The real one is
// covered by the web video tests; here it only reports what it would return.
const loader = vi.hoisted(() => ({ calls: [] as string[], impl: null as null | (() => Promise<unknown>) }));
vi.mock('../src/services/ai/videoInput.js', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadVideoInput: vi.fn(async (_uid: unknown, mediaId: string) => { loader.calls.push(mediaId); return loader.impl!(); }),
}));
import { syncService } from '../src/services/sync.service.js';
import { AiFailedError } from '../src/services/ai/geminiClient.js';
import { ContentAnalysis } from '../src/models/ContentAnalysis.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { INSTAGRAM_LOGIN_EXPIRED } from '../src/services/ai/videoInput.js';
import { collectMedia, compare, derivedMetrics, evidenceHash, mp4DurationSeconds } from '../src/services/ai/contentEvidence.js';

const point = (n: number, extra: Record<string, unknown> = {}) => ({
  number: n, title: `model title ${n}`, observations: [`finding ${n}`], evidence: [], metricKeys: [], interpretation: `meaning ${n}`, confidence: 'medium', ...extra,
});
const sixPoints = (overrides: Record<number, Record<string, unknown>> = {}) => ({
  summary: 'Evidence-based conclusion.',
  points: [1, 2, 3, 4, 5, 6].map((n) => point(n, overrides[n] ?? {})),
  limitations: [], recommendations: ['Test a clearer first frame'], confidence: { level: 'medium', reason: 'Image and partial metrics only.' },
});

beforeAll(startTestDb);
afterAll(stopTestDb);

let user: Awaited<ReturnType<typeof registerUser>>;
let postId: string;
beforeEach(async () => {
  await clearDb(); fake.reset(); gem.calls = []; net.calls = []; net.imageFails = false; net.mediaMode = 'image';
  loader.calls = [];
  loader.impl = async () => { throw new AiFailedError('Instagram returned no video URL for this post (it can be withheld for Reels with licensed music). Reconnect Instagram and sync again.', 'provider_error'); };
  gem.impl = ({ schema }: any) => ({ data: schema.parse(sixPoints()), model: 'test-model', latencyMs: 5 });
  user = await registerUser('content@test.example');
  fake.items = makeMedia(15, 'instagram');
  await api().post('/api/v1/connections/instagram/connect').set(user.auth).send({ accessToken: 'tok' });
  while (await syncService.runOne('t'));
  postId = (await api().get('/api/v1/media?limit=1').set(user.auth)).body.data[0].id;
});

const analyze = (body: Record<string, unknown>) => api().post('/api/v1/intelligence/content-analysis').set(user.auth).send({ mediaId: postId, ...body });

describe('six-point content analysis', () => {
  it('returns exactly six points with the fixed titles, the media it analysed and the live metrics', async () => {
    const res = await analyze({ type: 'deep' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.result.points).toHaveLength(6);
    expect(d.result.points.map((p: any) => p.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(d.result.points[0].title).toBe('Hook Effectiveness');
    expect(d.mediaBasis).toBe('image');
    // The image itself was sent to the model, not only text.
    expect(gem.calls[0].parts.some((p: any) => p.inlineData?.mimeType === 'image/jpeg')).toBe(true);
    const metric = (k: string) => d.metrics.items.find((m: any) => m.key === k);
    expect(metric('reach')).toMatchObject({ value: 1200, available: true, source: 'instagram_live' });
    expect(metric('likes')).toMatchObject({ value: 61, available: true });
  });

  it('never turns a missing metric into 0', async () => {
    const d = (await analyze({ type: 'deep' })).body.data;
    const shares = d.metrics.items.find((m: any) => m.key === 'shares');
    expect(shares).toMatchObject({ value: null, available: false });
    expect(shares.note).toMatch(/Not available/);
    // Save rate has a measured 0 saves over 1,200 reach: a real 0, not a guess.
    expect(d.metrics.items.find((m: any) => m.key === 'saveRate')).toMatchObject({ value: 0, available: true });
    // Share rate needs shares, which are missing: unavailable.
    expect(d.metrics.items.find((m: any) => m.key === 'shareRate')).toMatchObject({ value: null, available: false });
  });

  it('saves the result and returns it again without calling the model; Reanalyze updates the same record', async () => {
    await analyze({ type: 'deep' });
    const again = await analyze({ type: 'deep' });
    expect(again.body.data.fromCache).toBe(true);
    expect(gem.calls).toHaveLength(1);
    const re = await analyze({ type: 'deep', reanalyze: true });
    expect(re.body.data.fromCache).toBe(false);
    expect(gem.calls).toHaveLength(2);
    expect(await ContentAnalysis.countDocuments()).toBe(1);
  });

  it('keeps Why Top, Why Bottom and Deep Analysis as separate saved results with their own titles', async () => {
    const top = (await analyze({ type: 'why_top', rank: '#1 of 6 by views' })).body.data;
    const bottom = (await analyze({ type: 'why_bottom' })).body.data;
    expect(top.result.points[0].title).toBe('Hook Effectiveness');
    expect(bottom.result.points[5].title).toBe('Repeatable Success Factors');
    expect(gem.calls[0].parts[0].text).toContain('#1 of 6 by views');
    expect(await ContentAnalysis.countDocuments()).toBe(2);
  });

  it('rejects an answer without exactly six points and saves nothing as a result', async () => {
    gem.impl = () => { throw new AiFailedError('Gemini response did not match the expected structure', 'invalid_response'); };
    const res = await analyze({ type: 'deep' });
    expect(res.status).toBe(503);
    const saved = await ContentAnalysis.findOne().lean();
    expect(saved?.result).toBeNull();
    expect(saved?.lastError).toMatch(/incomplete/);
  });

  it('a failed refresh keeps the previous valid analysis and reports the failure', async () => {
    await analyze({ type: 'deep' });
    gem.impl = () => { throw new AiFailedError('Gemini request timed out', 'timeout'); };
    const res = await analyze({ type: 'deep', reanalyze: true });
    expect(res.status).toBe(200);
    expect(res.body.data.result.points).toHaveLength(6);
    expect(res.body.data.refreshError).toMatch(/took too long/);
  });

  it('removes evidence the model could not have seen (video frames and timestamps for an image) and says so', async () => {
    gem.impl = ({ schema }: any) => ({
      data: schema.parse(sixPoints({ 1: { evidence: [{ source: 'video_frame', timestamp: '00:05', description: 'a wave' }, { source: 'image', timestamp: null, description: 'a hand-held sign' }], metricKeys: ['reach', 'shares', 'invented'] } })),
      model: 'test-model', latencyMs: 5,
    });
    const d = (await analyze({ type: 'deep' })).body.data;
    expect(d.result.points[0].evidence).toEqual([{ source: 'image', timestamp: null, description: 'a hand-held sign' }]);
    expect(d.result.points[0].metricKeys).toEqual(['reach']);
    expect(d.result.limitations.join(' ')).toMatch(/removed/);
  });

  it('labels the caption-only fallback when the post image cannot be loaded', async () => {
    net.imageFails = true;
    const res = await analyze({ type: 'deep' });
    expect(res.status).toBe(200);
    expect(res.body.data.mediaBasis).toBe('none');
    expect(res.body.data.result.evidence.images).toBe(0);
    expect(res.body.data.result.limitations.join(' ')).toMatch(/Only the caption/);
    expect(res.body.data.result.confidence.level).toBe('low');
  });

  it("does not return another user's analysis", async () => {
    await analyze({ type: 'deep' });
    const other = await registerUser('other@test.example');
    const res = await api().post('/api/v1/intelligence/content-analysis').set(other.auth).send({ mediaId: postId, type: 'deep' });
    expect(res.status).toBe(404);
  });
});

describe('video analysis (automatic, no upload)', () => {
  const frames = { 1: { evidence: [
    { source: 'video_frame', timestamp: '00:01', description: 'opening shot' },
    { source: 'video_frame', timestamp: '00:12', description: 'middle scene' },
    { source: 'audio', timestamp: '00:22', description: 'closing line' },
  ] }, 2: { evidence: [{ source: 'video_frame', timestamp: '00:45', description: 'a moment past the end of the 24-second video' }] } };

  it('fetches the reel video automatically and sends the full file, with denser frame sampling for a short reel', async () => {
    net.mediaMode = 'reel';
    gem.impl = ({ schema }: any) => ({ data: schema.parse({ ...sixPoints(frames), audio: 'speech_and_music' }), model: 'test-model', latencyMs: 5 });
    const d = (await analyze({ type: 'deep' })).body.data;
    expect(d.mediaBasis).toBe('full_video');
    const videoPart = gem.calls[0].parts.find((p: any) => p.fileData?.mimeType === 'video/mp4');
    expect(videoPart).toBeTruthy();
    expect(videoPart.videoMetadata).toEqual({ fps: 3 });
    expect(gem.calls[0].parts[0].text).toContain('(24 seconds long)');
    expect(d.result.evidence).toMatchObject({ visual: 'full_video', videos: 1, momentsCited: 3, coversTimeline: true, durationSeconds: 24, audio: 'speech_and_music' });
    // A timestamp beyond the real length is removed and disclosed.
    expect(d.result.points[1].evidence).toEqual([]);
    expect(d.result.limitations.join(' ')).toMatch(/removed/);
  });

  it('prefers full timeline coverage even when the retry cites the same number of moments', async () => {
    net.mediaMode = 'reel';
    let n = 0;
    const openingOnly = { 1: { evidence: [1, 2, 3].map(t => ({ source: 'video_frame', timestamp: `00:0${t}`, description: 'opening' })) } };
    gem.impl = ({ schema }: any) => ({ data: schema.parse(n++ === 0 ? sixPoints(openingOnly) : sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    const d = (await analyze({ type: 'why_top' })).body.data;
    expect(d.result.evidence.coversTimeline).toBe(true);
    expect(n).toBe(2);
  });

  it('asks again when a video answer does not cover the beginning, middle and end, and keeps the better answer', async () => {
    net.mediaMode = 'reel';
    let n = 0;
    gem.impl = ({ schema }: any) => ({ data: schema.parse(n++ === 0 ? sixPoints() : sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    const d = (await analyze({ type: 'why_top' })).body.data;
    expect(gem.calls).toHaveLength(2);
    expect(gem.calls[1].parts[0].text).toMatch(/one near the beginning, one in the middle and one near the end/);
    expect(d.result.evidence.coversTimeline).toBe(true);
  });

  it('uses an uploaded original and discloses its source', async () => {
    net.mediaMode = 'reel_withheld';
    gem.impl = ({ schema }: any) => ({ data: schema.parse(sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    const res = await api().post('/api/v1/intelligence/content-analysis/upload').set(user.auth).field('mediaId', postId).field('type', 'deep').attach('video', Buffer.from(MP4_24S), 'original.mp4');
    expect(res.status).toBe(200);
    expect(res.body.data.result.limitations.join(' ')).toMatch(/video you uploaded/);
    expect(res.body.data.result.evidence.coversTimeline).toBe(true);
  });
  it('rejects non-video uploads', async () => {
    const res = await api().post('/api/v1/intelligence/content-analysis/upload').set(user.auth).field('mediaId', postId).field('type', 'deep').attach('video', Buffer.from('not a video'), 'original.mp4');
    expect(res.status).toBe(400);
    expect(gem.calls).toHaveLength(0);
  });
  it('rejects uploads against another user’s post', async () => {
    const other = await registerUser('upload-other@test.example');
    const res = await api().post('/api/v1/intelligence/content-analysis/upload').set(other.auth).field('mediaId', postId).field('type', 'deep').attach('video', Buffer.from(MP4_24S), 'original.mp4');
    expect(res.status).toBe(404);
    expect(gem.calls).toHaveLength(0);
  });

  it('automatically produces a labelled cover review when the reel file is unavailable', async () => {
    net.mediaMode = 'reel_withheld';
    gem.impl = ({ schema }: any) => ({ data: schema.parse(sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    const res = await analyze({ type: 'deep' });
    expect(res.status).toBe(200);
    expect(res.body.data.mediaBasis).toBe('thumbnail');
    expect(res.body.data.result.confidence.level).toBe('low');
    expect(res.body.data.result.evidence.momentsCited).toBe(0);
    expect(res.body.data.result.limitations.join(' ')).toMatch(/limited review/);
    expect(res.body.data.result.points[0].title).toBe('Hook Effectiveness');
  });

  it('when the live media URL is withheld, falls back to the web video loader (file saved at sync) and watches the full video', async () => {
    net.mediaMode = 'reel_withheld';
    loader.impl = async () => ({ blob: new Blob([MP4_24S], { type: 'video/mp4' }) });
    gem.impl = ({ schema }: any) => ({ data: schema.parse({ ...sixPoints(frames), audio: 'music' }), model: 'test-model', latencyMs: 5 });
    const res = await analyze({ type: 'why_top' });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.mediaBasis).toBe('full_video');
    expect(gem.calls[0].parts.some((p: any) => p.fileData?.mimeType === 'video/mp4')).toBe(true);
    expect(d.result.evidence).toMatchObject({ visual: 'full_video', videos: 1, durationSeconds: 24 });
    // Live Instagram metrics are still used even though the file came from the fallback.
    expect(d.metrics.items.find((m: any) => m.key === 'reach')).toMatchObject({ value: 1200, source: 'instagram_live' });
  });

  it('does not use the fallback loader when the live video downloads fine', async () => {
    net.mediaMode = 'reel';
    gem.impl = ({ schema }: any) => ({ data: schema.parse(sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    expect((await analyze({ type: 'deep' })).status).toBe(200);
    expect(loader.calls).toHaveLength(0);
  });

  it('an expired Instagram login is reported as such and flags the connection for reconnect (image post)', async () => {
    const list = (await api().get('/api/v1/media?limit=24').set(user.auth)).body.data as Array<{ id: string; contentType: string }>;
    const image = list.find((m) => m.contentType === 'post')!;
    net.mediaMode = 'expired';
    const res = await api().post('/api/v1/intelligence/content-analysis').set(user.auth).send({ mediaId: image.id, type: 'deep' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe(INSTAGRAM_LOGIN_EXPIRED);
    expect(loader.calls).toHaveLength(0);
    expect((await ConnectedAccount.findOne({ platform: 'instagram' }).lean())?.status).toBe('connection_expired');
  });

  it('a withheld reel keeps a previous valid analysis and reports why the refresh failed', async () => {
    net.mediaMode = 'reel';
    gem.impl = ({ schema }: any) => ({ data: schema.parse(sixPoints(frames)), model: 'test-model', latencyMs: 5 });
    await analyze({ type: 'deep' });
    net.mediaMode = 'reel_withheld';
    const re = (await analyze({ type: 'deep', reanalyze: true })).body.data;
    expect(re.mediaBasis).toBe('full_video');
    expect(re.refreshError).toMatch(/returned no video URL/);
  });

  it('analyzes every carousel slide in order (images and video) and discloses slides it could not load', async () => {
    net.mediaMode = 'carousel';
    const d = (await analyze({ type: 'deep' })).body.data;
    expect(d.mediaBasis).toBe('carousel');
    const labels = gem.calls[0].parts.filter((p: any) => typeof p.text === 'string' && p.text.startsWith('[slide')).map((p: any) => p.text);
    expect(labels).toEqual(['[slide 2 of 3 (video)]', '[slide 1 of 3]']);
    expect(d.result.evidence).toMatchObject({ videos: 1, images: 1 });
    expect(d.result.limitations.join(' ')).toMatch(/Slide\(s\) 3 could not be loaded/);
  });

  it('requires a video on the upload endpoint', async () => {
    const res = await api().post('/api/v1/intelligence/content-analysis/upload').set(user.auth).field('mediaId', postId).field('type', 'deep');
    expect(res.status).toBe(400);
  });
});

describe('Facebook video evidence', () => {
  const fbVideo = { ...makeMedia(1, 'facebook')[0], contentType: 'video', platformContentId: '111_9', thumbnailUrl: 'https://img.example/cover.jpg' } as any;
  const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]);

  it('analyzes a Facebook Page video from its own file, not its cover image', async () => {
    const ev = await collectMedia(fbVideo, null, null, { loadVideo: async () => new Blob([mp4], { type: 'video/mp4' }) });
    expect(ev.basis).toBe('full_video');
    expect(ev.videos).toHaveLength(1);
    expect(ev.images).toHaveLength(0);
  });

  it('when Facebook withholds the file, says why and does not fall back to the cover image', async () => {
    const ev = await collectMedia(fbVideo, null, null, { loadVideo: async () => { throw new Error('Facebook did not provide the video file for this post.'); } });
    expect(ev).toMatchObject({ basis: 'none', failure: 'Facebook did not provide the video file for this post.' });
    expect(ev.images).toHaveLength(0);
  });
});

describe('evidence helpers', () => {
  it('reads the real video length from the MP4 header', () => {
    expect(mp4DurationSeconds(MP4_24S)).toBe(24);
    expect(mp4DurationSeconds(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('derived ratios only use measured, non-zero denominators', () => {
    const d = derivedMetrics([{ key: 'reach', label: 'Reach', value: 0, unit: 'count', available: true, source: 'synced' }, { key: 'saves', label: 'Saves', value: 3, unit: 'count', available: true, source: 'synced' }]);
    expect(d.find((m) => m.key === 'saveRate')).toMatchObject({ value: null, available: false });
  });

  it('flags young posts and small samples instead of over-claiming', () => {
    const items = makeMedia(3, 'instagram') as any[];
    const target = { ...items[0], publishedAt: new Date().toISOString() };
    const c = compare(target, items, []);
    expect(c.early).toBe(true);
    expect(c.caveats.join(' ')).toMatch(/Only 2 earlier/);
    expect(c.rows.find((r) => r.key === 'views')?.median).toBeNull();
  });

  it('the evidence fingerprint ignores tiny changes but not material ones', () => {
    const [m] = makeMedia(1, 'instagram') as any[];
    const h = evidenceHash(m, 'v');
    expect(evidenceHash({ ...m, views: m.views + 3 }, 'v')).toBe(h);
    expect(evidenceHash({ ...m, views: m.views * 2 }, 'v')).not.toBe(h);
  });
});

it('only accepts exact public Instagram post URLs for retrieval', () => {
  expect(instagramPermalink('https://instagram.com/reel/ABC_123/?igsh=test')).toBe('https://www.instagram.com/reel/ABC_123/');
  for (const url of ['https://instagram.com.evil.test/reel/ABC/', 'https://evil.test/instagram.com', 'http://instagram.com/reel/ABC/', 'https://user:pass@instagram.com/reel/ABC/', 'https://instagram.com/accounts/login/']) expect(instagramPermalink(url)).toBeNull();
});
