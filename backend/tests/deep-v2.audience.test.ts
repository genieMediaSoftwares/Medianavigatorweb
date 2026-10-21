import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { buildAudience, collectAudienceInputs } from '../src/services/ai/deepV2.audience.js';
import type { ContentItemDoc } from '../src/models/ContentItem.js';
const state = vi.hoisted(() => ({ userId: '', status: 200, body: {} as any, calls: [] as any[], invalidSources: false, repeatedId: false, expandedFails: false, motivation: '', modelCalls: 0 }));
vi.mock('../src/repositories/connection.repository.js', () => ({ connectionRepository: { findByIdWithCredentials: async () => ({ userId: state.userId, active: true, credentialsEnc: 'test' }) } }));
vi.mock('../src/services/sync.service.js', () => ({ readCredentials: () => ({ accessToken: 'fake-token', apiKey: 'fake-key', instagramLogin: true }) }));
vi.mock('../src/lib/http.js', () => ({ httpFetch: async (url: URL, options: any) => { state.calls.push({ url: String(url), headers: options.headers }); return new Response(JSON.stringify(state.body), { status: state.expandedFails && (url.searchParams.get('fields') || '').includes('.limit') ? 400 : state.status }); } }));
vi.mock('../src/services/ai/geminiClient.js', () => ({ generateMultimodalJson: async (opts: any) => {
  const comments = JSON.parse(opts.parts[0].text);
  state.modelCalls++;
  if (state.motivation) return { data: opts.schema.parse({ themes: [{ section: 'motivations', title: 'A reason to save', text: 'This comment explicitly mentions saving the guide for later use.', commentIds: [comments[0].id], explicitIntentQuotes: state.motivation === 'missing' ? [] : [{ commentId: comments[0].id, quote: state.motivation === 'forged' ? 'I shared this with all my friends.' : comments[0].text }] }] }) };
  return { data: opts.schema.parse({ themes: [{ section: 'questions', title: 'Practical questions', text: 'The accessible comments repeatedly ask for practical details.', commentIds: state.invalidSources ? ['invented_a', 'invented_b'] : state.repeatedId ? [comments[0].id, comments[0].id] : comments.slice(0, 2).map((c: any) => c.id) }] }) };
} }));
let doc: ContentItemDoc;
beforeEach(() => {
  const userId = new Types.ObjectId();
  Object.assign(state, { userId: String(userId), status: 200, body: {}, calls: [], invalidSources: false, repeatedId: false, expandedFails: false, motivation: '', modelCalls: 0 });
  doc = { userId, connectedAccountId: new Types.ObjectId(), platform: 'instagram', providerMediaId: 'post_123', syncedAt: new Date(), unavailableMetrics: ['reach', 'views', 'saves', 'watchTimeMinutes'], normalized: { missingMetrics: ['shares'] }, likes: 0, comments: 2, shares: 0, reach: 0, views: 0, saves: 0, watchTimeMinutes: null } as unknown as ContentItemDoc;
});
describe('permitted audience evidence adapters', () => {
  it.each(['instagram', 'facebook', 'youtube', 'linkedin'] as const)('normalizes actual %s comment text without author profiles or tokens in evidence', async (platform) => {
    doc.platform = platform;
    state.body = platform === 'youtube' ? { items: [{ snippet: { topLevelComment: { id: 'c1', snippet: { textDisplay: 'Where is this?' } } }, replies: { comments: [{ id: 'c2', snippet: { textDisplay: 'What is the location?' } }] } }] } : platform === 'linkedin' ? { elements: [{ id: 'c1', message: { text: 'Where is this?' } }, { id: 'c2', message: { text: 'What is the location?' } }] } : { data: [{ id: 'c1', text: 'Where is this?', message: 'Where is this?', username: 'excluded-user', replies: { data: [{ id: 'c2', text: 'What is the location?' }] } }] };
    const inputs = await collectAudienceInputs(doc);
    expect(inputs.comments).toHaveLength(2);
    expect(JSON.stringify(inputs.comments)).not.toMatch(/fake-token|fake-key|excluded-user|username/);
    expect(state.calls[0].url).not.toContain('access_token=');
    expect((await buildAudience(inputs)).findings.find((f) => f.section === 'questions')?.evidence).toHaveLength(2);
  });
  it('keeps known zero measured and unsupported metrics unavailable', async () => {
    const inputs = await collectAudienceInputs(doc);
    expect(inputs.metrics.find((s) => s.id === 'metric_likes')?.description).toContain(': 0.');
    expect(inputs.metrics.some((s) => ['metric_saves', 'metric_reach', 'metric_shares'].includes(s.id))).toBe(false);
    const audience = await buildAudience(inputs);
    expect(audience.findings[0].section).toBe('signals');
    expect(audience.findings[0].label).toBe('measured');
  });
  it('provides a genuine empty state for a post without comments or known metrics', async () => {
    doc.unavailableMetrics = ['likes', 'comments', 'shares', 'saves', 'views', 'reach', 'watchTimeMinutes'];
    const audience = await buildAudience(await collectAudienceInputs(doc));
    expect(audience.availability).toBe('unavailable'); expect(audience.findings).toHaveLength(0);
  });
  it('does not bypass a token permission error or an account ownership mismatch', async () => {
    state.status = 403;
    const restricted = await collectAudienceInputs(doc);
    expect(restricted.comments).toHaveLength(0);
    expect(restricted.limitations.join(' ')).toContain('restricted');
    state.calls = []; state.userId = String(new Types.ObjectId());
    expect((await collectAudienceInputs(doc)).comments).toHaveLength(0);
    expect(state.calls).toHaveLength(0);
  });
  it.each(['invalid', 'duplicate'])('rejects a theme with %s comment sources', async (mode) => {
    state.body = { data: [{ id: 'c1', text: 'Where is this?' }, { id: 'c2', text: 'What is the location?' }] };
    state.invalidSources = mode === 'invalid'; state.repeatedId = mode === 'duplicate';
    const audience = await buildAudience(await collectAudienceInputs(doc));
    expect(audience.findings.some((f) => f.section === 'questions')).toBe(false);
    expect(audience.findings.find((f) => f.id === 'audience_sample')?.label).toBe('observed_in_comments');
  });
  it.each(['instagram', 'facebook'] as const)('still reads %s comments when reply expansion is unsupported', async (platform) => {
    doc.platform = platform; state.expandedFails = true;
    state.body = { data: [{ id: 'c1', text: 'Can you explain the steps?', message: 'Can you explain the steps?' }] };
    const inputs = await collectAudienceInputs(doc);
    expect(inputs.comments).toHaveLength(1); expect(state.calls).toHaveLength(2);
    expect(state.calls[1].headers.Authorization).toBe(state.calls[0].headers.Authorization);
    expect(new URL(state.calls[1].url).searchParams.get('fields')).not.toContain('.limit');
    expect(inputs.limitations.join(' ')).toContain('Replies were unavailable');
  });
  it.each(['valid', 'forged', 'missing'])('requires an exact explicit comment quote for save/share motivations: %s', async (mode) => {
    state.motivation = mode;
    state.body = { data: [{ id: 'c1', text: 'I saved this guide to use later.' }] };
    const audience = await buildAudience(await collectAudienceInputs(doc));
    const finding = audience.findings.find((f) => f.section === 'motivations');
    expect(Boolean(finding)).toBe(mode === 'valid');
    if (finding) expect(finding.evidence[0].quote).toBe('I saved this guide to use later.');
  });
  it('never generates motivation claims from counts alone', async () => {
    const audience = await buildAudience(await collectAudienceInputs(doc));
    expect(state.modelCalls).toBe(0);
    expect(audience.findings.some((f) => f.section === 'motivations')).toBe(false);
  });
});
