import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiStatusNote } from '@/components/ui/Layers';
import { ChangeLine } from '@/components/ui/Stat';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PostCard } from '@/components/posts/PostCard';
import { ApiError } from '@/lib/api/client';
import type { AiMeta, Media } from '@/types/api';

const ai = (status: AiMeta['status']): AiMeta => ({ status, model: status === 'ran' ? 'model-x' : null, promptVersion: 'v1', generatedAt: null });

describe('AiStatusNote', () => {
  it.each(['unavailable', 'failed'] as const)('never implies AI ran when status is %s', (status) => {
    render(<AiStatusNote ai={ai(status)} />);
    expect(screen.getByRole('note')).toHaveTextContent("AI explanation isn't available right now");
    expect(screen.queryByText(/Explained by AI/)).not.toBeInTheDocument();
  });
  it('labels real AI output', () => {
    render(<AiStatusNote ai={ai('cached')} />);
    expect(screen.getByText(/Explained by AI/)).toBeInTheDocument();
  });
});

describe('ChangeLine', () => {
  it('says there is nothing to compare instead of showing 0', () => {
    render(<ChangeLine change={null} label="from the period before" />);
    expect(screen.getByText('Not enough earlier posts to compare yet')).toBeInTheDocument();
  });
});

describe('PostCard', () => {
  const media: Media = {
    id: 'm1', platform: 'youtube', contentType: 'short', title: 'My short', caption: '', thumbnailUrl: '', mediaUrl: null, publishedAt: '2026-05-01T10:00:00Z',
    durationSeconds: 30, views: 1200, reach: 0, engagementRate: 4.2, shares: 0, watchTimeMinutes: null, likes: 80, comments: 0,
    unavailableMetrics: ['comments', 'reach'], contentTypeBasis: 'inferred',
  };
  it('shows "Not available" for metrics the platform does not provide, never 0', () => {
    render(<PostCard media={media} classification="INSUFFICIENT_DATA" onOpen={() => undefined} />);
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText('Short (estimated)')).toBeInTheDocument();
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });
  it('opens the detail drawer', async () => {
    const onOpen = vi.fn();
    render(<PostCard media={media} classification="TOP" onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /open details for my short/i }));
    expect(onOpen).toHaveBeenCalledWith('m1');
  });
});

describe('states', () => {
  it('empty state always offers the next step', () => {
    render(<EmptyState title="No posts yet" action={<a href="/connections">Connect a channel</a>} />);
    expect(screen.getByRole('link', { name: 'Connect a channel' })).toBeInTheDocument();
  });
  it('error state shows the API message, a Retry button and the request id', async () => {
    const retry = vi.fn();
    render(<ErrorState error={new ApiError(500, 'INTERNAL_ERROR', 'Database unavailable', 'req-42')} onRetry={retry} />);
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
});
