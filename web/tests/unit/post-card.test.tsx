import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PostCard } from '@/components/posts/post-card';
import type { MediaItem } from '@/types/api';

const item = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'ig_1', platform: 'instagram', platformContentId: '1', contentType: 'reel', title: 'Morning routine', caption: '', thumbnailUrl: '', publishedAt: '2026-10-01T10:00:00Z',
  views: 12800, reach: 9000, likes: 640, comments: 32, shares: 3, engagementRate: 5.25, unavailableMetrics: [], contentTypeBasis: 'provider', ...over,
});

describe('PostCard', () => {
  it('shows the numbers it has, with a plain tag', () => {
    render(<PostCard item={item()} tag="doing-well" onOpen={() => undefined} />);
    expect(screen.getByText('12.8K')).toBeInTheDocument();
    expect(screen.getByText('Doing well')).toBeInTheDocument();
    expect(screen.getByText('Reel')).toBeInTheDocument();
  });
  it('never shows 0 for a number the platform did not give us', () => {
    render(<PostCard item={item({ likes: 0, missingMetrics: ['likes'] })} tag="typical" onOpen={() => undefined} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByLabelText(/likes: not available from Instagram/i)).toBeInTheDocument();
  });
  it('uses a neutral tile, not an image, when there is no thumbnail', () => {
    const { container } = render(<PostCard item={item()} tag="typical" onOpen={() => undefined} />);
    expect(container.querySelector('img')).toBeNull();
  });
  it('says an estimated format is estimated', () => {
    render(<PostCard item={item({ platform: 'youtube', contentType: 'short', contentTypeBasis: 'inferred' })} tag="typical" onOpen={() => undefined} />);
    expect(screen.getByText('Short (estimated)')).toBeInTheDocument();
  });
});
