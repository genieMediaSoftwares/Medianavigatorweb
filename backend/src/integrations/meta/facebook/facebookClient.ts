import { config } from '../../../config/env.js';
import { hasMeaningfulDenominator } from '../../../services/ai/engagementRate.js';
import { httpFetch } from '../../../lib/http.js';
import { ConnectError, type ConnectFailureReason } from '../../../lib/errors.js';
import { MetaClient } from '../metaClient.js';
import { describeMetaError, MetaApiError } from '../metaErrors.js';
import { logger } from '../../../lib/logger.js';

const PAGE_FIELDS = 'id,name,fan_count,followers_count,picture,category';
/** Refusals no other lookup can get around. */
const FINAL = new Set<ConnectFailureReason>(['token_invalid', 'token_expired', 'app_restricted', 'provider_unavailable']);
import { NormalizedMedia, PerformanceTier } from '../../../../../shared/types.js';

export interface FacebookPageInfo {
  id: string;
  name: string;
  fanCount?: number;
  followersCount?: number;
  pictureUrl?: string;
  category?: string;
  pageAccessToken?: string;
}

export class FacebookClient extends MetaClient {
  /**
   * Resolves the Facebook Page to connect and its Page access token. Only a Page this token manages is accepted:
   * a typed Page ID is validated (never silently swapped for another Page), several managed Pages require a choice,
   * and a personal profile is never treated as a Page. Works with a User token (Pages via /me/accounts) or a Page token.
   */
  async resolvePage(accessToken: string, providedPageId?: string): Promise<FacebookPageInfo> {
    const wanted = providedPageId?.trim() || '';
    const toInfo = (p: any, pageToken: string): FacebookPageInfo => ({
      id: p.id, name: p.name, fanCount: p.fan_count, followersCount: p.followers_count, pictureUrl: p.picture?.data?.url, category: p.category, pageAccessToken: pageToken,
    });

    let pages: any[] | null = null;
    let listRefusal: MetaApiError | null = null;
    try {
      const accountsData = await this.get<any>('me/accounts', accessToken, { fields: `${PAGE_FIELDS},access_token`, limit: '100' });
      pages = Array.isArray(accountsData.data) ? accountsData.data : [];
    } catch (err) {
      // A bad, expired or blocked token is final. Anything else (e.g. a Page token, which has no /accounts edge) is tried below.
      if (!(err instanceof MetaApiError) || FINAL.has(err.reason)) throw err;
      listRefusal = err;
    }

    if (pages && pages.length) {
      const match = wanted ? pages.find((p) => p.id === wanted || p.name?.toLowerCase() === wanted.toLowerCase()) : pages.length === 1 ? pages[0] : null;
      if (match) {
        if (!match.access_token) throw new ConnectError('permission_missing', `Meta didn’t return a Page access token for “${match.name}”. Make sure you have a role on the Page, and add pages_read_engagement to the token.`);
        return toInfo(match, match.access_token);
      }
      const list = pages.slice(0, 10).map((p) => `${p.name} (${p.id})`).join(', ');
      if (!wanted) throw new ConnectError('account_selection_required', `This token manages ${pages.length} Facebook Pages. Enter the ID of the one to connect: ${list}.`, { field: 'pageId' });
      // Not in the list: it may still be a Page the token can manage (for example one shared through a business portfolio).
      const direct = await this.managedPage(wanted, accessToken);
      if (direct) return toInfo(direct, direct.access_token);
      throw new ConnectError('account_not_authorized', `Page “${wanted}” isn’t one of the Pages this token manages. Pages it manages: ${list}.`);
    }

    // A Page access token: /me is the Page itself (a User token has no Page fields and fails here).
    let me: any = null;
    try {
      me = await this.get<any>('me', accessToken, { fields: PAGE_FIELDS });
    } catch (err) {
      if (err instanceof MetaApiError && FINAL.has(err.reason)) throw err;
    }
    if (me?.id) {
      if (!wanted || wanted === me.id || wanted.toLowerCase() === me.name?.toLowerCase()) return toInfo(me, accessToken);
      throw new ConnectError('account_not_authorized', `This is a Page access token for “${me.name}” (${me.id}), not for Page “${wanted}”.`);
    }

    if (wanted) {
      const direct = await this.managedPage(wanted, accessToken);
      if (direct) return toInfo(direct, direct.access_token);
      throw new ConnectError('account_not_authorized', `This token can’t manage Page “${wanted}”. Generate the token while signed in as an admin of that Page, and select the Page when Meta asks which Pages to share.`);
    }
    // Not a Page token either: Meta's own permission refusal names what to add, so report it instead of "no Pages".
    if (listRefusal?.reason === 'permission_missing') throw listRefusal;
    throw new ConnectError('account_not_found', pages === null
      ? 'This token can’t list your Facebook Pages. Add the pages_show_list and pages_read_engagement permissions when generating it, select your Page when Meta asks which Pages to share, then connect again.'
      : 'This token doesn’t give access to any Facebook Page. Personal profiles can’t be connected: generate the token while signed in as an admin of the Page, select the Page when Meta asks which Pages to share, and include pages_show_list and pages_read_engagement.');
  }

