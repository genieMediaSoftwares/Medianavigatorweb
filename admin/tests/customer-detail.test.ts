import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, infinite } = vi.hoisted(() => ({ query: vi.fn(), infinite: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQuery: query, useInfiniteQuery: infinite }));
vi.mock('@/components/admin/step-up', () => ({ useStepUp: () => (action: () => Promise<unknown>) => action() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
import { UserDetail } from '@/components/admin/user-detail';

beforeEach(() => { query.mockReset(); infinite.mockReset(); infinite.mockReturnValue({ data: { pages: [{ items: [] }] }, hasNextPage: false }); });
describe('customer detail states', () => {
  it('announces loading and provides a return route', () => {
    query.mockReturnValue({ isPending: true });
    const html = renderToStaticMarkup(createElement(UserDetail, { id: 'customer' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading customer');
    expect(html).toContain('/admin?tab=users');
  });
  it('renders a retryable API failure', () => {
    query.mockReturnValue({ isError: true, error: new Error('User not found'), refetch: vi.fn() });
    const html = renderToStaticMarkup(createElement(UserDetail, { id: 'customer' }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('User not found');
    expect(html).toContain('Try again');
  });
  it('renders actual profile data, credits and the empty connection state', () => {
    query.mockReturnValue({ isSuccess: true, data: { user: { email: 'real@test.example', role: 'user', status: 'active', createdAt: '2026-10-01T00:00:00Z', lastLoginAt: null, credits: 17 }, profile: { fullName: 'Customer Name', organization: 'Acme', timezone: 'Asia/Kolkata' }, activeSessions: 2, lockedUntil: null, failedLoginCount: 0, connections: [] } });
    const html = renderToStaticMarkup(createElement(UserDetail, { id: 'customer' }));
    for (const value of ['real@test.example', 'Customer Name', 'Acme', 'Asia/Kolkata', '17', 'No social connections']) expect(html).toContain(value);
  });
  it('shows recorded coverage, an honest unavailable count and, with credits.view, the credit history', () => {
    const connection = { id: 'c1', userId: 'u1', platform: 'instagram', handle: '@resort', status: 'sync_complete', active: true, lastSyncedAt: '2026-10-21T06:00:00Z', nextSyncAt: null, lastSyncError: null, dataPointsCount: 424, createdAt: '2026-10-01T00:00:00Z', authMethod: 'token', credentialsExpiresAt: null, missingPermissions: [], statusMessage: null, coverage: { profileCount: 435, accessibleCount: 424, syncedCount: 424, listingComplete: true, checkedAt: '2026-10-21T06:00:00Z', followersCount: 5038, followsCount: 221 }, lastRun: { status: 'succeeded', type: 'manual', queuedAt: '2026-10-21T06:00:00Z', completedAt: '2026-10-21T06:00:12Z', errorKind: null } };
    query.mockImplementation(({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'me' ? { data: { user: { permissions: ['credits.view'] } } } : { isSuccess: true, data: { user: { email: 'real@test.example', role: 'user', status: 'active', createdAt: '2026-10-01T00:00:00Z', lastLoginAt: null, credits: 17 }, profile: null, activeSessions: 1, lockedUntil: null, failedLoginCount: 0, connections: [connection] } });
    const html = renderToStaticMarkup(createElement(UserDetail, { id: 'customer' }));
    for (const value of ['424 synced', '424 returned by API', '435 on profile', '11 not available through the API', '5,038 followers', '221 following', 'Credit adjustments', 'No credit adjustments recorded']) expect(html).toContain(value);
    expect(html).not.toMatch(/can be fetched|sync now to fetch/i);
  });
  it('hides the credit history without credits.view', () => {
    query.mockImplementation(({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'me' ? { data: { user: { permissions: ['users.view'] } } } : { isSuccess: true, data: { user: { email: 'a@test.example', role: 'user', status: 'active', createdAt: '2026-10-01T00:00:00Z', lastLoginAt: null, credits: 1 }, profile: null, activeSessions: 0, lockedUntil: null, failedLoginCount: 0, connections: [] } });
    expect(renderToStaticMarkup(createElement(UserDetail, { id: 'customer' }))).not.toContain('Credit adjustments');
  });
});
