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
    data.findings = [
      { ...candidate, likelyImpact: 'This caused higher retention.' },
      { ...candidate, likelyImpact: 'This will increase sales for the venue.' },
      { ...candidate, likelyImpact: 'Guarantees higher conversions.' },
      { ...candidate, recommendedAction: 'Use better hooks.' },
      { ...candidate, recommendedAction: 'Post consistently every day.' },
      { ...candidate, recommendedAction: 'Target the right audience.' },
    ];
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
  it('enforces category uniqueness across priority findings', () => {
    const data = base();
    data.findings = [
      candidate,
      { ...candidate, title: 'Another hook finding', finding: 'Completely different hook observation text.' },
    ];
    const ranked = rankFindings(data, [source], 'text');
    expect(ranked).toHaveLength(1);
    expect(ranked[0].category).toBe('hook_intelligence');
  });
  it('ranks distinct marketing dimensions for an SVN Bay Park style wedding promotion', () => {
    const flyerSource: DeepSource = { id: 'source_img', source: 'image', assetId: 'image_1', startSeconds: null, endSeconds: null, slideNumber: null, pageNumber: null, quote: null, description: 'Graphic flyer layout with special wedding package badge and phone number', confidence: 'high', claimType: 'observed' };
    const captionSource: DeepSource = { id: 'source_cap', source: 'caption', assetId: null, startSeconds: null, endSeconds: null, slideNumber: null, pageNumber: null, quote: 'Call 9876543210 for wedding bookings at SVN Bay Park', description: 'Caption lists contact number and venue name', confidence: 'high', claimType: 'observed' };
    const allSources = [flyerSource, captionSource];

    const data: Candidates = {
      summary: 'Wedding promotion relying on a digital flyer rather than real venue photography.',
      strongestQuality: 'Clear promotional headline and direct contact number.',
      mainOpportunity: 'Replace graphic flyers with authentic decorated banquet hall photos.',
      keyTakeaway: 'While the contact number and wedding package are prominently featured, showing authentic photography of the decorated venue and transparent pricing tiers may significantly improve prospective couple trust.',
      findings: [
        {
          category: 'visual_quality',
          title: 'Promotional flyer design used in place of authentic venue photography',
          status: 'needs_attention',
          explanation: 'The creative uses digital graphic banners rather than real venue photos.',
          finding: 'The image relies on graphic vector elements and text badges instead of authentic photography of the SVN Bay Park banquet hall or lawn.',
          evidenceIds: ['source_img'],
          likelyImpact: 'Couples evaluating luxury wedding venues seek visual confirmation of hall decor and ambiance; digital posters may feel impersonal.',
          recommendedAction: 'Feature high-resolution photography of an actual decorated wedding banquet setup.',
          confidence: 'high',
          importance: 'high',
        },
        {
          category: 'cta_and_conversion',
          title: 'Direct phone number CTA creates manual dial friction',
          status: 'good',
          explanation: 'Users must manually dial the phone number.',
          finding: 'The primary call-to-action is a raw phone number in the caption without a direct WhatsApp or booking form link.',
          evidenceIds: ['source_cap'],
          likelyImpact: 'Mobile Instagram users may hesitate to copy and dial a phone number, whereas a direct chat link could streamline inquiries.',
          recommendedAction: 'Add a tap-to-chat WhatsApp link or dedicated booking page URL in the bio.',
          confidence: 'high',
          importance: 'high',
        },
        {
          category: 'hook_intelligence',
          title: 'Opening caption states package offer clearly',
          status: 'strong',
          explanation: 'Clear introductory value proposition.',
          finding: 'The first line of the caption introduces the wedding package directly for Vizag couples.',
          evidenceIds: ['source_cap'],
          likelyImpact: 'This immediately establishes relevance for families planning weddings in the local area.',
          recommendedAction: 'Maintain the clear geographic and seasonal focus in future event announcements.',
          confidence: 'high',
          importance: 'medium',
        },
      ],
      actions: [
        { kind: 'repeat', title: 'Highlight the venue location in opening text', why: 'Local relevance helps prospective couples identify the property immediately.', what: 'Continue mentioning Vizag beachside location in the opening sentence of wedding announcements.', example: null, evidenceIds: ['source_cap'] },
        { kind: 'change', title: 'Switch from graphic flyers to authentic banquet decor photography', why: 'Wedding prospects prioritize authentic visual proof of venue ambiance.', what: 'Capture golden-hour photo galleries of decorated mandap and seating arrangements.', example: null, evidenceIds: ['source_img'] },
        { kind: 'idea', title: 'Produce a 15-second wedding walkthrough Reel', why: 'Video captures spatial layout and scale better than static flyers.', what: 'Record a walkthrough from the grand banquet hall entrance through the dining lawn.', example: 'Show guest reception area, stage lighting, and oceanfront breeze.', evidenceIds: ['source_img'] },
      ],
    };

    const ranked = rankFindings(data, allSources, 'image');
    expect(ranked).toHaveLength(3);
    const categories = ranked.map((r) => r.category);
    expect(new Set(categories).size).toBe(3);
    expect(categories).toContain('visual_quality');
    expect(categories).toContain('cta_and_conversion');
    expect(categories).toContain('hook_intelligence');

    const actions = validateActions(data, allSources);
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.kind)).toEqual(['repeat', 'change', 'idea']);
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
