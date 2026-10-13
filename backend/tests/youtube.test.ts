import { beforeEach, describe, expect, it, vi } from 'vitest';

// The YouTube connector must only ever show the videos of the channel it was pointed at.
const http = vi.hoisted(() => ({ calls: [] as string[], handler: (_url: URL): { status?: number; body: unknown } => ({ body: {} }) }));
vi.mock('../src/lib/http.js', () => ({
  httpFetch: async (input: string | URL) => {
    const url = new URL(String(input));
    http.calls.push(url.pathname + url.search);
    const out = http.handler(url);
    const status = out.status ?? 200;
    return { ok: status < 400, status, json: async () => out.body, headers: new Headers() } as unknown as Response;
  },
  ProviderHttpError: class extends Error {},
}));

import { YouTubeDataApi } from '../src/integrations/youtube/dataApi.js';

const channel = (id: string) => ({ items: [{ id, snippet: { title: 'My Channel', customUrl: '@mine' }, statistics: { videoCount: '120', subscriberCount: '5' }, contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } } }] });
const video = (id: string, dur = 'PT3M', views = '100') => ({ id, snippet: { title: `Video ${id}`, publishedAt: '2026-01-01T00:00:00Z', description: '' }, statistics: { viewCount: views, likeCount: '10', commentCount: '2' }, contentDetails: { duration: dur } });

beforeEach(() => { http.calls = []; http.handler = () => ({ body: {} }); });

describe('YouTube connector', () => {
  it('never falls back to the "most popular" chart when no channel is given with an API key', async () => {
    await expect(YouTubeDataApi.getChannel({ apiKey: 'AIza-test' })).rejects.toThrow(/handle|channel/i);
    expect(http.calls.some((c) => c.includes('mostPopular'))).toBe(false);
    expect(http.calls).toHaveLength(0);
  });

  it('uses mine=true for a Google sign-in token with no channel given', async () => {
    http.handler = (u) => (u.searchParams.get('mine') ? { body: channel('UCabcdefghijklmnopqrstuv') } : { status: 404, body: {} });
    const ch = await YouTubeDataApi.getChannel({ accessToken: 'ya29.token' });
    expect(ch.id).toBe('UCabcdefghijklmnopqrstuv');
  });

  it('reads every page of the uploads playlist and reports only that channel’s videos, without invented numbers', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `vid${String(i).padStart(8, '0')}`);
    http.handler = (u) => {
      if (u.pathname.endsWith('/playlistItems')) {
        expect(u.searchParams.get('playlistId')).toBe('UUabcdefghijklmnopqrstuv');
        const start = Number(u.searchParams.get('pageToken') ?? 0);
        const slice = ids.slice(start, start + 50);
        return { body: { items: slice.map((id) => ({ contentDetails: { videoId: id } })), ...(start + 50 < ids.length ? { nextPageToken: String(start + 50) } : {}) } };
      }
      if (u.pathname.endsWith('/videos')) return { body: { items: (u.searchParams.get('id') ?? '').split(',').map((id) => video(id)) } };
      return { status: 404, body: {} };
    };
    const media = await YouTubeDataApi.getVideos({ apiKey: 'k', channelId: 'UCabcdefghijklmnopqrstuv' }, 'UUabcdefghijklmnopqrstuv');
    expect(media).toHaveLength(120);
    expect(new Set(media.map((m) => m.platformContentId)).size).toBe(120);
    expect(media.every((m) => m.shares === 0 && m.reach === 0)).toBe(true);
    expect(http.calls.some((c) => c.includes('mostPopular'))).toBe(false);
  });

  it('reports a failing first page instead of silently returning nothing', async () => {
    http.handler = () => ({ status: 403, body: { error: { message: 'quotaExceeded' } } });
    await expect(YouTubeDataApi.getVideos({ apiKey: 'k', channelId: 'UCabcdefghijklmnopqrstuv' }, 'UUabcdefghijklmnopqrstuv')).rejects.toThrow(/quotaExceeded/);
  });

  it('returns an empty list (never someone else’s videos) for a channel with no uploads', async () => {
    http.handler = (u) => (u.pathname.endsWith('/playlistItems') ? { body: { items: [] } } : { status: 404, body: {} });
    expect(await YouTubeDataApi.getVideos({ apiKey: 'k', channelId: 'UCabcdefghijklmnopqrstuv' }, 'UUabcdefghijklmnopqrstuv')).toEqual([]);
  });
});
