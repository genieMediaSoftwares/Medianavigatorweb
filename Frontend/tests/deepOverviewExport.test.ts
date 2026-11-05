import { describe, expect, it } from 'vitest';
import { deepReportText } from '../../shared/deepAnalysisExport';
import type { DeepAnalysisV2 } from '../../shared/deepAnalysisV2';
const report = { platform: 'instagram', postId: 'owned_post', post: { title: 'An event offer', caption: 'An original caption', publishedAt: '2026-11-04T00:00:00.000Z' }, generatedAt: '2026-11-05T00:00:00.000Z', analysisStatus: 'partial', goal: 'Review the post', coverage: { analyzedAssets: 1, accessibleAssets: 1, method: 'Sampled original video', limitations: ['Video frames are sampled.'] }, overview: { summary: 'A specific introduction.', keyTakeaway: 'A balanced conclusion.', editorial: { headline: 'An offer made clear', introduction: 'A specific introduction.', verdict: 'A balanced conclusion.', evidenceIds: ['source_1'], facts: [{ label: 'Offer', value: '100 guests', quote: '100 guests', evidenceId: 'source_1' }], sections: [{ key: 'caption', title: 'A readable caption', assessment: 'The caption states the guest count directly.', status: 'good', evidenceIds: ['source_1'] }], metrics: { syncedAt: '2026-11-05T00:00:00.000Z', items: [{ key: 'likes', label: 'Likes', value: 0, unit: 'count', basis: 'measured' }] } }, priorityFindings: [] }, audience: { findings: [], limitations: [] }, nextMove: { actions: [{ title: 'Clarify the package scope', why: 'The inclusions are not specified.', what: 'List the confirmed inclusions.', example: null }] } } as unknown as DeepAnalysisV2;
describe('editorial report export', () => {
  it('includes the structured assessment and facts without duplicating the introduction', () => {
    const text = deepReportText(report);
    expect(text.split('A specific introduction.')).toHaveLength(2);
    expect(text).toContain('Offer: 100 guests');
    expect(text).toContain('The caption states the guest count directly.');
    expect(text).toContain('Likes: 0');
  });
  it('places recommendations after the assessment and preserves factual coverage details', () => {
    const text = deepReportText(report);
    expect(text.indexOf('Clarify the package scope')).toBeGreaterThan(text.indexOf('A balanced conclusion.'));
    expect(text).not.toContain('Status: partial');
    expect(text).toContain('Video frames are sampled.');
    expect(text).toContain('Content assessed: 1 of 1 available assets');
  });
});
