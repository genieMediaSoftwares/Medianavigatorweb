import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstagramClient } from '../src/integrations/meta/instagram/instagramClient.js';
import { instagramAdapter } from '../src/integrations/adapters/instagram.adapter.js';
import { oauthApp } from '../src/services/oauth.service.js';

afterEach(() => vi.unstubAllGlobals());
describe('Instagram Login data access', () => {
  it('requests only Instagram profile/media and insights scopes on the Instagram consent screen', () => {
    const app = oauthApp('instagram');
    expect(new URL(app.authorizeUrl).hostname).toBe('www.instagram.com');
    expect(app.clientId).toBe('ig-app');
    expect(app.scope.split(',')).toEqual(['instagram_business_basic', 'instagram_business_manage_insights']);
  });
  it('reads the authorized account, paginates media, and retrieves measured insights on Instagram only', async () => {
    const paths: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input); expect(url.hostname).toBe('graph.instagram.com');
      paths.push(url.pathname);
      let data: unknown;
      if (url.pathname.endsWith('/me')) data = { user_id: '123', username: 'creator', media_count: 2 };
      else if (url.pathname.endsWith('/media')) {
        const second = url.searchParams.has('after');
        data = { data: [{ id: second ? 'post2' : 'post1', media_type: 'VIDEO', media_product_type: 'REELS', timestamp: new Date().toISOString(), like_count: 4, comments_count: 2 }], ...(second ? {} : { paging: { next: 'https://graph.instagram.com/next', cursors: { after: 'cursor2' } } }) };
      } else data = { data: [{ name: 'views', values: [{ value: 100 }] }, { name: 'reach', values: [{ value: 80 }] }, { name: 'shares', values: [{ value: 3 }] }] };
      return new Response(JSON.stringify(data));
    }));
    const client = new InstagramClient(true);
    const account = await client.resolveAccount('private-token', '123');
    const items = await client.fetchMedia('private-token', account.id, account);
    expect(items).toHaveLength(2);
    expect(items[0].views).toBe(100);
    expect(items[0].missingMetrics).not.toContain('views');
    expect(paths.filter(p => p.endsWith('/media'))).toHaveLength(2);
  });
  it('rejects a different account instead of importing someone else’s posts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ user_id: '999', username: 'other' }))));
    await expect(new InstagramClient(true).resolveAccount('token', '123')).rejects.toThrow('different account');
  });
  it('does not turn rejected media permissions into an empty successful import', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 10, message: 'permission denied' } }), { status: 403 })));
    await expect(new InstagramClient(true).fetchMedia('token', '123')).rejects.toMatchObject({ reason: 'permission_missing' });
  });
});

describe('Instagram token lifecycle and account insights', () => {
  it('refreshes the long-lived token without requiring a separate refresh token', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      expect(url.origin + url.pathname).toBe('https://graph.instagram.com/refresh_access_token');
      expect(url.searchParams.get('grant_type')).toBe('ig_refresh_token');
      return new Response(JSON.stringify({ access_token: 'renewed', expires_in: 5184000 }));
    }));
    const result = await instagramAdapter.refreshCredentials!({ instagramLogin: true, accountId: '123', accessToken: 'old', expiresAt: new Date(Date.now() + 86400000).toISOString() });
    expect(result.accessToken).toBe('renewed');
    expect(result.accountId).toBe('123');
    expect(Date.parse(result.expiresAt!)).toBeGreaterThan(Date.now() + 50 * 86400000);
  });
  it('requires reconnection for expired tokens without making a refresh call', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(instagramAdapter.refreshCredentials!({ instagramLogin: true, expiresAt: new Date(0).toISOString() })).rejects.toThrow('expired');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('retains genuine zero account metrics while marking absent metrics unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      expect(url.pathname).toContain('/123/insights');
      expect(url.searchParams.get('metric_type')).toBe('total_value');
      return new Response(JSON.stringify({ data: url.searchParams.get('metric') === 'reach' ? [{ name: 'reach', total_value: { value: 0 } }] : [] }));
    }));
    const result = await new InstagramClient(true).fetchAccountInsights('token', '123');
    expect(result.metrics).toEqual({ reach: 0 });
    expect(result.unavailable).toEqual(['views', 'accounts_engaged', 'total_interactions']);
  });
});