  /** The Page when this token can manage it (Meta only returns its access_token to people with a role on the Page). */
  private async managedPage(pageId: string, accessToken: string): Promise<any | null> {
    try {
      const page = await this.get<any>(encodeURIComponent(pageId), accessToken, { fields: `${PAGE_FIELDS},access_token` });
      return page?.id && page.access_token ? page : null;
    } catch (err) {
      if (err instanceof MetaApiError && FINAL.has(err.reason)) throw err;
      return null;
    }
  }

  /**
   * Reads every Page post with the metrics this token is authorized for, in paged /posts requests (insights inline, not
   * one request per post). A metric Meta does not return is listed in `missingMetrics` (shown as N/A), never set to 0;
   * a value read by an earlier sync is kept when this sync cannot read it.
   */
  async fetchPosts(accessToken: string, pageId: string, pageAccessToken?: string, existing?: Map<string, NormalizedMedia>, verifiedScopes?: readonly string[]): Promise<{ items: NormalizedMedia[]; partialReason?: string; metricPermissionsMissing?: string[] }> {
    const effectiveToken = pageAccessToken || accessToken;
    const baseFields = 'id,message,created_time,full_picture,permalink_url,shares,status_type,attachments{media_type}';
    // Never let one denied edge or unsupported metric hide the other readable numbers.
    let reactionsReadable = true;
    let commentsReadable = true;
    let insightsRequested = verifiedScopes === undefined || verifiedScopes.includes('read_insights');
    const deniedPermissions = new Set<string>();
    if (!insightsRequested) deniedPermissions.add('read_insights');
    const recordDenial = (err: unknown) => {
      if (!(err instanceof MetaApiError) || err.reason !== 'permission_missing') return;
      for (const permission of ['pages_read_user_content', 'pages_read_engagement', 'read_insights']) {
        if (err.providerMessage.includes(permission)) deniedPermissions.add(permission);
      }
    };
    const fields = () => [
      baseFields,
      ...(reactionsReadable ? ['reactions.limit(0).summary(total_count)'] : []),
      ...(commentsReadable ? ['comments.limit(0).summary(total_count)'] : []),
      ...(insightsRequested ? [`insights.metric(${INSIGHT_METRICS.join(',')}).period(lifetime)`] : []),
    ].join(',');
    const firstPage = () => `https://graph.facebook.com/${config.providers.metaApiVersion}/${pageId}/posts?fields=${encodeURIComponent(fields())}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;

    // Fetch all pages using paging.next
    let allPosts: any[] = [];
    let currentUrl: string | null = firstPage();
    let pageCount = 0;
    let partialReason: string | undefined;

    while (currentUrl && pageCount < config.providers.maxPages) {
      pageCount++;
      try {
        const res: Response = await httpFetch(currentUrl, {
          headers: { 'Authorization': `Bearer ${effectiveToken}`, 'Accept': 'application/json' },
        });
        if (!res.ok) {
          // The first page failing means nothing can be read (expired token, missing permission): report it instead of
          // recording an empty "successful" sync. A later page failing keeps what was read and marks the sync partial.
          const err = describeMetaError('facebook', await res.json().catch(() => null), res.status);
          recordDenial(err);
          if (pageCount === 1 && (commentsReadable || reactionsReadable) && err.reason === 'permission_missing' && /pages_read_user_content/.test(err.providerMessage)) {
            // Comments and reactions have separate permission checks. Try keeping reactions first.
            if (commentsReadable) commentsReadable = false;
            else reactionsReadable = false;
            pageCount = 0;
            currentUrl = firstPage();
            continue;
          }
          // An insights metric Meta rejects fails the whole request; the posts are still read without insights.
          if (pageCount === 1 && insightsRequested && ((err.providerCode === 100 && /insights|metric/i.test(err.providerMessage)) || (err.reason === 'permission_missing' && /read_insights/.test(err.providerMessage)))) {
            insightsRequested = false;
            pageCount = 0;
            currentUrl = firstPage();
            continue;
          }
          if (pageCount === 1) throw err;
          partialReason = `Stopped after ${allPosts.length} posts: ${err.message}`;
          break;
        }
        const json: any = await res.json();
        if (json.data && Array.isArray(json.data)) {
          allPosts.push(...json.data);
        }
        if (json.paging && typeof json.paging.next === 'string' && json.paging.next.length > 0) {
          currentUrl = json.paging.next;
        } else {
          currentUrl = null;
        }
      } catch (err) {
        if (pageCount === 1) throw err;
        partialReason ??= `Stopped after ${allPosts.length} posts because a page of results failed to load.`;
        break;
      }
    }
    if (currentUrl && !partialReason) partialReason = `Stopped after ${config.providers.maxPages} pages of results (the configured limit).`;

    if (allPosts.length === 0) {
      return { items: [], partialReason };
    }

    // A bundled insights request can be rejected because one metric is unavailable for
    // one format/API version. Read each missing column independently so the valid ones survive.
    const byId = new Map(allPosts.map((post) => [String(post.id), post]));
    const recoverColumn = async (field: string, needs: (post: any) => boolean) => {
      if (!allPosts.some(needs)) return;
      let next: string | undefined = `${pageId}/posts`;
      let pages = 0;
      try {
        while (next && pages++ < config.providers.maxPages) {
          const data: any = next.startsWith('https://')
            ? await readPage(next)
            : await this.get<any>(next, effectiveToken, { fields: `id,${field}`, limit: '100' });
          for (const fresh of Array.isArray(data.data) ? data.data : []) {
            const post = byId.get(String(fresh.id));
            if (!post) continue;
            if (fresh.reactions) post.reactions = fresh.reactions;
            if (fresh.comments) post.comments = fresh.comments;
            if (Array.isArray(fresh.insights?.data)) {
              post.insights = { data: [...(post.insights?.data ?? []), ...fresh.insights.data] };
            }
          }
          next = data.paging?.next;
        }
      } catch (err) {
        recordDenial(err);
        // A missing metric must not discard successfully imported posts or other metrics.
        if (err instanceof MetaApiError && (err.reason === 'token_expired' || err.reason === 'app_restricted' || err.reason === 'token_invalid')) throw err;
      }
    };
    const readPage = async (url: string) => {
      const res = await httpFetch(url, { headers: { Authorization: `Bearer ${effectiveToken}`, Accept: 'application/json' } });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw describeMetaError('facebook', data, res.status);
      return data;
    };
    await recoverColumn('reactions.limit(0).summary(total_count)', (p) => summaryCount(p.reactions) === undefined);
    await recoverColumn('comments.limit(0).summary(total_count)', (p) => summaryCount(p.comments) === undefined);
    for (const metric of INSIGHT_METRICS) {
      if (deniedPermissions.has('read_insights')) break;
      await recoverColumn(`insights.metric(${metric}).period(lifetime)`, (p) => !readInsights(p.insights?.data).has(metric));
    }

    // Watch time applies to videos, not photos/links/albums. Request it only for
    // video posts, with bounded concurrency so a large Page cannot flood Meta.
    const videos = allPosts.filter((p) => facebookContentType(p) === 'video' && !readInsights(p.insights?.data).has('post_video_view_time'));
    for (let offset = 0; offset < videos.length && !deniedPermissions.has('read_insights'); offset += 4) {
      await Promise.all(videos.slice(offset, offset + 4).map(async (post) => {
        try {
          const data = await this.get<any>(`${post.id}/insights`, effectiveToken, { metric: 'post_video_view_time', period: 'lifetime' });
          if (Array.isArray(data.data)) post.insights = { data: [...(post.insights?.data ?? []), ...data.data] };
        } catch (err) {
          recordDenial(err);
          if (err instanceof MetaApiError && (err.reason === 'token_expired' || err.reason === 'app_restricted' || err.reason === 'token_invalid')) throw err;
        }
      }));
    }

    const normalizedList: NormalizedMedia[] = [];
    let postsWithInsights = 0;
    let keptFromEarlierSync = 0;

    for (const post of allPosts) {
      const insights = readInsights(post.insights?.data);
      if (insights.size) postsWithInsights++;
      const contentType = facebookContentType(post);
      const isVideo = contentType === 'video';
      const previous = existing?.get(post.id) ?? existing?.get(`fb_${post.id}`);
      const missing = new Set<string>(isVideo ? [] : ['watchTimeMinutes']);

      // A number is what Meta returned for this post, else the value an earlier sync read, else unavailable.
      const pick = (metric: 'views' | 'reach' | 'likes' | 'comments' | 'watchTimeMinutes', fresh: number | undefined): number | undefined => {
        if (fresh !== undefined) return fresh;
        const old = previous?.[metric];
        const unavailable = [...(previous?.missingMetrics ?? []), ...((previous as (NormalizedMedia & { unavailableMetrics?: string[] }) | undefined)?.unavailableMetrics ?? [])];
        if (typeof old === 'number' && Number.isFinite(old) && !unavailable.includes(metric)) { keptFromEarlierSync++; return old; }
        missing.add(metric);
        return undefined;
      };
      const views = pick('views', insights.get('post_media_view'));
      const reach = pick('reach', insights.get('post_total_media_view_unique'));
      const likes = pick('likes', summaryCount(post.reactions));
      const comments = pick('comments', summaryCount(post.comments));
      // post_video_view_time is in milliseconds and only applies to videos.
      const viewTimeMs = isVideo ? insights.get('post_video_view_time') : undefined;
      const watchTimeMinutes = isVideo ? pick('watchTimeMinutes', viewTimeMs !== undefined ? viewTimeMs / 60_000 : undefined) : undefined;
      // Meta omits `shares` when a post has never been shared, so an absent field is a real 0.
      const shares = typeof post.shares?.count === 'number' ? post.shares.count : 0;

      // Engagement rate only from measured numbers: views, reactions and comments must all be known.
      const measurable = hasMeaningfulDenominator(views) && likes !== undefined && comments !== undefined;
      const engagementRate = measurable ? Number(((((likes ?? 0) + (comments ?? 0) + shares) / views!) * 100).toFixed(2)) : 0;
      if (!measurable) missing.add('engagementRate');
      const interactions = (likes ?? 0) + (comments ?? 0) + shares;

      let tier: PerformanceTier = 'Average';
      if (engagementRate > 4.5 || interactions > 100) tier = 'Strong';
      else if (engagementRate > 2.0) tier = 'Above average';
      else if (engagementRate < 0.5 && interactions === 0 && !missing.has('likes')) tier = 'Declining';

      const text = post.message || 'Facebook Update';
      const title = text.slice(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '...' : '');

      normalizedList.push({
        id: `fb_${post.id}`,
        workspaceId: 'ws_live',
        platform: 'facebook',
        platformContentId: post.id,
        contentType,
        title,
        caption: post.message || '',
        thumbnailUrl: post.full_picture || '',
        mediaUrl: post.permalink_url,
        publishedAt: post.created_time,
        primarySignal: {
          label: 'Interactions',
          value: interactions.toString(),
          status: tier,
        },
        views: views ?? 0,
        reach: reach ?? 0,
        missingMetrics: [...missing],
        engagementRate,
        shares,
        likes: likes ?? 0,
        comments: comments ?? 0,
        ...(watchTimeMinutes !== undefined ? { watchTimeMinutes } : {}),
        explanation: { observedFact: '', possibleReason: '', whatToRepeat: [] },
        isDemo: false,
      });
    }

    const missingScopes = [...deniedPermissions];
    const missingValues = normalizedList.some((item) => item.missingMetrics?.some((metric) =>
      ['views', 'reach', 'likes', 'comments'].includes(metric) || (metric === 'watchTimeMinutes' && item.contentType === 'video')));
    if (missingScopes.length) partialReason ??= `Meta denied access requiring ${missingScopes.join(' and ')}. Reconnect with these permissions and sync again.`;
    else if (missingValues) partialReason ??= 'Meta did not return every metric for these posts. Unavailable or unsupported metrics are shown as N/A; an empty insights response does not prove a permission is missing.';
    logger.info('facebook posts read', {
      operation: 'sync', provider: 'facebook', pageRef: pageId.slice(-4), posts: allPosts.length, requests: pageCount,
      postsWithInsights, reactionsReadable, commentsReadable, insightsRequested, keptFromEarlierSync,
      unavailableMetricValues: normalizedList.reduce((n, i) => n + (i.missingMetrics?.length ?? 0), 0),
    });
    const metricPermissionsMissing = missingScopes;
    return { items: normalizedList, partialReason, metricPermissionsMissing };
  }
}

/** Common post insights; video-only watch time is fetched separately. */
const INSIGHT_METRICS = ['post_media_view', 'post_total_media_view_unique'];

/** Insight name → numeric value, only for metrics Meta actually returned with a number. */
function readInsights(data: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (!Array.isArray(data)) return out;
  for (const m of data) {
    const v = m?.values?.[0]?.value;
    if (typeof m?.name === 'string' && typeof v === 'number' && Number.isFinite(v)) out.set(m.name, v);
  }
  return out;
}

/** `reactions.summary(total_count)` / `comments.summary(total_count)`; undefined when Meta did not return a count. */
function summaryCount(edge: any): number | undefined {
  const n = edge?.summary?.total_count;
  return typeof n === 'number' ? n : undefined;
}

/** The post's format from Meta's own attachment type: video, album (carousel), or a single photo/link/status post. */
function facebookContentType(post: any): NormalizedMedia['contentType'] {
  const type = post.attachments?.data?.[0]?.media_type;
  if (type === 'video' || post.status_type === 'added_video') return 'video';
  if (type === 'album') return 'carousel';
  return 'post';
}
