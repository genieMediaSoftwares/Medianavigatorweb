import { describe, expect, it } from 'vitest';
import type { DeepAnalysisState, DeepSource } from '../../shared/deepAnalysisV2.js';
import { deepUiReducer, initialDeepUi, DEEP_TABS } from '../../shared/deepAnalysisUi.js';
import { candidateSchema, rankFindings, validateActions, type Candidates } from '../src/services/ai/deepV2.validation.js';
import { videoWindows } from '../src/services/ai/deepV2.pipeline.js';
import { AUDIENCE_SECTIONS, audienceSectionFindings } from '../../shared/audienceSections.js';
const source: DeepSource = { id: 'source_1', source: 'caption', assetId: null, startSeconds: null, endSeconds: null, slideNumber: null, pageNumber: null, quote: 'A practical question comes first.', description: 'The text opens with a practical question.', confidence: 'high', claimType: 'observed' };
const candidate: Candidates['findings'][number] = { category: 'hook_intelligence', title: 'A practical question starts the post', status: 'strong', explanation: 'The opening sets a specific problem.', finding: 'The opening question identifies a practical problem before the explanation.', evidenceIds: ['source_1'], likelyImpact: 'This may clarify why the text is useful.', recommendedAction: 'Start the next written post with one practical question about this topic.', confidence: 'high', importance: 'high' };
const base = (): Candidates => ({ summary: 'A clear question introduces the topic.', strongestQuality: null, mainOpportunity: null, keyTakeaway: 'Keep one practical question at the opening of the next written post.', findings: [candidate], actions: [{ kind: 'idea', title: 'Explain the practical answer', why: 'The opening question identifies an unresolved problem.', what: 'Write a follow-up answering the practical question in three concrete steps.', example: null, evidenceIds: ['source_1'] }] });
describe('Deep V2 validation and priority selection', () => {
  it('does not force twelve cards, scores or unsupported categories', () => {
    const data = base();
    data.findings.push({ ...candidate, category: 'competitor_and_trend_context' }, { ...candidate, category: 'performance_diagnosis' }, { ...candidate, confidence: 'low' });
    expect(rankFindings(data, [source], 'text')).toHaveLength(1);
    expect(rankFindings(data, [], 'text')).toHaveLength(0);
  });
  it('merges overlapping findings and omits claims with no matching source', () => {
    const data = base(); data.findings.push({ ...candidate, category: 'storytelling_and_pacing' }, { ...candidate, evidenceIds: ['made_up'] });
    expect(rankFindings(data, [source], 'text')).toHaveLength(1);
  });
  it('does not apply visual or audio claims to text or caption-only evidence', () => {
    const data = base(); data.findings = [{ ...candidate, category: 'visual_quality' }, { ...candidate, category: 'audio_and_speech' }];
    expect(rankFindings(data, [source], 'text')).toHaveLength(0);
    expect(rankFindings(data, [source], 'post')).toHaveLength(0);
  });
  it('rejects causal performance claims and generic advice', () => {
    const data = base();
    data.findings = [{ ...candidate, likelyImpact: 'This caused higher retention.' }, { ...candidate, recommendedAction: 'Use better hooks.' }];
    expect(rankFindings(data, [source], 'text')).toHaveLength(0);
  });
  it('limits actions to three supported, distinct, future-focused actions', () => {
    const data = base(); data.actions.push({ ...data.actions[0] }, { ...data.actions[0], kind: 'change', what: 'Repost the existing video.' }, { ...data.actions[0], kind: 'repeat', evidenceIds: ['fake'] });
    expect(validateActions(data, [source])).toHaveLength(1);
  });
  it('validates model enums and bounded report sizes', () => {
    expect(candidateSchema.safeParse({ ...base(), findings: [{ ...candidate, category: 'virality_score' }] }).success).toBe(false);
    expect(candidateSchema.safeParse({ ...base(), actions: Array(4).fill(base().actions[0]) }).success).toBe(false);
  });
  it('covers long and very short durations without unbounded single model requests', () => {
    for (const duration of [1, 30, 120, 7200]) {
      const windows = videoWindows(duration);
      expect(windows[0].start).toBe(0); expect(windows.at(-1)?.end).toBe(duration);
      expect(windows.every((w, i) => i === 0 || w.start === windows[i - 1].end)).toBe(true);
    }
    expect(videoWindows(null)).toEqual([{ start: 0, end: null }]);
  });
});
describe('three-tab app state', () => {
  it('keeps exactly four Audience dropdowns and does not turn counts into motives', () => {
    expect(AUDIENCE_SECTIONS.map((s) => s.title)).toEqual(['What connected with people', 'Questions people asked', 'Why people might save or share', 'Unanswered content demand']);
    expect(audienceSectionFindings([{ id: 'signals', section: 'signals', title: 'Counts', text: 'Shares: 2', label: 'measured', evidence: [source], confidence: 'high' }], 'motivations')).toEqual([]);
    let ui = initialDeepUi('post_a');
    ui = deepUiReducer(ui, { type: 'toggle', id: 'audience_dropdown_questions' });
    ui = deepUiReducer(ui, { type: 'tab', tab: 'Overview' });
    ui = deepUiReducer(ui, { type: 'tab', tab: 'Audience' });
    expect(ui.expanded.audience_dropdown_questions).toBe(true);
  });
  it('has exactly the requested tabs and preserves inline expansion when switching', () => {
    expect(DEEP_TABS).toEqual(['Overview', 'Audience', 'Next Move']);
    let ui = initialDeepUi('post_a');
    expect(ui.expanded).toEqual({});
    ui = deepUiReducer(ui, { type: 'toggle', id: 'finding_1' });
    ui = deepUiReducer(ui, { type: 'tab', tab: 'Audience' });
    ui = deepUiReducer(ui, { type: 'tab', tab: 'Next Move' });
    ui = deepUiReducer(ui, { type: 'tab', tab: 'Overview' });
    expect(ui.expanded.finding_1).toBe(true);
    ui = deepUiReducer(ui, { type: 'toggle', id: 'finding_1' });
    expect(ui.expanded.finding_1).toBe(false);
  });
  it('ignores responses or errors for a different selected post', () => {
    const ui = initialDeepUi('post_a');
    const job: DeepAnalysisState = { postId: 'post_b', jobId: 'job_b', status: 'processing', progress: { stage: 'Processing', processed: 0, total: 2 }, report: null, error: null };
    expect(deepUiReducer(ui, { type: 'received', job })).toBe(ui);
    expect(deepUiReducer(ui, { type: 'failed', postId: 'post_b', message: 'Wrong post' })).toBe(ui);
  });
  it('keeps cancelled and failed states distinct from a complete report', () => {
    let ui = initialDeepUi('post_a');
    ui = deepUiReducer(ui, { type: 'received', job: { postId: 'post_a', jobId: 'job_a', status: 'cancelled', progress: { stage: 'Cancelled', processed: 0, total: 1 }, report: null, error: 'Cancelled' } });
    expect(ui.loading).toBe(false); expect(ui.error).toBe('Cancelled');
    ui = deepUiReducer(ui, { type: 'begin' }); expect(ui.loading).toBe(true);
  });
});
