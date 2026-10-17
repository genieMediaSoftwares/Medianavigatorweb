import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearDb, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { fake, makeMedia } from './fakes.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { ContentAnalysis } from '../src/models/ContentAnalysis.js';
import { syncService } from '../src/services/sync.service.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => adapters[p] ??= fakeAdapter(p as any) };
});
const state = vi.hoisted(() => ({ basis: 'image', calls: [] as any[], count: 7, badVideo: false }));
vi.mock('../src/lib/http.js', async (orig) => ({ ...(await orig<Record<string, unknown>>()), httpFetch: vi.fn(async (input: string | URL) => {
  expect(String(input)).not.toMatch(/insights|like_count|comments_count/);
  return new Response(JSON.stringify({ media_type: state.basis === 'full_video' ? 'VIDEO' : 'IMAGE', media_url: 'https://cdn.example/original' }));
}) }));
vi.mock('../src/services/ai/contentEvidence.js', async (orig) => ({ ...(await orig<Record<string, unknown>>()), collectMedia: async () => ({ basis: state.basis, images: state.basis === 'image' || state.basis === 'thumbnail' ? [{ data: 'aW1hZ2U=', mimeType: 'image/jpeg', label: 'original image' }] : [], videos: state.basis === 'full_video' ? [{ bytes: new Uint8Array(20), mimeType: 'video/mp4', label: 'original video', durationSeconds: 24 }] : [], youtubeUrl: null, durationSeconds: state.basis === 'full_video' ? 24 : null, notes: [], failure: state.basis === 'none' ? 'Actual media unavailable' : null }) }));
vi.mock('../src/services/ai/geminiClient.js', async (orig) => ({ ...(await orig<Record<string, unknown>>()), aiAvailable: () => true, uploadVideo: async () => ({ name: 'files/test', uri: 'https://files.example/video', mimeType: 'video/mp4' }), deleteUploaded: vi.fn(), generateMultimodalJson: async (opts: any) => {
  state.calls.push(opts);
  const video = state.basis === 'full_video';
  const data = { summary: 'The clear opening image establishes a specific subject.', points: Array.from({ length: state.count }, (_, i) => ({ number: i + 1, finding: i === 4 || i === 5 ? 'The creative includes a clear invitation, but actual audience response and distribution cannot be observed.' : 'A clearly framed subject supports the message.', rating: 'strong', evidence: [{ source: video ? 'video_frame' : 'image', timestamp: video ? state.badVideo ? '00:01' : ['00:01', '00:12', '00:22'][i % 3] : null, description: 'The subject is clearly framed in the original content.' }] })), recommendations: ['Keep the clear subject and shorten the opening text.'], limitations: [] };
  return { data: opts.schema.parse(data), model: 'test-model', latencyMs: 1 };
} }));

let user: Awaited<ReturnType<typeof registerUser>>;
let mediaId: string;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearDb(); fake.reset(); state.basis = 'image'; state.calls = []; state.count = 7; state.badVideo = false;
  user = await registerUser('creative@test.example');
  fake.items = makeMedia(2, 'instagram');
  await api().post('/api/v1/connections/instagram/connect').set(user.auth).send({ accessToken: 'fake-token' });
  while (await syncService.runOne('creative-test'));
  mediaId = (await api().get('/api/v1/media?limit=1').set(user.auth)).body.data[0].id;
  await ContentItem.updateOne({ legacyId: mediaId }, { $set: { views: 987654321, likes: 123456789, caption: 'A subject in natural light.' } });
});
const analyze = (body: Record<string, unknown> = {}) => api().post('/api/v1/intelligence/creative-report').set(user.auth).send({ mediaId, type: 'why_top', ...body });

describe('app-only seven-part creative report', () => {
  it.each(['why_top', 'why_bottom'])('returns seven actual-media findings for %s and sends no analytics or ranking to the model', async (type) => {
    const res = await analyze({ type });
    expect(res.status).toBe(200);
    expect(res.body.data.result.points.map((p: any) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(res.body.data.result.points[0].title).toBe('Hook effectiveness');
    expect(res.body.data.result.points[6].title).toBe('Repeatable success factors');
    expect(res.body.data.result.points.slice(4, 6).map((p: any) => p.rating)).toEqual(['not_observable', 'not_observable']);
    const prompt = JSON.stringify(state.calls[0].parts);
    expect(prompt).not.toMatch(/987654321|123456789|median|baseline|engagementRate/);
    expect(state.calls[0].parts.some((p: any) => p.inlineData?.mimeType === 'image/jpeg')).toBe(true);
    expect(res.body.data.metrics).toBeUndefined();
  });
  it('does not use a cover image or missing media as a replacement for actual content', async () => {
    for (const basis of ['thumbnail', 'none']) { state.basis = basis; const res = await analyze(); expect(res.status).toBe(422); expect(res.body.error.code).toBe('MEDIA_UNAVAILABLE'); }
    expect(state.calls).toHaveLength(0);
  });
  it('requires video evidence across the timeline, not a single frame', async () => {
    state.basis = 'full_video'; state.badVideo = true;
    expect((await analyze()).status).toBe(503);
    expect(await ContentAnalysis.countDocuments()).toBe(0);
  });
  it('sends the actual video and accepts beginning, middle and end evidence', async () => {
    state.basis = 'full_video';
    expect((await analyze()).status).toBe(200);
    expect(state.calls[0].parts.some((p: any) => p.fileData?.mimeType === 'video/mp4')).toBe(true);
  });
  it('keeps a separate cache and does not invalidate it when performance metrics change', async () => {
    await analyze();
    await ContentItem.updateOne({ legacyId: mediaId }, { $set: { views: 42, likes: 7 } });
    expect((await analyze()).body.data.fromCache).toBe(true);
    expect(state.calls).toHaveLength(1);
    expect((await ContentAnalysis.findOne().lean())?.analysisVersion).toBe('app-creative-seven-v1');
    expect((await ContentAnalysis.findOne().lean())?.metrics).toBeNull();
  });
  it('rejects old six-point output and protects another user’s media', async () => {
    state.count = 6;
    expect((await analyze()).status).toBe(503);
    const other = await registerUser('other-creative@test.example');
    expect((await api().post('/api/v1/intelligence/creative-report').set(other.auth).send({ mediaId, type: 'why_top' })).status).toBe(404);
    expect(await ContentAnalysis.countDocuments()).toBe(0);
  });
  it('does not let callers provide a metrics or ranking payload', async () => {
    expect((await analyze({ rank: 'top by views', metrics: { views: 2000 } })).status).toBe(422);
    expect(state.calls).toHaveLength(0);
  });
});
