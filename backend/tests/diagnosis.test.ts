import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

// Test doubles only: no real Instagram, media or Gemini calls are made.
vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
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
    generateMultimodalJson: async (o: any) => { gem.calls.push(o); return { data: gem.impl!(o), model: 'test-model', latencyMs: 1 }; },
  };
});

vi.mock('../src/services/ai/postEvidence.js', async () => {
  const actual: any = await vi.importActual('../src/services/ai/postEvidence.js');
  return {
    ...actual,
    // The real gatherer reaches the platform; here the media is the fixture's single image.
    gatherPostEvidence: vi.fn(async (uid: any, mediaId: string) => {
      const { mediaRepository } = await import('../src/repositories/media.repository.js');
      const { toNormalized } = await import('../src/integrations/mapper.js');
      const { loadAnalyticsContext } = await import('../src/services/analytics.service.js');
      const { syncedMetrics, derivedMetrics, compare } = await import('../src/services/ai/contentEvidence.js');
      const doc = await mediaRepository.findByIdOrLegacy(uid, mediaId);
      const item = toNormalized(doc);
      const ctx = await loadAnalyticsContext(uid);
      const metricItems = syncedMetrics(item);
      return {
        item,
        metrics: { collectedAt: new Date().toISOString(), items: [...metricItems, ...derivedMetrics(metricItems)] },
        comparison: compare(item, ctx.media, metricItems),
        media: { basis: 'image', images: [{ data: 'AAAA', mimeType: 'image/jpeg', label: 'image' }], videos: [], youtubeUrl: null, durationSeconds: null, failure: null, notes: [] },
        videoPost: false,
        liveError: null,
        coverUrl: item.thumbnailUrl,
      };
    }),
  };
});

import { ContentAnalysis } from '../src/models/ContentAnalysis.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { User } from '../src/models/User.js';

const insight = (key: string, extra: Record<string, unknown> = {}) => ({
  key, title: `${key} title`, signal: 'mixed', observation: 'observed', evidence: 'evidence', whyItMatters: 'matters', metric: '1,000 views vs 800 median', confidence: 'medium', ...extra,
});

