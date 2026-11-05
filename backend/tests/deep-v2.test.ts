import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearDb, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { fake, makeMedia } from './fakes.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { DeepAnalysisJob, SavedDeepAction } from '../src/models/DeepAnalysisJob.js';
import { userService } from '../src/services/user.service.js';
import { syncService } from '../src/services/sync.service.js';
import { deepV2Jobs } from '../src/services/ai/deepV2.jobs.js';
import { AiFailedError } from '../src/services/ai/geminiClient.js';
import { reportV2Schema } from '../src/services/ai/deepV2.reportSchema.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => adapters[p] ??= fakeAdapter(p as any) };
});
const state = vi.hoisted(() => ({ mode: 'image', duration: 24 as number | null, calls: [] as any[], failMiddle: false, invalidTime: false, fail: false, language: 'en', audio: 'speech', missingSlide: false, invalidAdvisor: false, verboseAdvisor: false, advisorCalls: 0, advisorFail: false, invalidQuote: false }));
vi.mock('../src/services/ai/deepV2.media.js', async () => ({ collectDeepV2Media: async (doc: any) => {
  if (state.mode === 'unavailable') throw new Error('original media inaccessible');
  const video = state.mode === 'video';
  return { item: { caption: doc.caption, contentType: doc.contentType, platform: doc.platform }, media: {
    basis: video ? 'full_video' : state.mode, images: ['image', 'carousel'].includes(state.mode) ? Array.from({ length: state.mode === 'carousel' ? 2 : 1 }, (_, i) => ({ data: 'aW1hZ2U=', mimeType: 'image/jpeg', label: `slide ${i + 1} of ${state.mode === 'carousel' ? 2 : 1}` })) : [],
    videos: video ? [{ bytes: new Uint8Array(20), mimeType: 'video/mp4', label: 'video', durationSeconds: state.duration }] : [], youtubeUrl: state.mode === 'youtube' ? 'https://www.youtube.com/watch?v=example' : null,
    durationSeconds: state.duration, notes: state.missingSlide ? ['Slide 3 could not be loaded and was not reviewed.'] : [], failure: null,
  } };
} }));
vi.mock('../src/services/ai/deepV2.audience.js', () => ({ collectAudienceInputs: async () => ({}), buildAudience: async () => ({ availability: 'unavailable', findings: [], sampledComments: 0, collectedAt: new Date().toISOString(), limitations: ['No audience feedback is available.'] }) }));
vi.mock('../src/services/ai/geminiClient.js', async (orig) => ({ ...(await orig<Record<string, unknown>>()), aiAvailable: () => true, uploadVideo: async () => ({ name: 'files/v2-test', uri: 'https://files.example/video', mimeType: 'video/mp4' }), deleteUploaded: vi.fn(), generateMultimodalJson: async (opts: any) => {
  state.calls.push(opts);
  if (state.fail) throw new Error('mock provider failure');
  const input = JSON.parse(opts.parts[0].text);
  if (input.kind) {
    if (state.failMiddle && input.startSeconds === 45) throw new Error('a video window failed');
    const timed = input.kind === 'video';
    const at = timed ? state.invalidTime ? 99999 : input.startSeconds : null;
    const end = timed ? input.endSeconds ?? input.startSeconds + 24 : null;
    const source = input.kind === 'text' ? 'caption' : input.kind === 'image' ? 'image' : 'video_frame';
    return { model: 'test-model', data: opts.schema.parse({ observations: [{ source, startSeconds: at, endSeconds: timed ? at + 1 : null, pageNumber: null, quote: input.kind === 'text' ? state.invalidQuote ? 'Text from a different post' : input.caption : timed && state.language !== 'en' ? 'నమస్కారం' : null, description: input.kind === 'text' ? 'The post opens with a subject in natural light.' : 'The subject is visible before the supporting explanation.', confidence: 'high' }], segments: [{ startSeconds: timed ? input.startSeconds : null, endSeconds: end, status: 'strong', observationIndexes: [0] }], processed: true, audioStatus: timed ? state.audio : 'not_applicable', limitations: [] }) };
  }
  state.advisorCalls++;
  if (state.advisorFail) throw new AiFailedError('mock provider failure', 'provider_error');
  if (state.invalidAdvisor && state.advisorCalls === 1) throw new AiFailedError('Invalid structured output', 'invalid_response');
  const source = input.observations.find((s: any) => s.source !== 'caption') ?? input.observations[0];
  const caption = input.observations.find((s: any) => s.source === 'caption') ?? source;
  const media = input.observations.find((s: any) => ['image','video_frame','document','on_screen_text'].includes(s.source)) ?? source;
  return { model: 'test-model', data: opts.schema.parse({ headline: 'A subject-first introduction', introduction: state.verboseAdvisor ? 'The subject is introduced clearly. '.repeat(60) : 'The post introduces the subject before supporting context. Its caption adds a brief explanation in natural language.', verdict: 'The subject is recognizable early. The available context remains concise.', evidenceIds: [source.id],
    sections: input.requiredSections.map((key: string) => ({ key, title: key === 'visual' ? 'The subject leads the composition' : 'A subject-first introduction', assessment: key === 'visual' ? 'The subject is visible before the supporting explanation. The composition gives it an immediate focal point.' : 'The post places the subject before supporting context. This makes its opening topic explicit without demonstrating an audience outcome.', status: 'good', evidenceIds: key === 'alignment' ? [caption.id, media.id] : key === 'visual' ? [media.id] : key === 'structure' ? [media.id] : [caption.id] })), facts: [],
    actions: [{ kind: 'repeat', title: 'Keep the subject-first opening', why: 'The subject is introduced early.', what: 'Lead your next post with this subject before adding supporting context.', example: null, evidenceIds: [source.id] }, { kind: 'idea', title: 'Explain one practical detail', why: 'The subject gives the next post a clear focus.', what: 'Create a follow-up explaining one practical detail about this subject.', example: null, evidenceIds: [source.id] }] }) };

} }));

