// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentReview } from '@/components/insights/content-review';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ apiSend: (...args: unknown[]) => apiSend(...args) }));
vi.mock('@/lib/hooks/useQueries', () => ({ useMe: () => ({ data: { user: { freeTopChecksRemaining: 1, freeBottomChecksRemaining: 1 } } }) }));

const scripts = ['Script 1 (Emotional Fan Connection): open on the handshake.', 'Script 2 (High-Pacing Energy Cut): three jump cuts.', 'Script 3 (Narrative Hook): backstage close-up.'];

/** A result saved by an older deployment, with some fields missing. */
const savedResult = {
  model: 'gemini', fromCache: true, stale: false,
  result: {
    summary: 'The opening question pulled people in.',
    points: [{ number: 1, title: 'Hook Strength', observations: ['A relatable question in the first two seconds.'], evidence: [], metricKeys: [], interpretation: 'Curiosity', confidence: 'high', signal: 'positive' }],
    // No limitations, no recommendations, no evidence block: an older saved result.
  },
};

function renderReview(result: unknown) {
  apiSend.mockResolvedValue(result);
  const view = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ContentReview mediaId="ig_1" isVideo type="deep" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Start analysis/i }));
  return view;
}

describe('ContentReview', () => {
  it('shows the scripts once, not twice', async () => {
    renderReview({ ...savedResult, result: { ...savedResult.result, recommendations: scripts } });
    await waitFor(() => expect(screen.getByText('What to test next')).toBeInTheDocument());
    expect(screen.getAllByText('What to test next')).toHaveLength(1);
    expect(screen.queryByText('Make it better')).not.toBeInTheDocument();
    expect(screen.queryByText('3 scripts to test')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Script 1 \(Emotional Fan Connection\)/)).toHaveLength(1);
  });

  it('renders a result saved by an older version without crashing', async () => {
    renderReview(savedResult);
    await waitFor(() => expect(screen.getByText('The opening question pulled people in.')).toBeInTheDocument());
    expect(screen.getByText('Hook Strength:')).toBeInTheDocument();
  });
});
