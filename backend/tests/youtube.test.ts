import { describe, it, expect, beforeEach, vi } from 'vitest';

// Google's APIs are replaced by this router; each test says what Google answers.
type Answer = { status?: number; body: unknown };
const calls: string[] = [];
let answer: (url: string) => Answer = () => ({ status: 404, body: { error: { message: 'not mocked' } } });

vi.mock('../src/lib/http.js', async (orig) => {
  const real = await orig<typeof import('../src/lib/http.js')>();
  return {
    ...real,
    httpFetch: vi.fn(async (input: string | URL) => {
      const url = String(input);
      calls.push(url);
      const a = answer(url);
      return new Response(JSON.stringify(a.body), { status: a.status ?? 200, headers: { 'Content-Type': 'application/json' } });
    }),
  };
});

import { youtubeAdapter } from '../src/integrations/adapters/youtube.adapter.js';

const CHANNEL = {
  id: 'UCownChannel000000000000',
  snippet: { title: 'My Channel', customUrl: '@mychannel', thumbnails: { default: { url: 'https://img/x.jpg' } } },
  statistics: { subscriberCount: '120', videoCount: '0' },
  contentDetails: { relatedPlaylists: { uploads: 'UUownChannel000000000000' } },
};

const KEY = 'AIzaSyA1234567890abcdefghijklmnopqrstuv'; // 39 characters, the shape of a real key

/** A Google error body in the shape the Data API returns. */
const gErr = (code: number, reason: string, legacy?: string): Answer => ({
  status: code,
  body: { error: { code, message: 'raw provider text', errors: legacy ? [{ reason: legacy }] : [], details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason }] } },
});

/** A normal Google: token info with YouTube scope, the channel for mine/id/handle lookups, an empty uploads list. */
function google(overrides: Partial<Record<'tokeninfo' | 'mine' | 'byKey', Answer>> = {}) {
  answer = (url) => {
    if (url.includes('oauth2/v3/tokeninfo')) return overrides.tokeninfo ?? { body: { scope: 'https://www.googleapis.com/auth/youtube.readonly' } };
    if (url.includes('/channels') && url.includes('mine=true')) return overrides.mine ?? { body: { items: [CHANNEL] } };
    if (url.includes('/channels') && url.includes(`key=${KEY}`)) {
      if (overrides.byKey) return overrides.byKey;
      const u = new URL(url);
      const match = u.searchParams.get('id') === CHANNEL.id || u.searchParams.get('forHandle') === '@mychannel';
      return { body: { items: match ? [CHANNEL] : [] } };
    }
    if (url.includes('/playlistItems')) return { status: 404, body: { error: { code: 404, errors: [{ reason: 'playlistNotFound' }] } } };
    if (url.includes('/search')) return { body: { items: [] } };
    return { status: 404, body: { error: { message: 'unexpected call' } } };
  };
}

