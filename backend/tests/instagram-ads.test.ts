import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInstagramAds } from '../src/integrations/meta/instagram/instagramAds.js';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ad = (id: string, creative = { instagram_user_id: '123' }) => ({ id, name: `Ad ${id}`, effective_status: 'PAUSED', creative, campaign: { name: 'Campaign' } });
afterEach(() => vi.unstubAllGlobals());
describe('Instagram advertising sync', () => {
  it('paginates accounts, ads and insights; isolates Instagram delivery and the connected profile', async () => {
    const calls: URL[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: URL, init: RequestInit) => {
      const url = new URL(input); calls.push(url);
      expect(url.hostname).toBe('graph.facebook.com');
      expect(url.searchParams.has('access_token')).toBe(false);
      expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
      const more = { next: 'https://untrusted.example/steal', cursors: { after: 'second' } };
      const second = url.searchParams.has('after');
      if (url.pathname.endsWith('/me/adaccounts')) return json({ data: [{ id: second ? 'act_2' : 'act_1', currency: second ? 'USD' : 'INR' }], ...(!second ? { paging: more } : {}) });
      if (url.pathname.endsWith('/act_2/ads')) return json({ data: [ad('4')] });
      if (url.pathname.endsWith('/ads')) return json({ data: second ? [ad('2'), ad('other', { instagram_user_id: '999' })] : [ad('1', { source_instagram_media_id: 'post1' } as any)], ...(!second ? { paging: more } : {}) });
      if (url.pathname.endsWith('/act_2/insights')) return json({ data: [] });
      expect(url.searchParams.get('breakdowns')).toBe('publisher_platform');
      return json({ data: second ? [{ ad_id: '1', publisher_platform: 'instagram', impressions: '1234', reach: '1000', clicks: '0', spend: '12.50', date_start: '2026-09-01', date_stop: '2026-10-22' }] : [{ ad_id: '1', publisher_platform: 'facebook', impressions: '99999', spend: '999' }], ...(!second ? { paging: more } : {}) });
    }));
    const result = await fetchInstagramAds({ accessToken: 'test-token' }, '123', new Set(['post1']));
    expect(result.sync.status).toBe('ready');
    expect(result.items.map(a => a.id)).toEqual(['1', '2', '4']);
    expect(result.items[0]).toMatchObject({ category: 'boosted_post', impressions: 1234, clicks: 0, spend: 12.5, currency: 'INR', status: 'PAUSED' });
    expect(result.items[1]).toMatchObject({ category: 'ad', impressions: null, spend: null });
    expect(result.items[2].currency).toBe('USD');
    expect(calls).toHaveLength(8);
  });
  it('keeps retrieved ads on a later page failure and reports partial data without leaking errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      if (url.pathname.endsWith('/adaccounts')) return json({ data: [{ id: 'act_1' }] });
      if (url.pathname.endsWith('/insights')) return json({ error: { code: 200, message: 'secret provider detail' } }, 403);
      return url.searchParams.has('after') ? json({ error: { code: 2 } }, 500) : json({ data: [ad('1')], paging: { next: 'next', cursors: { after: '2' } } });
    }));
    const result = await fetchInstagramAds({ accessToken: 'token' }, '123', new Set());
    expect(result.items).toHaveLength(1);
    expect(result.sync.status).toBe('partial');
    expect(result.sync.message).toContain('ads_read');
    expect(JSON.stringify(result)).not.toContain('secret provider');
    expect(result.items[0].spend).toBeNull();
  });
  it('stops repeated pagination cursors with an honest partial state', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => url.pathname.endsWith('/adaccounts') ? json({ data: [{ id: 'act_1' }] }) : url.pathname.endsWith('/insights') ? json({ data: [] }) : json({ data: [ad('1')], paging: { next: 'next', cursors: { after: 'same' } } })));
    const result = await fetchInstagramAds({ accessToken: 'token' }, '123', new Set());
    expect(result.items).toHaveLength(1);
    expect(result.sync.status).toBe('partial');
  });
  it('does not attempt native Instagram Login tokens on the Marketing API', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await fetchInstagramAds({ instagramLogin: true, accessToken: 'IGtoken' }, '123', new Set());
    expect(fetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ items: [], sync: { status: 'permission_required' } });
  });
  it('explains inaccessible ad accounts rather than pretending there are no ads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [] })));
    expect((await fetchInstagramAds({ accessToken: 'token' }, '123', new Set())).sync.status).toBe('permission_required');
  });
  it('stops when its time budget is used without affecting organic data', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await fetchInstagramAds({ accessToken: 'token' }, '123', new Set(), 0)).sync.status).toBe('unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
});