describe('performance-adaptive diagnosis', () => {
  beforeAll(async () => { await startTestDb(); });
  afterAll(async () => { await stopTestDb(); });
  beforeEach(async () => {
    await clearDb();
    fake.reset();
    gem.calls = [];
  });

  /** Creates a user with `count` synced posts, and a target post with a chosen engagement rate. */
  async function seed(email: string, count: number, targetEngagement: number) {
    const user = await registerUser(email);
    const account = await ConnectedAccount.create({
      userId: user.id, platform: 'instagram', providerAccountId: 'ig-acct', handle: '@ig', displayName: 'IG',
      status: 'sync_complete', active: true, dataPointsCount: count, missingPermissions: [],
    });
    const items = makeMedia(count, 'instagram', { startEng: 2 });
    await ContentItem.insertMany(items.map((m) => ({
      userId: user.id, connectedAccountId: account._id, platform: 'instagram', providerMediaId: m.id, legacyId: m.id,
      contentType: m.contentType, publishedAt: new Date(m.publishedAt), views: m.views, reach: m.reach, likes: m.likes,
      comments: m.comments, shares: m.shares, engagementRate: m.engagementRate, syncedAt: new Date(), normalized: m,
    })));
    const target = {
      userId: user.id, connectedAccountId: account._id, platform: 'instagram', providerMediaId: 'ig_target', legacyId: 'ig_target',
      contentType: 'reel', publishedAt: new Date(), views: 9000, reach: 8000, likes: 400, comments: 20, shares: 30,
      engagementRate: targetEngagement, syncedAt: new Date(), normalized: { ...makeMedia(1)[0], id: 'ig_target', engagementRate: targetEngagement, views: 9000, reach: 8000, likes: 400, comments: 20, shares: 30 },
    };
    await ContentItem.create(target);
    return { user, account, target };
  }

  it('classifies a top performer and returns insights, a three-line summary and what to preserve', async () => {
    const { user } = await seed('top@test.example', 8, 12);
    gem.impl = () => ({
      summary: 'The opening question pulls people straight in.',
      threeLine: { whatWorked: 'A relatable question in the first two seconds.', performanceProof: '12% engagement against a 4% median.', strategicTakeaway: 'Questions work for this audience.' },
      insights: ['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals'].map((k) => insight(k, { signal: k === 'hook' ? 'positive' : 'mixed' })),
      preserve: ['The opening question'], limitations: [], confidence: { level: 'high', reason: 'media and metrics' },
    });
    const res = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe('TOP');
    expect(res.body.data.result.insights).toHaveLength(6);
    expect(res.body.data.result.threeLine.performanceProof).toMatch(/12%/);
    expect(res.body.data.result.preserve).toEqual(['The opening question']);
    // The classification comes from the account's own history, never from the model.
    expect(gem.calls[0].parts[0].text).toContain('"result": "TOP"');
  });

  it('classifies a bottom performer and returns a next step, three alternatives and diagnostics', async () => {
    const { user } = await seed('bottom@test.example', 8, 0.2);
    gem.impl = () => ({
      summary: 'The opening is a slow logo animation.',
      nextStep: { headline: 'The first second is a logo.', body: 'Open on the result instead of the logo.' },
      alternatives: [
        { title: 'Result first', angle: 'Lead with the outcome', hook: 'We filled 200 rooms.', execution: 'Open on the crowd', cta: 'Book a table', whyItMayWorkBetter: 'It leads with the payoff.' },
        { title: 'Face first', angle: 'Lead with a person', hook: 'Meet the team.', execution: 'Close-up', cta: 'Reserve', whyItMayWorkBetter: 'Faces stop the scroll.' },
        { title: 'Number first', angle: 'Lead with a stat', hook: '200 rooms.', execution: 'Text over footage', cta: 'See rooms', whyItMayWorkBetter: 'A number is instantly clear.' },
      ],
      diagnostics: [
        { title: 'Slow opening', signal: 'negative', observation: 'Logo for 2s', metric: '800 views vs 5,000 median', impact: 'Loses the scroll', improvement: 'Open on the crowd' },
        { title: 'Clear topic', signal: 'positive', observation: 'Topic is clear', metric: null, impact: 'Not a priority', improvement: 'Keep it' },
        { title: 'Thumbnail', signal: 'mixed', observation: 'Text is small', metric: null, impact: 'Hard to read', improvement: 'Enlarge the text' },
      ],
      limitations: [], confidence: { level: 'medium', reason: 'media and metrics' },
    });
    const res = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe('BOTTOM');
    expect(res.body.data.result.nextStep.headline).toMatch(/logo/i);
    expect(res.body.data.result.alternatives).toHaveLength(3);
    expect(res.body.data.result.diagnostics.length).toBeGreaterThanOrEqual(3);
    // The bottom prompt asks for recovery, not for praise.
    expect(gem.calls[0].parts[0].text).toContain('recovery plan');
  });

  it('classifies an average performer and returns what works, the opportunity and one test', async () => {
    const { user } = await seed('average@test.example', 8, 3.5);
    gem.impl = () => ({
      summary: 'A steady post that neither over- nor under-performs.',
      whatWorks: 'The caption names the offer clearly.',
      mainOpportunity: 'The first frame is a wide shot with small text.',
      nextExperiment: 'Move the headline into the first frame.',
      insights: ['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals'].map((k) => insight(k)),
      limitations: [], confidence: { level: 'medium', reason: 'media and metrics' },
    });
    const res = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe('AVERAGE');
    expect(res.body.data.result.whatWorks).toBeTruthy();
    expect(res.body.data.result.nextExperiment).toBeTruthy();
  });

  it('says there is not enough history instead of misclassifying', async () => {
    const { user } = await seed('few@test.example', 2, 12);
    gem.impl = () => ({
      summary: 'A good-looking post, but the account has too little history to compare it.',
      whatWorks: 'The cover is clear.',
      mainOpportunity: 'Publish a few more posts on this account.',
      nextExperiment: 'Test one more opening style.',
      limitations: [], confidence: { level: 'low', reason: 'Not enough history to compare' },
    });
    const res = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(res.status).toBe(200);
    expect(res.body.data.classification).toBe('INSUFFICIENT_DATA');
    expect(res.body.data.baseline.method).toMatch(/Not enough history/);
    // It is never described as a top or bottom performer.
    expect(gem.calls[0].parts[0].text).not.toContain('TOP PERFORMER');
    expect(gem.calls[0].parts[0].text).not.toContain('BOTTOM PERFORMER');
  });

  it('saves the diagnosis and returns the saved result without calling the model again', async () => {
    const { user } = await seed('cache@test.example', 8, 12);
    gem.impl = () => ({
      summary: 'Saved.', threeLine: { whatWorked: 'a', performanceProof: 'b', strategicTakeaway: 'c' },
      insights: ['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals'].map((k) => insight(k)),
      preserve: [], limitations: [], confidence: { level: 'high', reason: 'x' },
    });
    const first = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(first.status).toBe(200);
    expect(gem.calls).toHaveLength(1);
    const second = await api().post('/api/v1/intelligence/diagnosis').set(user.auth).send({ mediaId: 'ig_target' });
    expect(second.status).toBe(200);
    expect(second.body.data.fromCache).toBe(true);
    expect(gem.calls).toHaveLength(1);
    expect(await ContentAnalysis.countDocuments({ analysisType: 'diagnosis' })).toBe(1);
  });
});