describe('YouTube Data API v3 with an API key: exact channel, public data', () => {
  beforeEach(() => {
    calls.length = 0;
    google();
  });

  it('the old “Invalid Value” case: an API key sent as a sign-in token gets a clear message, not a tokeninfo call', async () => {
    const v = await youtubeAdapter.validate({ accessToken: KEY });
    expect(v.isValid).toBe(false);
    expect(v.error).toMatch(/YouTube Data API key, not a Google sign-in/);
    expect(calls.some((u) => u.includes('tokeninfo'))).toBe(false);
  });

  it('requires the channel: an API key alone can’t identify it', async () => {
    const v = await youtubeAdapter.validate({ apiKey: KEY });
    expect(v.isValid).toBe(false);
    expect(v.error).toMatch(/can’t tell which channel is yours/);
    expect(calls).toHaveLength(0);
  });

  it('refuses names and search terms; only channel IDs and @handles', async () => {
    for (const q of ['my channel', 'abc', 'https://example.com/@x', '@a']) {
      const v = await youtubeAdapter.validate({ apiKey: KEY, channelQuery: q });
      expect(v.isValid, q).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });

  it('refuses something that isn’t shaped like a Google API key', async () => {
    const v = await youtubeAdapter.validate({ apiKey: 'not-a-key', channelQuery: '@mychannel' });
    expect(v.error).toMatch(/doesn’t look like a Google API key/);
  });

  it('connects exactly the channel named by @handle, ID or link, using the key (never as a bearer token)', async () => {
    for (const q of ['@mychannel', CHANNEL.id, `https://www.youtube.com/channel/${CHANNEL.id}`, 'youtube.com/@mychannel/videos']) {
      calls.length = 0;
      expect((await youtubeAdapter.validate({ apiKey: KEY, channelQuery: q })).isValid, q).toBe(true);
      const account = await youtubeAdapter.resolveAccount({ apiKey: KEY, channelQuery: q });
      expect(account.providerAccountId, q).toBe(CHANNEL.id);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain(`key=${KEY}`);
      expect(calls[0]).not.toContain('mine=true');
    }
    expect(calls.some((u) => /\/search|chart=|forUsername/.test(u))).toBe(false);
  });

  it('a handle that doesn’t exist is reported, not searched for', async () => {
    await expect(youtubeAdapter.resolveAccount({ apiKey: KEY, channelQuery: '@nobodyhere' })).rejects.toThrow(/No YouTube channel matches @nobodyhere/);
    expect(calls.some((u) => u.includes('/search'))).toBe(false);
  });

  it.each([
    ['invalid key', gErr(400, 'API_KEY_INVALID', 'badRequest'), /isn’t valid/],
    ['API not enabled', gErr(403, 'SERVICE_DISABLED', 'accessNotConfigured'), /YouTube Data API v3 isn’t enabled/],
    ['key restricted', gErr(403, 'API_KEY_IP_ADDRESS_BLOCKED'), /restrictions block/],
    ['quota used up', gErr(403, 'RATE_LIMIT_EXCEEDED', 'quotaExceeded'), /quota/],
    ['Google down', { status: 503, body: { error: { code: 503 } } }, /isn’t responding/],
  ])('explains Google errors in plain words: %s', async (_name, response, message) => {
    google({ byKey: response as Answer });
    const err = await youtubeAdapter.resolveAccount({ apiKey: KEY, channelQuery: '@mychannel' }).catch((e) => e);
    expect(err.message).toMatch(message);
    expect(err.message).not.toContain('raw provider text');
    expect(err.message).not.toContain(KEY);
  });

  it('syncs the stored channel by ID; watch time is marked unavailable because API keys can’t use YouTube Analytics', async () => {
    const VIDEO = { id: 'vid00000002', snippet: { title: 'V', publishedAt: '2026-08-01T10:00:00Z' }, statistics: { viewCount: '10' }, contentDetails: { duration: 'PT2M' } };
    answer = (url) => {
      if (url.includes('/channels')) return { body: { items: [CHANNEL] } };
      if (url.includes('/playlistItems')) return { body: { items: [{ contentDetails: { videoId: VIDEO.id } }] } };
      if (url.includes('/videos?')) return { body: { items: [VIDEO] } };
      return { status: 404, body: {} };
    };
    const account = { providerAccountId: CHANNEL.id, accountInfo: {} } as any;
    const { items } = await youtubeAdapter.fetchContent({ apiKey: KEY, channelId: CHANNEL.id }, account, {} as any);
    expect(items).toHaveLength(1);
    expect(items[0].missingMetrics).toContain('watchTimeMinutes');
    expect(calls.some((u) => u.includes('youtubeanalytics'))).toBe(false);
    expect(calls.find((u) => u.includes('/channels'))).toContain(`id=${CHANNEL.id}`);
  });

  it('reports a quota error during sync instead of silently importing nothing', async () => {
    answer = (url) => (url.includes('/channels') ? { body: { items: [CHANNEL] } } : url.includes('/playlistItems') ? gErr(403, 'RATE_LIMIT_EXCEEDED', 'quotaExceeded') : { status: 404, body: {} });
    const account = { providerAccountId: CHANNEL.id, accountInfo: {} } as any;
    await expect(youtubeAdapter.fetchContent({ apiKey: KEY, channelId: CHANNEL.id }, account, {} as any)).rejects.toThrow(/quota/);
  });
});

describe('YouTube Analytics via Google sign-in (OAuth): the owner’s channel', () => {
  beforeEach(() => {
    calls.length = 0;
    google();
  });

  it('doesn’t take a channel ID with sign-in: the account’s own channel is used', async () => {
    const v = await youtubeAdapter.validate({ accessToken: 'ya29.token', channelQuery: '@someone' });
    expect(v.isValid).toBe(false);
    expect(v.error).toMatch(/isn’t needed with Google sign-in/);
  });

  it('rejects an empty submission', async () => {
    expect((await youtubeAdapter.validate({})).isValid).toBe(false);
  });

  it('rejects a sign-in without YouTube access', async () => {
    google({ tokeninfo: { body: { scope: 'openid email' } } });
    const v = await youtubeAdapter.validate({ accessToken: 'ya29.token' });
    expect(v).toMatchObject({ isValid: false });
    expect(v.error).toMatch(/doesn’t include YouTube access/);
  });

  it('turns Google’s bare “Invalid Value” into a plain message', async () => {
    google({ tokeninfo: { status: 400, body: { error: 'invalid_token', error_description: 'Invalid Value' } } });
    const v = await youtubeAdapter.validate({ accessToken: 'ya29.bad' });
    expect(v.isValid).toBe(false);
    expect(v.error).toMatch(/invalid or has expired/);
    expect(v.error).not.toContain('Invalid Value');
  });

  it('accepts a valid sign-in and resolves exactly the channel Google says it owns', async () => {
    expect((await youtubeAdapter.validate({ accessToken: 'ya29.token' })).isValid).toBe(true);
    const account = await youtubeAdapter.resolveAccount({ accessToken: 'ya29.token' });
    expect(account).toMatchObject({ providerAccountId: CHANNEL.id, handle: '@mychannel', displayName: 'My Channel' });
    const channelCalls = calls.filter((u) => u.includes('/channels'));
    expect(channelCalls).toHaveLength(1);
    expect(channelCalls[0]).toContain('mine=true');
    expect(calls.some((u) => /forHandle|forUsername|chart=|\/search|key=/.test(u))).toBe(false);
  });

  it('refuses an account with no channel instead of picking another one', async () => {
    google({ mine: { body: { items: [] } } });
    await expect(youtubeAdapter.resolveAccount({ accessToken: 'ya29.token' })).rejects.toThrow(/no YouTube channel/);
  });

  it('reports an expired sign-in in plain words', async () => {
    google({ mine: { status: 401, body: { error: { code: 401, status: 'UNAUTHENTICATED', errors: [{ reason: 'authError' }] } } } });
    await expect(youtubeAdapter.resolveAccount({ accessToken: 'ya29.old' })).rejects.toThrow(/expired or was revoked/);
  });

  it('stops syncing if the sign-in now belongs to a different channel', async () => {
    const account = { providerAccountId: 'UCsomeoneElse000000000000', accountInfo: {} } as any;
    await expect(youtubeAdapter.fetchContent({ accessToken: 'ya29.token' }, account, {} as any)).rejects.toThrow(/different YouTube channel/);
  });

  it('never imports trending videos when the channel has none', async () => {
    const account = { providerAccountId: CHANNEL.id, accountInfo: {} } as any;
    const { items } = await youtubeAdapter.fetchContent({ accessToken: 'ya29.token' }, account, {} as any);
    expect(items).toEqual([]);
    expect(calls.some((u) => u.includes('chart='))).toBe(false);
  });

  describe('watch time from YouTube Analytics', () => {
    const VIDEO = {
      id: 'vid00000001',
      snippet: { title: 'A video', description: '', publishedAt: '2026-08-01T10:00:00Z', thumbnails: { medium: { url: 'https://img/v.jpg' } } },
      statistics: { viewCount: '1000', likeCount: '50', commentCount: '5' },
      contentDetails: { duration: 'PT5M' },
    };
    const withVideo = (analytics: Answer) => {
      answer = (url) => {
        if (url.includes('/channels') && url.includes('mine=true')) return { body: { items: [CHANNEL] } };
        if (url.includes('/playlistItems')) return { body: { items: [{ contentDetails: { videoId: VIDEO.id } }] } };
        if (url.includes('/videos?')) return { body: { items: [VIDEO] } };
        if (url.includes('youtubeanalytics.googleapis.com')) return analytics;
        return { status: 404, body: { error: { message: 'unexpected call' } } };
      };
    };
    const account = { providerAccountId: CHANNEL.id, accountInfo: {} } as any;

    it('stores each video’s real watch time when Analytics is granted', async () => {
      withVideo({ body: { columnHeaders: [{ name: 'video' }, { name: 'estimatedMinutesWatched' }, { name: 'averageViewDuration' }, { name: 'averageViewPercentage' }], rows: [[VIDEO.id, 1234.4, 74, 41.2]] } });
      const { items } = await youtubeAdapter.fetchContent({ accessToken: 'ya29.token' }, account, {} as any);
      expect(items).toHaveLength(1);
      expect(items[0].watchTimeMinutes).toBe(1234);
      expect(items[0].missingMetrics ?? []).not.toContain('watchTimeMinutes');
      const report = calls.find((u) => u.includes('youtubeanalytics'))!;
      expect(report).toContain('ids=channel%3D%3DMINE');
      expect(decodeURIComponent(report)).toContain(`filters=video==${VIDEO.id}`);
    });

    it('marks watch time unavailable (not zero) when the Analytics permission is missing', async () => {
      withVideo({ status: 403, body: { error: { message: 'Insufficient permission' } } });
      const { items } = await youtubeAdapter.fetchContent({ accessToken: 'ya29.token' }, account, {} as any);
      expect(items[0].watchTimeMinutes).toBeUndefined();
      expect(items[0].missingMetrics).toContain('watchTimeMinutes');
      // the public numbers still sync
      expect(items[0].views).toBe(1000);
    });
  });
});