let user: Awaited<ReturnType<typeof registerUser>>;
let postId: string;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearDb(); fake.reset(); Object.assign(state, { mode: 'image', duration: 24, calls: [], failMiddle: false, invalidTime: false, fail: false, language: 'en', audio: 'speech', missingSlide: false, invalidAdvisor: false, verboseAdvisor: false, advisorCalls: 0, advisorFail: false, invalidQuote: false });
  user = await registerUser('v2@test.example'); fake.items = makeMedia(1, 'instagram');
  await api().post('/api/v1/connections/instagram/connect').set(user.auth).send({ accessToken: 'fake-token' });
  while (await syncService.runOne('v2-test'));
  postId = (await api().get('/api/v1/media?limit=1').set(user.auth)).body.data[0].id;
  await ContentItem.updateOne({ legacyId: postId }, { $set: { views: 987654321, likes: 123456789, caption: 'A subject in natural light.', title: 'Subject introduction' } });
});
const start = (body = {}) => api().post('/api/v1/intelligence/deep-report-v2').set(user.auth).send({ postId, ...body });
async function run(body = {}) {
  const started = await start(body);
  expect(started.status).toBe(202);
  await deepV2Jobs.runOne('test-worker');
  return (await api().get(`/api/v1/intelligence/deep-report-v2/${started.body.data.jobId}`).set(user.auth)).body.data;
}
describe('Deep Analysis V2 jobs and evidence pipeline', () => {
  it.each(['instagram', 'facebook', 'youtube', 'linkedin'])('keeps the exact selected %s post identity and excludes metrics from creative prompts', async (platform) => {
    await ContentItem.updateOne({ legacyId: postId }, { $set: { platform } });
    const result = await run();
    expect(result.status).toBe('complete');
    expect(result.report.postId).toBe(postId);
    expect(result.report.platform).toBe(platform);
    expect(result.report.overview.editorial.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.report.nextMove.actions.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(state.calls.map((c) => c.parts))).not.toMatch(/987654321|123456789|engagementRate|primarySignal/);
    expect(reportV2Schema.safeParse(result.report).success).toBe(true);
  });
  it('processes a short Reel but does not certify frame-perfect coverage', async () => {
    state.mode = 'video';
    const result = await run();
    expect(result.status).toBe('partial');
    expect(result.report.coverage.isComplete).toBe(false);
    expect(result.report.coverage.analyzedDurationSeconds).toBe(24);
    expect(state.calls.some((c) => c.parts.some((p: any) => p.fileData?.mimeType === 'video/mp4'))).toBe(true);
  });
  it('covers a long YouTube video using bounded windows from zero to its end', async () => {
    state.mode = 'youtube'; state.duration = 1440;
    const result = await run();
    const windows = state.calls.flatMap((c) => c.parts).filter((p: any) => p.videoMetadata);
    expect(windows).toHaveLength(12);
    expect(windows[0].videoMetadata.startOffset).toBe('0s');
    expect(windows.at(-1).videoMetadata.endOffset).toBe('1440s');
    expect(result.report.coverage.analyzedDurationSeconds).toBe(1440);
  });
  it('retains slide order and marks a missing carousel slide as partial', async () => {
    state.mode = 'carousel'; state.missingSlide = true;
    const result = await run();
    expect(result.report.overview.timeline.map((s: any) => s.slideNumber)).toEqual([1, 2]);
    expect(result.report.coverage.isComplete).toBe(false);
    expect(result.report.coverage.limitations.join(' ')).toContain('Slide 3');
  });
  it('analyzes LinkedIn text without a video timeline or video-specific findings', async () => {
    state.mode = 'text';
    const result = await run();
    expect(result.report.mediaType).toBe('text');
    expect(result.report.overview.timeline).toHaveLength(0);
    expect(result.report.processing.sources.every((s: any) => ['caption', 'title'].includes(s.source))).toBe(true);
  });
  it('keeps a failed video window grey and never reports full coverage', async () => {
    state.mode = 'video'; state.duration = 120; state.failMiddle = true;
    const result = await run();
    expect(result.report.overview.timeline.find((s: any) => s.startSeconds === 45).status).toBe('insufficient_evidence');
    expect(result.report.coverage.analyzedDurationSeconds).toBe(75);
    expect(result.status).toBe('partial');
  });
  it('rejects out-of-range timestamps and preserves text evidence without claiming the video was watched', async () => {
    state.mode = 'video'; state.invalidTime = true;
    const result = await run();
    expect(result.report.processing.sources.some((s: any) => s.startSeconds === 99999)).toBe(false);
    expect(result.report.coverage.analyzedDurationSeconds).toBe(0);
  });
  it.each(['silent', 'music'])('handles a video with %s audio without inventing speech', async (audio) => {
    state.mode = 'video'; state.audio = audio; state.language = 'te';
    const result = await run();
    expect(result.report.processing.sources.every((s: any) => s.source !== 'audio')).toBe(true);
    expect(result.report.coverage.isComplete).toBe(false);
  });
  it('handles inaccessible media as a partial text-only review, not a fabricated scene review', async () => {
    state.mode = 'unavailable';
    const result = await run();
    expect(result.status).toBe('partial');
    expect(result.report.overview.timeline).toHaveLength(0);
    expect(result.report.coverage.limitations.join(' ')).toContain('inaccessible');
  });
  it('repairs invalid advisor JSON once while preserving the exact selected post evidence', async () => {
    state.invalidAdvisor = true;
    const result = await run();
    expect(state.advisorCalls).toBe(2);
    expect(result.status).toBe('complete');
    expect(result.report.overview.editorial.sections.length).toBeGreaterThanOrEqual(3);
    const advisor = state.calls.filter((c) => JSON.parse(c.parts[0].text).observations);
    expect(advisor[1].parts[0]).toEqual(advisor[0].parts[0]);
    expect(advisor[1].parts[1].text).toContain('Repair');
  });
  it('normalizes verbose model prose to the persisted report contract', async () => {
    state.verboseAdvisor = true;
    const result = await run();
    expect(result.status).toBe('complete');
    expect(result.report.overview.summary.length).toBeLessThanOrEqual(700);
    expect(reportV2Schema.safeParse(result.report).success).toBe(true);
  });
  it('counts available post text when original media is inaccessible and discloses the evidence scope', async () => {
    state.mode = 'unavailable';
    const result = await run();
    expect(result.report.coverage.accessibleAssets).toBe(1);
    expect(result.report.coverage.analyzedAssets).toBe(1);
    expect(result.report.coverage.method).toContain('caption/title only');
    const input = JSON.parse(state.calls.find((c) => JSON.parse(c.parts[0].text).observations).parts[0].text);
    expect(input.scope).toContain('original visual/audio content was not assessed');
  });
  it('fails clearly after interpretation failure without manufacturing a successful empty report', async () => {
    state.mode = 'unavailable'; state.advisorFail = true;
    const result = await run();
    expect(result.status).toBe('failed'); expect(result.report).toBeNull();
  });
  it('uses the complete platform caption verbatim instead of AI-generated text quotations', async () => {
    state.mode = 'unavailable'; state.invalidQuote = true;
    const result = await run();
    expect(result.report.processing.sources.find((s: any) => s.source === 'caption').quote).toBe('A subject in natural light.');
    expect(state.calls.some((c) => JSON.parse(c.parts[0].text).kind === 'text')).toBe(false);
  });
  it('fails instead of publishing a report when no content can be read', async () => {
    state.mode = 'unavailable';
    await ContentItem.updateOne({ legacyId: postId }, { $set: { caption: '', title: '' } });
    const result = await run(); expect(result.status).toBe('failed'); expect(result.report).toBeNull();
  });
  it('deduplicates queued requests, caches by goal/media/model/version, and saves recommendations', async () => {
    const a = await start(), b = await start();
    expect(a.body.data.jobId).toBe(b.body.data.jobId);
    await deepV2Jobs.runOne();
    const cached = await start(); expect(cached.status).toBe(200);
    expect(cached.body.data.jobId).toBe(a.body.data.jobId);
    const jobId = a.body.data.jobId;
    expect((await api().post(`/api/v1/intelligence/deep-report-v2/${jobId}/actions/action_idea`).set(user.auth)).status).toBe(200);
    expect((await api().get(`/api/v1/intelligence/deep-report-v2/${jobId}/saved-actions`).set(user.auth)).body.data).toEqual(['action_idea']);
    expect((await api().delete(`/api/v1/intelligence/deep-report-v2/${jobId}/actions/action_idea`).set(user.auth)).status).toBe(200);
    const changed = await start({ goal: 'Teach practical details to beginners' });
    expect(changed.body.data.jobId).not.toBe(jobId);
  });
  it('supports cancellation and prevents another user from reading or saving this post’s report', async () => {
    const response = await start(), jobId = response.body.data.jobId;
    const other = await registerUser('other-v2@test.example');
    expect((await api().get(`/api/v1/intelligence/deep-report-v2/${jobId}`).set(other.auth)).status).toBe(404);
    expect((await api().post(`/api/v1/intelligence/deep-report-v2/${jobId}/actions/action_idea`).set(other.auth)).status).toBe(404);
    expect((await api().post(`/api/v1/intelligence/deep-report-v2/${jobId}/cancel`).set(user.auth)).body.data.status).toBe('cancelled');
    expect(await deepV2Jobs.runOne()).toBe(false);
    expect(state.calls).toHaveLength(0);
  });
  it('does not let unvalidated model JSON become a completed report', async () => {
    state.fail = true;
    const result = await run();
    expect(result.report?.coverage.isComplete ?? false).toBe(false);
    expect((await DeepAnalysisJob.findById(result.jobId).lean())?.status).not.toBe('complete');
  });
  it('cancels queued analysis when its platform account is disconnected', async () => {
    const response = await start();
    expect((await api().delete('/api/v1/connections/instagram').set(user.auth)).status).toBe(200);
    expect((await DeepAnalysisJob.findById(response.body.data.jobId).lean())?.status).toBe('cancelled');
    expect(await deepV2Jobs.runOne()).toBe(false);
  });
  it('recovers an expired worker lease and prevents two workers from claiming the same job', async () => {
    const started = await start();
    await DeepAnalysisJob.updateOne({ _id: started.body.data.jobId }, { $set: { status: 'processing', attempts: 1, leaseOwner: 'interrupted-worker', leaseExpiresAt: new Date(Date.now() - 1000) } });
    const claimed = await Promise.all([deepV2Jobs.runOne('worker-a'), deepV2Jobs.runOne('worker-b')]);
    expect(claimed.sort()).toEqual([false, true]);
    const saved = await DeepAnalysisJob.findById(started.body.data.jobId).lean();
    expect(saved?.status).toBe('complete'); expect(saved?.attempts).toBe(2);
  });
  it('refreshes only audience feedback and keeps creative findings and post identity unchanged', async () => {
    const result = await run();
    const calls = state.calls.length;
    const refreshed = await api().post(`/api/v1/intelligence/deep-report-v2/${result.jobId}/audience`).set(user.auth);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.report.overview).toEqual(result.report.overview);
    expect(refreshed.body.data.report.generatedAt).toBe(result.report.generatedAt);
    expect(refreshed.body.data.postId).toBe(postId);
    expect(state.calls).toHaveLength(calls);
    const other = await registerUser('audience-owner@test.example');
    expect((await api().post(`/api/v1/intelligence/deep-report-v2/${result.jobId}/audience`).set(other.auth)).status).toBe(404);
  });
  it('removes reports and saved recommendations with only the deleted user’s data', async () => {
    const result = await run();
    await deepV2Jobs.save(user.id, result.jobId, 'action_idea');
    const other = await registerUser('retained-v2@test.example');
    await DeepAnalysisJob.create({ userId: other.id, postId: 'other_post', accountId: other.id, fingerprint: 'other', version: 'other', goal: 'Other goal', status: 'queued', progress: { stage: 'Waiting', processed: 0, total: 1 } });
    await userService.deleteAccount(user.id);
    expect(await DeepAnalysisJob.countDocuments({ userId: user.id })).toBe(0);
    expect(await SavedDeepAction.countDocuments({ userId: user.id })).toBe(0);
    expect(await DeepAnalysisJob.countDocuments({ userId: other.id })).toBe(1);
  });
});
