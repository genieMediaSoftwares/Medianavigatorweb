import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstagramClient } from '../src/integrations/meta/instagram/instagramClient.js';
import { instagramAdapter } from '../src/integrations/adapters/instagram.adapter.js';

afterEach(() => vi.unstubAllGlobals());

const post = (id: string) => ({ id, media_type: 'IMAGE', media_product_type: 'FEED', timestamp: '2026-10-01T10:00:00+0000', like_count: 3, comments_count: 1 });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
/** Graph API double: media pages by `page` query value; insights and account insights answer with no data. */
function graph(pages: Record<string, () => Response>, extra: (url: URL) => Response | null = () => null) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = new URL(input);
    calls.push(url.pathname + (url.searchParams.get('page') ? `?page=${url.searchParams.get('page')}` : ''));
    const other = extra(url);
    if (other) return other;
    if (url.pathname.endsWith('/insights')) return json({ data: [] });
    if (url.pathname.endsWith('/media')) return pages[url.searchParams.get('page') ?? '1']();
    return json({ error: { code: 100, message: 'unexpected call' } }, 400);
  }));
  return calls;
}
const next = (page: string) => ({ next: `https://graph.facebook.com/v21.0/123/media?page=${page}&limit=100` });

describe('Instagram media listing completeness (Facebook Login tokens)', () => {
  it('follows every page to the last one and reports the listing as complete', async () => {
    graph({ 1: () => json({ data: [post('a'), post('b')], paging: next('2') }), 2: () => json({ data: [post('c')], paging: next('3') }), 3: () => json({ data: [post('d')] }) });
    const listing = { complete: false };
    const items = await new InstagramClient().fetchMedia('user-token', '123', { id: '123', username: 'u', pageAccessToken: 'page-token' }, undefined, listing);
    expect(items.map((i) => i.platformContentId)).toEqual(['a', 'b', 'c', 'd']);
    expect(listing.complete).toBe(true);
  });

  it('keeps the posts already read but does not report success when a later page keeps failing', async () => {
    graph({ 1: () => json({ data: [post('a'), post('b')], paging: next('2') }), 2: () => json({ error: { code: 2, message: 'temporary' } }, 500) });
    const listing = { complete: true };
    const items = await new InstagramClient().fetchMedia('user-token', '123', { id: '123', username: 'u', pageAccessToken: 'page-token' }, undefined, listing);
    expect(items.map((i) => i.platformContentId)).toEqual(['a', 'b']);
    expect(listing.complete).toBe(false);
  }, 30_000);

  it('stops on a repeated cursor instead of looping, and reports the listing as incomplete', async () => {
    const calls = graph({ 1: () => json({ data: [post('a')], paging: next('2') }), 2: () => json({ data: [post('b')], paging: next('2') }) });
    const listing = { complete: true };
    const items = await new InstagramClient().fetchMedia('user-token', '123', { id: '123', username: 'u', pageAccessToken: 'page-token' }, undefined, listing);
    expect(items).toHaveLength(2);
    expect(listing.complete).toBe(false);
    expect(calls.filter((c) => c.endsWith('/media?page=2'))).toHaveLength(1);
  });

  it('treats an account with no posts as a complete, empty listing', async () => {
    graph({ 1: () => json({ data: [] }) });
    const listing = { complete: false };
    expect(await new InstagramClient().fetchMedia('user-token', '123', { id: '123', username: 'u', pageAccessToken: 'page-token' }, undefined, listing)).toEqual([]);
    expect(listing.complete).toBe(true);
  });
});

describe('Instagram Login media listing', () => {
  it('throws on a repeated cursor rather than importing the same page forever', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      return json({ data: [post(url.searchParams.get('after') ?? 'first')], paging: { next: 'https://graph.instagram.com/next', cursors: { after: 'same' } } });
    }));
    await expect(new InstagramClient(true).fetchMedia('token', '123')).rejects.toThrow('same page twice');
  });
});

describe('Instagram adapter: profile totals vs API-accessible posts', () => {
  const me = (url: URL) => url.pathname.endsWith('/me')
    ? json({ user_id: '123', username: 'resort', media_count: 435, followers_count: 5038, follows_count: 221 })
    : url.pathname.endsWith('/123/insights') && url.searchParams.has('metric_type') ? json({ data: [] }) : null;
  const creds = { instagramLogin: true, accessToken: 'token', accountId: '123', expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString() };
  const account = { providerAccountId: '123', handle: '@resort', accountInfo: { id: '123', mediaCount: 435 } };

  it('records the verified accessible count and profile numbers, and does not call a complete listing partial', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      return me(url) ?? (url.pathname.endsWith('/insights') ? json({ data: [] }) : json({ data: [post('a'), post('b')] }));
    }));
    const result = await instagramAdapter.fetchContent(creds, account, { existing: new Map() });
    expect(result.items).toHaveLength(2);
    expect(result.partialReason).toBeUndefined();
    expect(result.accountInfo).toMatchObject({ mediaCount: 435, followersCount: 5038, followsCount: 221, accessibleMediaCount: 2, mediaListComplete: true });
  });

  it('marks the run partial and leaves the accessible count unknown when the listing could not be finished', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/me') && url.hostname === 'graph.facebook.com') {
        return json({ id: 'page', name: 'Page', access_token: 'page-token', instagram_business_account: { id: '123', username: 'resort', media_count: 435 } });
      }
      if (url.pathname.endsWith('/insights')) return json({ data: [] });
      if (url.pathname.endsWith('/media')) return url.searchParams.get('page') === '2' ? json({ error: { code: 2 } }, 500) : json({ data: [post('a')], paging: next('2') });
      return json({ error: { code: 100 } }, 400);
    }));
    const result = await instagramAdapter.fetchContent({ accessToken: 'EAAuser', accountId: '123' }, account, { existing: new Map() });
    expect(result.items).toHaveLength(1);
    expect(result.partialReason).toMatch(/stopped returning posts after 1/);
    expect(result.accountInfo).toMatchObject({ mediaListComplete: false, accessibleMediaCount: null });
  }, 30_000);
});
