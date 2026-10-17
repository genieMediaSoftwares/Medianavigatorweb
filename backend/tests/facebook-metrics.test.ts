import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacebookClient } from '../src/integrations/meta/facebook/facebookClient.js';
import { classifyFailure } from '../src/services/sync.service.js';

type Answer = { status?: number; body: unknown };
let answer: (u: URL) => Answer = () => ({ status: 404, body: {} });
vi.mock('../src/lib/http.js', async (orig) => {
  const real = await orig<typeof import('../src/lib/http.js')>();
  return { ...real, httpFetch: vi.fn(async (input: string | URL) => {
    const a = answer(new URL(String(input)));
    return new Response(JSON.stringify(a.body), { status: a.status ?? 200 });
  }) };
});
afterEach(() => vi.clearAllMocks());
const metaError = (code: number, message: string, subcode?: number): Answer => ({ status: code === 190 ? 401 : 400, body: { error: { message, code, ...(subcode ? { error_subcode: subcode } : {}) } } });
const graphPath = (u: URL) => u.pathname.replace(/^\/v\d+\.\d+\//, '').replace(/^\//, '');

describe('Facebook post sync', () => {
  const client = new FacebookClient('facebook');
  const insight = (name: string, value: number) => ({ name, period: 'lifetime', values: [{ value }] });
  const fbPost = (id: string, extra: Record<string, unknown> = {}) => ({ id, message: `Post ${id}`, created_time: '2026-10-01T10:00:00+0000', permalink_url: `https://facebook.com/${id}`, ...extra });

  it('reads exact numbers from one paged request (insights inline), keeps real zeros, and labels videos and albums', async () => {
    const requests: string[] = [];
    answer = (u) => {
      requests.push(graphPath(u));
      if (!u.pathname.endsWith('/posts')) return metaError(100, 'unexpected per-post request');
      return { body: { data: [
        fbPost('111_1', { status_type: 'added_video', attachments: { data: [{ media_type: 'video' }] }, shares: { count: 7 }, reactions: { summary: { total_count: 120 } }, comments: { summary: { total_count: 15 } },
          insights: { data: [insight('post_media_view', 5400), insight('post_total_media_view_unique', 4100), insight('post_video_view_time', 1_800_000)] } }),
        fbPost('111_2', { status_type: 'added_photos', attachments: { data: [{ media_type: 'album' }] }, reactions: { summary: { total_count: 0 } }, comments: { summary: { total_count: 0 } },
          insights: { data: [insight('post_media_view', 0), insight('post_total_media_view_unique', 0)] } }),
      ] } };
    };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(requests).toEqual(['111/posts']);
    const [video, album] = r.items;
    expect(video).toMatchObject({ contentType: 'video', views: 5400, reach: 4100, likes: 120, comments: 15, shares: 7, watchTimeMinutes: 30, engagementRate: 2.63 });
    expect(video.missingMetrics).toEqual([]);
    // Legitimate zeros stay 0 and are not marked unavailable; an absent `shares` field means never shared.
    expect(album).toMatchObject({ contentType: 'carousel', views: 0, reach: 0, likes: 0, comments: 0, shares: 0 });
    expect(album.missingMetrics).toEqual(expect.arrayContaining(['watchTimeMinutes', 'engagementRate']));
    expect(album.missingMetrics).not.toEqual(expect.arrayContaining(['views']));
    expect(r.partialReason).toBeUndefined();
    expect(r.metricPermissionsMissing).toEqual([]);
  });

  it('follows paging.next across pages', async () => {
    answer = (u) => (u.searchParams.get('after')
      ? { body: { data: [fbPost('111_3')] } }
      : { body: { data: [fbPost('111_1'), fbPost('111_2')], paging: { next: 'https://graph.facebook.com/v21.0/111/posts?after=abc' } } });
    expect((await client.fetchPosts('t', '111', 'pt')).items.map((i) => i.platformContentId)).toEqual(['111_1', '111_2', '111_3']);
  });

  it('empty insights do not prove a missing permission; views and reach stay unavailable', async () => {
    answer = () => ({ body: { data: [fbPost('111_1', { reactions: { summary: { total_count: 9 } }, comments: { summary: { total_count: 2 } } })] } });
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items[0]).toMatchObject({ likes: 9, comments: 2 });
    expect(r.items[0].missingMetrics).toEqual(expect.arrayContaining(['views', 'reach', 'engagementRate']));
    expect(r.metricPermissionsMissing).toEqual([]);
    expect(r.partialReason).toMatch(/empty insights response does not prove a permission/);
  });

  it('a rejected insights metric does not lose the posts: they are read again without insights', async () => {
    answer = (u) => (u.searchParams.get('fields')?.includes('insights')
      ? metaError(100, '(#100) The value must be a valid insights metric')
      : { body: { data: [fbPost('111_1', { reactions: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } } })] } });
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items).toHaveLength(1);
    expect(r.items[0].missingMetrics).toContain('views');
  });

  it('a number read by an earlier sync is kept when this sync cannot read it, instead of being wiped', async () => {
    answer = () => ({ body: { data: [fbPost('111_1')] } });
    const earlier = new Map([['111_1', { platformContentId: '111_1', views: 800, reach: 600, likes: 40, comments: 5, missingMetrics: [] } as any]]);
    const r = await client.fetchPosts('t', '111', 'pt', earlier);
    expect(r.items[0]).toMatchObject({ views: 800, reach: 600, likes: 40, comments: 5 });
    expect(r.items[0].missingMetrics).not.toEqual(expect.arrayContaining(['views', 'reach', 'likes', 'comments']));
  });

  it('an expired token and a rate limit on the first page are reported by reason (expired is final, rate limit is retried)', async () => {
    answer = () => metaError(190, 'Error validating access token: Session has expired', 463);
    await expect(client.fetchPosts('t', '111', 'pt')).rejects.toMatchObject({ reason: 'token_expired' });
    answer = () => metaError(4, 'Application request limit reached');
    const err = await client.fetchPosts('t', '111', 'pt').catch((e) => e);
    expect(err).toMatchObject({ reason: 'provider_unavailable' });
    expect(classifyFailure(err)).toBe('transient');
  });

  it('a failing first page throws the real reason instead of returning an empty “successful” sync', async () => {
    answer = () => metaError(10, '(#10) This endpoint requires the pages_read_engagement permission');
    await expect(client.fetchPosts('t', '111', 'pt')).rejects.toMatchObject({ reason: 'permission_missing' });
  });

  it('without pages_read_user_content, posts are still read and comments are marked unavailable (not 0)', async () => {
    answer = (u) => {
      if (!u.pathname.endsWith('/posts')) return metaError(10, 'no insights permission');
      return u.searchParams.get('fields')?.includes('comments')
        ? metaError(10, "(#10) This endpoint requires the 'pages_read_user_content' permission or the 'Page Public Content Access' feature.")
        : { body: { data: [{ id: '111_1', message: 'Hello', created_time: '2026-10-01T10:00:00+0000', shares: { count: 2 } }] } };
    };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items).toHaveLength(1);
    expect(r.items[0].shares).toBe(2);
    expect(r.items[0].missingMetrics).toEqual(expect.arrayContaining(['likes', 'comments']));
    expect(r.metricPermissionsMissing).toEqual(['pages_read_user_content']);
    expect(r.partialReason).toMatch(/Meta denied access requiring pages_read_user_content/);
  });

  it('a later page failing keeps what was read and reports the sync as partial', async () => {
    answer = (u) => (u.searchParams.get('after')
      ? metaError(2, 'Service temporarily unavailable')
      : u.pathname.endsWith('/posts')
        ? { body: { data: [{ id: '111_1', message: 'Hello', created_time: '2026-10-01T10:00:00+0000' }], paging: { next: 'https://graph.facebook.com/v21.0/111/posts?after=abc' } } }
        : metaError(10, 'no insights permission'));
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items).toHaveLength(1);
    expect(r.partialReason).toMatch(/Stopped after 1 posts/);
  });

  it('recovers views independently when a rejected reach metric breaks the bundled request', async () => {
    answer = (u) => {
      const fields = u.searchParams.get('fields') ?? '';
      if (fields.includes('post_total_media_view_unique')) return metaError(100, 'Invalid insights metric');
      return { body: { data: [fbPost('111_1', {
        reactions: { summary: { total_count: 20 } }, comments: { summary: { total_count: 4 } },
        ...(fields.includes('post_media_view') ? { insights: { data: [insight('post_media_view', 800)] } } : {}),
      })] } };
    };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items[0]).toMatchObject({ views: 800, likes: 20, comments: 4 });
    expect(r.items[0].missingMetrics).toContain('reach');
    expect(r.items[0].missingMetrics).not.toContain('views');
    expect(r.metricPermissionsMissing).toEqual([]);
  });

  it('keeps reactions when Meta denies only the comments edge', async () => {
    answer = (u) => u.searchParams.get('fields')?.includes('comments')
      ? metaError(10, 'Requires pages_read_user_content')
      : { body: { data: [fbPost('111_1', { reactions: { summary: { total_count: 27 } }, insights: { data: [insight('post_media_view', 100), insight('post_total_media_view_unique', 80)] } })] } };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items[0]).toMatchObject({ likes: 27, views: 100, reach: 80 });
    expect(r.items[0].missingMetrics).toContain('comments');
    expect(r.items[0].missingMetrics).not.toContain('likes');
    expect(r.metricPermissionsMissing).toEqual(['pages_read_user_content']);
  });

  it('fetches video watch time separately and preserves sub-minute precision', async () => {
    const requested: string[] = [];
    answer = (u) => {
      requested.push(graphPath(u));
      if (u.pathname.endsWith('/111_1/insights')) return { body: { data: [insight('post_video_view_time', 45_000)] } };
      expect(u.searchParams.get('fields')).not.toContain('post_video_view_time');
      return { body: { data: [
        fbPost('111_1', { status_type: 'added_video', reactions: { summary: { total_count: 2 } }, comments: { summary: { total_count: 0 } }, insights: { data: [insight('post_media_view', 10), insight('post_total_media_view_unique', 7)] } }),
        fbPost('111_2', { reactions: { summary: { total_count: 0 } }, comments: { summary: { total_count: 0 } }, insights: { data: [insight('post_media_view', 0), insight('post_total_media_view_unique', 0)] } }),
      ] } };
    };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items[0].watchTimeMinutes).toBe(0.75);
    expect(r.items[0].missingMetrics).not.toContain('watchTimeMinutes');
    expect(r.items[1].missingMetrics).toContain('watchTimeMinutes');
    expect(requested).toEqual(['111/posts', '111_1/insights']);
  });

  it('reports read_insights only after an explicit Meta permission refusal', async () => {
    answer = (u) => u.searchParams.get('fields')?.includes('insights')
      ? metaError(10, 'Requires read_insights permission')
      : { body: { data: [fbPost('111_1', { reactions: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } } })] } };
    const r = await client.fetchPosts('t', '111', 'pt');
    expect(r.items[0]).toMatchObject({ likes: 3, comments: 1 });
    expect(r.items[0].missingMetrics).toEqual(expect.arrayContaining(['views', 'reach']));
    expect(r.metricPermissionsMissing).toEqual(['read_insights']);
  });

  it('identifies missing read_insights from verified User permissions instead of empty metrics', async () => {
    answer = (u) => {
      expect(u.searchParams.get('fields')).not.toContain('insights');
      return { body: { data: [fbPost('111_1', { reactions: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } } })] } };
    };
    const r = await client.fetchPosts('t', '111', 'pt', undefined, ['pages_show_list', 'pages_read_engagement']);
    expect(r.metricPermissionsMissing).toEqual(['read_insights']);
    expect(r.items[0]).toMatchObject({ likes: 3, comments: 1 });
  });

  it('does not revive an unavailable historical zero as a measured value', async () => {
    answer = () => ({ body: { data: [fbPost('111_1')] } });
    const existing = new Map([['111_1', { views: 0, reach: 0, likes: 0, comments: 0, unavailableMetrics: ['views', 'reach', 'likes', 'comments'] } as any]]);
    const r = await client.fetchPosts('t', '111', 'pt', existing);
    expect(r.items[0].missingMetrics).toEqual(expect.arrayContaining(['views', 'reach', 'likes', 'comments']));
  });
});
