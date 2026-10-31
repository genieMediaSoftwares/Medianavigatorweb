// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentDiagnosis } from '@/components/posts/content-diagnosis';
import type { DiagnosisInsight, DiagnosisResponse } from '@/types/api';

const api = vi.hoisted(() => ({ diagnosis: vi.fn() }));
vi.mock('@/lib/api/endpoints', () => ({ api: { diagnosis: api.diagnosis } }));

const insight = (key: DiagnosisInsight['key'], extra: Partial<DiagnosisInsight> = {}): DiagnosisInsight => ({
  key, title: `${key} insight`, signal: 'mixed', observation: 'observed', evidence: 'evidence', whyItMatters: 'matters', metric: '1,000 views vs 800 median', confidence: 'medium', ...extra,
});

function response(over: Partial<DiagnosisResponse> = {}): DiagnosisResponse {
  return {
    mediaId: 'ig_1', analysisVersion: 'diagnosis-v1', classification: 'TOP',
    baseline: { sampleSize: 40, medianEngagementRate: 4, p25EngagementRate: 2, p75EngagementRate: 6, medianViews: 800, rows: [{ key: 'views', label: 'Views', post: 1000, median: 800, differencePct: 25 }], method: 'User-relative baseline.' },
    result: {
      summary: 'The opening question pulled people in.',
      threeLine: { whatWorked: 'A relatable question.', performanceProof: '12% engagement vs a 4% median.', strategicTakeaway: 'Questions work here.' },
      insights: (['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals'] as const).map((k) => insight(k)),
      preserve: ['The opening question'], limitations: [], confidence: { level: 'high', reason: 'media and metrics' },
    },
    mediaBasis: 'full_video', model: 'test', analyzedAt: '2026-10-01T00:00:00.000Z', fromCache: false, stale: false,
    ...over,
  };
}

function renderDiagnosis(data: DiagnosisResponse) {
  api.diagnosis.mockResolvedValue(data);
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ContentDiagnosis mediaId="ig_1" title="Morning routine" platform="instagram" contentType="reel" /></QueryClientProvider>);
}

describe('ContentDiagnosis', () => {
  it('gives a top performer insights first, with a three-line summary and no recovery plan', async () => {
    renderDiagnosis(response());
    await waitFor(() => expect(screen.getByText('Top performer')).toBeInTheDocument());
    expect(screen.getByText('What worked')).toBeInTheDocument();
    expect(screen.getByText('Performance proof')).toBeInTheDocument();
    expect(screen.getByText('Strategic takeaway')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deep analysis/ })).toBeInTheDocument();
    expect(screen.queryByText('What to do next')).not.toBeInTheDocument();
    expect(screen.queryByText('Three alternative concepts')).not.toBeInTheDocument();
  });

  it('offers six insight buttons and reveals the selected one beside them', async () => {
    renderDiagnosis(response());
    await waitFor(() => expect(screen.getByText('Six insights')).toBeInTheDocument());
    const buttons = ['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals']
      .map((k) => screen.getByRole('button', { name: new RegExp(`${k} insight`, 'i') }));
    expect(buttons).toHaveLength(6);
    // Exactly one is the selected one, and its detail is shown in place, not in a new screen.
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(screen.getByText('What we observed')).toBeInTheDocument();
    expect(screen.getByText('Why it matters')).toBeInTheDocument();
  });

  it('pairs every colour with a label, so meaning never depends on colour alone', async () => {
    const mixed = response();
    mixed.result.insights = mixed.result.insights!.map((i, n) => ({ ...i, signal: n === 0 ? 'positive' : 'mixed' }));
    renderDiagnosis(mixed);
    await waitFor(() => expect(screen.getByText('Six insights')).toBeInTheDocument());
    expect(screen.getAllByText('Mixed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
  });

  it('gives a bottom performer a recovery plan first, with three alternatives and diagnostics', async () => {
    renderDiagnosis(response({
      classification: 'BOTTOM',
      result: {
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
      },
    }));
    await waitFor(() => expect(screen.getByText('Bottom performer')).toBeInTheDocument());
    expect(screen.getByText('What to do next')).toBeInTheDocument();
    expect(screen.getByText('The first second is a logo.')).toBeInTheDocument();
    expect(screen.getByText('Three alternative concepts')).toBeInTheDocument();
    expect(screen.getByText('Why it may have underperformed')).toBeInTheDocument();
    expect(screen.getByText('Result first')).toBeInTheDocument();
    expect(screen.getByText('Face first')).toBeInTheDocument();
    expect(screen.getByText('Number first')).toBeInTheDocument();
    // A top performer never sees the recovery plan.
    expect(screen.queryByText('Six insights')).not.toBeInTheDocument();
  });

  it('gives an average performer what works, the opportunity and one test', async () => {
    renderDiagnosis(response({
      classification: 'AVERAGE',
      result: {
        summary: 'A steady post.', whatWorks: 'The caption names the offer.', mainOpportunity: 'The first frame is a wide shot.', nextExperiment: 'Move the headline into the first frame.',
        insights: (['hook', 'relevance', 'visual', 'storytelling', 'engagement', 'signals'] as const).map((k) => insight(k)),
        limitations: [], confidence: { level: 'medium', reason: 'media and metrics' },
      },
    }));
    await waitFor(() => expect(screen.getByText('Average performer')).toBeInTheDocument());
    expect(screen.getByText("What's working")).toBeInTheDocument();
    expect(screen.getByText('Main opportunity')).toBeInTheDocument();
    expect(screen.getByText('Next experiment')).toBeInTheDocument();
    expect(screen.queryByText('What to do next')).not.toBeInTheDocument();
  });

  it('says there is not enough data instead of misclassifying', async () => {
    renderDiagnosis(response({
      classification: 'INSUFFICIENT_DATA',
      result: {
        summary: 'Too little history to compare.', whatWorks: 'The cover is clear.', mainOpportunity: 'Publish a few more posts.', nextExperiment: 'Test one more opening style.',
        limitations: [], confidence: { level: 'low', reason: 'Not enough history to compare' },
      },
    }));
    await waitFor(() => expect(screen.getByText('Not enough data yet')).toBeInTheDocument());
    expect(screen.getByText('Not enough data to compare')).toBeInTheDocument();
  });
});
