import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const state = vi.hoisted(() => ({ mode: 'image', platform: 'instagram', calls: [] as any[], invalid: '', fail: false }));
vi.mock('../src/services/ai/creativeReport.service.js', async () => {
  const { mediaUnavailable } = await import('../src/lib/errors.js');
  return { creativeReportService: {}, collectCreativeMedia: async (doc: any) => {
    if (state.mode === 'unavailable') throw mediaUnavailable('The actual video is unavailable.');
    const video = state.mode === 'video' || state.mode === 'carousel';
    return {
      item: { platform: state.platform, contentType: state.mode === 'video' ? 'reel' : state.mode === 'carousel' ? 'carousel' : 'post', caption: doc.caption },
      media: { basis: state.mode === 'video' ? 'full_video' : state.mode, images: ['image', 'carousel'].includes(state.mode) ? [{ data: 'aW1hZ2U=', mimeType: 'image/jpeg', label: 'slide 1' }] : [], videos: video ? [{ bytes: new Uint8Array(20), mimeType: 'video/mp4', label: 'slide 2 video', durationSeconds: 24 }] : [], youtubeUrl: null, durationSeconds: video ? 24 : null, notes: state.mode === 'carousel' ? ['Slide 3 could not be loaded and was not reviewed.'] : [], failure: null },
    };
  } };
});
vi.mock('../src/services/ai/geminiClient.js', async (orig) => ({ ...(await orig<Record<string, unknown>>()), aiAvailable: () => true, uploadVideo: async () => ({ name: 'files/deep-test', uri: 'https://files.example/video', mimeType: 'video/mp4' }), deleteUploaded: vi.fn(), generateMultimodalJson: async (opts: any) => {
  if (state.fail) throw new Error('provider down');
  state.calls.push(opts);
  const video = ['video', 'carousel'].includes(state.mode);
  const textOnly = state.mode === 'text';
  const sections = Array.from({ length: state.invalid === 'eleven' ? 11 : 12 }, (_, i) => ({ number: i + 1, rating: 'strong', finding: 'The opening establishes the subject with a close-up.', evidence: [{ source: textOnly ? 'caption' : video ? 'video_frame' : 'image', assetId: textOnly ? null : state.invalid === 'asset' ? 'missing_asset' : video ? 'video_1' : 'image_1', timestamp: video ? state.invalid === 'timestamp' ? 99 : 1 : null, description: 'The subject is visible in the opening close-up.' }], impact: 'This may make the central idea easier to understand.', action: 'Test the close-up before the logo.', tips: ['Try an opening question about this subject.'] }));
  const timeline = video ? [0, 8, 16].map((start) => ({ assetId: 'video_1', startSeconds: start, endSeconds: start + 8, observation: 'The scene shows the subject before the logo.', rating: 'good', action: 'Keep the subject visible.' })) : [];
  if (state.invalid === 'timeline') timeline.pop();
  if (['image', 'carousel', 'text'].includes(state.mode) && state.invalid !== 'missing-slide') timeline.unshift({ assetId: textOnly ? 'post_text' : 'image_1', startSeconds: null as any, endSeconds: null as any, observation: 'The main subject comes before the supporting text.', rating: 'good', action: 'Shorten the supporting text.' });
  return { data: opts.schema.parse({ summary: 'The close-up establishes a clear subject.', sections, timeline, takeaways: ['Open with the close-up before showing the logo.'], limitations: [] }), model: 'test-model', latencyMs: 1 };
} }));

let user: Awaited<ReturnType<typeof registerUser>>;
let mediaId: string;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearDb(); fake.reset(); state.mode = 'image'; state.platform = 'instagram'; state.calls = []; state.invalid = ''; state.fail = false;
  user = await registerUser('deep@test.example');
  fake.items = makeMedia(1, 'instagram');
  await api().post('/api/v1/connections/instagram/connect').set(user.auth).send({ accessToken: 'fake-token' });
  while (await syncService.runOne('deep-test'));
  mediaId = (await api().get('/api/v1/media?limit=1').set(user.auth)).body.data[0].id;
  await ContentItem.updateOne({ legacyId: mediaId }, { $set: { views: 987654321, likes: 123456789, caption: 'A subject in natural light.', title: 'The subject' } });
});
const analyze = (body: Record<string, unknown> = {}) => api().post('/api/v1/intelligence/deep-report').set(user.auth).send({ mediaId, ...body });

