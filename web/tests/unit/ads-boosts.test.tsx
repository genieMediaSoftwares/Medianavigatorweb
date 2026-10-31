// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdsBoosts } from '@/components/posts/ads-boosts';
import { apiGet } from '@/lib/api/client';
vi.mock('@/lib/api/client', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api/client')>(), apiGet: vi.fn() }));
vi.mock('@/lib/hooks/useSync', () => ({ useSync: () => ({ start: vi.fn(), active: [] }) }));
function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdsBoosts /></QueryClientProvider>); }
describe('Ads / Boosts', () => {
  it('asks new accounts to connect without fake metrics', async () => {
    vi.mocked(apiGet).mockResolvedValue({ connected: false, sync: null, items: [], nextCursor: null });
    show();
    expect(await screen.findByText('Connect Instagram to see ads and boosts')).toBeInTheDocument();
    expect(screen.queryByText('Spend')).not.toBeInTheDocument();
  });
  it('shows missing permission guidance instead of a misleading empty result', async () => {
    vi.mocked(apiGet).mockResolvedValue({ connected: true, sync: { status: 'permission_required', message: 'ads_read is needed', checkedAt: '2026-10-22T10:00:00Z' }, items: [], nextCursor: null });
    show();
    expect(await screen.findByText('Advertising access is needed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Update connection' })).toHaveAttribute('href', '/connections');
  });
  it('preserves unavailable values and displays actual zero without changing currency', async () => {
    vi.mocked(apiGet).mockResolvedValue({ connected: true, sync: null, items: [{ id: '1', adAccountId: 'act_1', name: 'Real ad', category: 'boosted_post', campaign: '', adSet: '', status: 'PAUSED', impressions: null, reach: null, clicks: 0, spend: 12.5, currency: 'INR', syncedAt: '2026-10-22T10:00:00Z' }], nextCursor: null });
    show();
    expect(await screen.findByText('Real ad')).toBeInTheDocument();
    expect(screen.getAllByText('Not available')).toHaveLength(2);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('INR 12.50')).toBeInTheDocument();
  });
});
