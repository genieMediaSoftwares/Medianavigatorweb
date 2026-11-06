import { describe, expect, it } from 'vitest';
import { audienceDate, audienceSummary } from '@/features/analysis/audienceSummary';
import type { AudienceFinding, DeepAnalysisV2, DeepSource } from '../../shared/deepAnalysisV2';

const metric = (id: string, value: number): DeepSource => ({ id: `metric_${id}`, source: 'metric', claimType: 'measured', description: `${id}: ${value}. Platform sync: 2026-11-06T05:29:08.729Z.`, quote: null, confidence: 'high', assetId: null, startSeconds: null, endSeconds: null, slideNumber: null, pageNumber: null });
const report = (...metrics: DeepSource[]): DeepAnalysisV2['audience'] => ({ availability: 'available', sampledComments: 0, collectedAt: '2026-11-06T06:00:00Z', limitations: [], findings: [{ id: 'signals', section: 'signals', label: 'measured', title: 'Signals', text: '', evidence: metrics, confidence: 'high' }] });
describe('Audience report presentation', () => {
  it('shows the screenshot case as measured activity and zero comments, not four empty themes', () => {
    const result = audienceSummary(report(metric('likes', 12), metric('comments', 0)));
    expect(result.metrics.map((m) => m.value)).toEqual([12, 0]);
    expect(result.summary).toContain('last post sync recorded 0 comments');
    expect(result.findings).toEqual([]);
    expect(result.actionTitle).toBe('Invite a specific response');
    expect(result.metrics.some((m) => m.id === 'metric_saves')).toBe(false);
  });
  it('prioritizes a restricted request over an old zero comment count', () => {
    const audience = report(metric('comments', 0));
    audience.limitations = ['Comments are unavailable or restricted for this token.'];
    const result = audienceSummary(audience);
    expect(result.headline).toBe('Comment access needs attention');
    expect(result.summary).not.toContain('recorded 0');
    expect(result.action).toContain('Connections');
  });
  it('does not describe inaccessible or missing comments as no audience response', () => {
    const result = audienceSummary(report(metric('comments', 9)));
    expect(result.summary).toContain('No comment text was returned');
    expect(result.summary).not.toContain('0 comments');
    expect(audienceSummary(report()).metrics).toEqual([]);
    expect(audienceSummary(report()).headline).toBe('Audience feedback is not available yet');
  });
  it('retains unrecognized evidence without manufacturing metric values', () => {
    const invalid = { ...metric('likes', 12), description: 'Likes unavailable' };
    const result = audienceSummary(report(invalid));
    expect(result.metrics).toEqual([]);
    expect(result.unparsedSignals).toEqual([invalid]);
    expect(audienceDate('invalid')).toBeNull();
  });
  it('shows supported questions and recommends checking whether they were already answered', () => {
    const audience = report();
    audience.sampledComments = 2;
    const finding: AudienceFinding = { id: 'questions', section: 'questions', title: 'Price questions', text: 'Two comments ask about price.', label: 'ai_interpretation', confidence: 'medium', evidence: [{ ...metric('likes', 0), id: 'comment_1', source: 'comment', claimType: 'observed', quote: 'What is the price?' }] };
    audience.findings.push(finding);
    const result = audienceSummary(audience);
    expect(result.findings).toEqual([finding]);
    expect(result.actionTitle).toBe('Start with the questions below');
    expect(result.action).toContain('still unanswered');
    expect(result.summary).toContain('not everyone');
  });
  it('does not promote metric-only evidence into a comment theme', () => {
    const audience = report(metric('likes', 12));
    audience.findings.push({ ...audience.findings[0], id: 'bad-theme', section: 'response' });
    expect(audienceSummary(audience).findings).toEqual([]);
  });
});