describe('twelve-section media-only deep report', () => {
  it.each(['instagram', 'facebook', 'youtube', 'linkedin'])('uses the same twelve-part contract for %s without passing analytics to AI', async (platform) => {
    state.platform = platform;
    const res = await analyze();
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.result.sections).toHaveLength(12);
    expect(data.result.sections[0].title).toBe('Performance diagnosis');
    expect(data.result.sections[11].title).toBe('Next-content strategy');
    for (const section of data.result.sections) for (const key of ['finding', 'evidence', 'impact', 'action']) expect(section[key]).toBeTruthy();
    expect(data.result.sections[0].rating).toBe('not_observable');
    expect(data.result.sections[9].rating).toBe('not_observable');
    expect(data.result.sections[5].rating).toBe('not_observable');
    expect(JSON.stringify(state.calls[0].parts)).not.toMatch(/987654321|123456789|engagementRate|comparison|primarySignal/);
    expect(state.calls[0].parts.some((p: any) => p.inlineData?.mimeType === 'image/jpeg')).toBe(true);
    expect(data.metrics).toBeUndefined();
  });
  it('reviews the actual video with continuous opening, middle and ending scenes', async () => {
    state.mode = 'video';
    const res = await analyze();
    expect(res.status).toBe(200);
    expect(res.body.data.result.timeline.map((t: any) => t.startSeconds)).toEqual([0, 8, 16]);
    expect(state.calls[0].parts.some((p: any) => p.fileData?.mimeType === 'video/mp4')).toBe(true);
  });
  it('reviews mixed carousel slides and preserves missing-slide limitations', async () => {
    state.mode = 'carousel';
    const res = await analyze();
    expect(res.status).toBe(200);
    expect(res.body.data.assets).toHaveLength(2);
    expect(res.body.data.result.limitations).toContain('Slide 3 could not be loaded and was not reviewed.');
  });
  it('handles actual text-only posts without inventing audio or image quality', async () => {
    state.mode = 'text';
    const res = await analyze();
    expect(res.status).toBe(200);
    expect(res.body.data.assets[0].kind).toBe('text');
    expect(res.body.data.result.sections[4].rating).toBe('not_observable');
    expect(res.body.data.result.sections[5].rating).toBe('not_observable');
  });
  it.each(['asset', 'timestamp', 'timeline', 'eleven', 'missing-slide'])('rejects unsupported or incomplete model evidence: %s', async (invalid) => {
    state.mode = 'carousel'; state.invalid = invalid;
    expect((await analyze()).status).toBe(503);
    expect(await ContentAnalysis.countDocuments()).toBe(0);
  });
  it('does not replace inaccessible media with a thumbnail or metrics', async () => {
    state.mode = 'unavailable';
    expect((await analyze()).status).toBe(422);
    expect(state.calls).toHaveLength(0);
  });
  it('caches independently of website reports and metric changes, and retains a valid report on failed refresh', async () => {
    expect((await analyze()).status).toBe(200);
    await ContentItem.updateOne({ legacyId: mediaId }, { $set: { views: 42 } });
    expect((await analyze()).body.data.fromCache).toBe(true);
    state.fail = true;
    const refresh = await analyze({ reanalyze: true });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.refreshError).toBeTruthy();
    expect(state.calls).toHaveLength(1);
    const saved = await ContentAnalysis.findOne().lean();
    expect(saved?.analysisVersion).toBe('app-deep-creative-twelve-v1');
    expect(saved?.metrics).toBeNull();
    expect(saved?.comparison).toBeNull();
  });
  it('rejects metrics payloads and prevents access to another user’s content', async () => {
    expect((await analyze({ metrics: { views: 42 } })).status).toBe(422);
    const other = await registerUser('other-deep@test.example');
    expect((await api().post('/api/v1/intelligence/deep-report').set(other.auth).send({ mediaId })).status).toBe(404);
    expect(state.calls).toHaveLength(0);
  });
});
