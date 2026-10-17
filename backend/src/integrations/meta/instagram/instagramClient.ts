import { config } from '../../../config/env.js';
import { httpFetch } from '../../../lib/http.js';
import { ConnectError, type ConnectFailureReason } from '../../../lib/errors.js';
import { MetaClient } from '../metaClient.js';
import { describeMetaError, MetaApiError } from '../metaErrors.js';

const IG_FIELDS = 'id,username,name,profile_picture_url,followers_count,follows_count,media_count';
/** Refusals no other lookup can get around. */
const FINAL = new Set<ConnectFailureReason>(['token_invalid', 'token_expired', 'app_restricted', 'provider_unavailable']);
import { NormalizedMedia, PerformanceTier } from '../../../../../shared/types.js';

export interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
  pageAccessToken?: string;
}

export class InstagramClient extends MetaClient {
  protected override readonly baseUrl: string;
  constructor(private readonly instagramLogin = false) {
    super('instagram');
    this.baseUrl = `https://${instagramLogin ? 'graph.instagram.com' : 'graph.facebook.com'}/${config.providers.metaApiVersion}`;
  }

  async fetchAccountInsights(accessToken: string, accountId: string) {
    const until = Math.floor(Date.now() / 1000);
    const since = until - 28 * 86400;
    const metrics: Record<string, number> = {};
    const unavailable: string[] = [];
    for (const metric of ['views', 'reach', 'accounts_engaged', 'total_interactions']) {
      try {
        const result = await this.get<any>(`${accountId}/insights`, accessToken, { metric, period: 'day', metric_type: 'total_value', since: String(since), until: String(until) });
        const value = result.data?.find((entry: any) => entry.name === metric)?.total_value?.value;
        if (typeof value === 'number' && Number.isFinite(value)) metrics[metric] = value;
        else unavailable.push(metric);
      } catch (error) {
        if (error instanceof Error && /expired/i.test(error.message)) throw error;
        unavailable.push(metric);
      }
    }
    return { since: new Date(since * 1000).toISOString(), until: new Date(until * 1000).toISOString(), fetchedAt: new Date().toISOString(), metrics, unavailable };
  }

  /**
   * Discovers the Instagram Account connected to the user/page token
   */
  /**
   * The Instagram professional account this token is authorized for. A handle or ID the user typed is only accepted when
   * it is one of the token's own accounts; it never relabels another account and never "connects" someone else's public
   * profile. Also called on every sync with the stored account ID.
   */
  async resolveAccount(accessToken: string, providedAccountId?: string): Promise<InstagramAccountInfo> {
    if (this.instagramLogin) {
      const me = await this.get<any>('me', accessToken, { fields: 'user_id,username,name,profile_picture_url,followers_count,follows_count,media_count' });
      if (!me.user_id || !me.username) throw new ConnectError('account_not_found', 'Instagram did not return a professional account. Please reconnect with a Business or Creator account.');
      if (providedAccountId && String(me.user_id) !== providedAccountId) throw new ConnectError('account_not_authorized', 'Instagram returned a different account. Please reconnect.');
      return { id: String(me.user_id), username: me.username, name: me.name, profilePictureUrl: me.profile_picture_url, followersCount: me.followers_count, followsCount: me.follows_count, mediaCount: me.media_count };
    }
    const cleanHandle = (providedAccountId || '')
      .trim()
      .replace(/^@/, '')
      .replace(/https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/.*$/, '')
      .trim();
    const matches = (...ids: Array<string | undefined>) => ids.some((v) => v && v.toLowerCase() === cleanHandle.toLowerCase());
    // The first refusal that no other lookup can get around (bad, expired or blocked token); reported if nothing works.
    let finalError: MetaApiError | null = null;
    const note = (err: unknown) => { if (err instanceof MetaApiError && FINAL.has(err.reason)) finalError ??= err; };
    const info = (ig: any, pageToken: string | undefined, fallbackName?: string): InstagramAccountInfo => ({
      id: ig.id,
      username: ig.username || fallbackName || ig.id,
      name: ig.name || ig.username || fallbackName || ig.id,
      profilePictureUrl: ig.profile_picture_url,
      followersCount: ig.followers_count,
      followsCount: ig.follows_count,
      mediaCount: ig.media_count,
      pageAccessToken: pageToken,
    });

    // 1. A Page access token: /me is the Page, with its linked Instagram account.
    try {
      const meData = await this.get<any>('me', accessToken, { fields: `id,name,access_token,instagram_business_account{${IG_FIELDS}}` });
      const ig = meData?.instagram_business_account;
      if (ig?.id && (!cleanHandle || matches(ig.username, ig.id))) return info(ig, meData.access_token || accessToken, meData.name);
    } catch (err) { note(err); }

    // 2. A User token: the Instagram accounts linked to the Facebook Pages it manages.
    let linked: Array<{ ig: any; page: any }> = [];
    if (!finalError) {
      try {
        const accountsData = await this.get<any>('me/accounts', accessToken, { fields: `id,name,access_token,instagram_business_account{${IG_FIELDS}}`, limit: '100' });
        linked = (Array.isArray(accountsData.data) ? accountsData.data : []).filter((p: any) => p.instagram_business_account?.id).map((page: any) => ({ ig: page.instagram_business_account, page }));
      } catch (err) { note(err); }
    }
    if (linked.length) {
      const pick = cleanHandle ? linked.find((l) => matches(l.ig.username, l.ig.id)) : linked.length === 1 ? linked[0] : undefined;
      if (pick) return info(pick.ig, pick.page.access_token || accessToken, pick.page.name);
      const list = linked.slice(0, 10).map((l) => `@${l.ig.username ?? '?'} (${l.ig.id})`).join(', ');
      if (!cleanHandle) throw new ConnectError('account_selection_required', `This token covers ${linked.length} Instagram accounts. Enter the ID of the one to connect: ${list}.`, { field: 'accountId' });
    }

    // 3. An Instagram Login token (graph.instagram.com). Its `user_id` is the professional account ID.
    // Skipped once the token is known to be a Facebook token (it listed Pages).
    if (!linked.length && (!finalError || accessToken.startsWith('IG'))) {
      try {
        const igRes = await httpFetch(`https://graph.instagram.com/${config.providers.metaApiVersion}/me?fields=id,user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count&access_token=${encodeURIComponent(accessToken)}`);
        const igData = await igRes.json().catch(() => null);
        if (igRes.ok && igData?.username && (igData.user_id || igData.id)) {
          const id = igData.user_id || igData.id;
          if (!cleanHandle || matches(igData.username, id, igData.id)) {
            return { ...info({ ...igData, id }, undefined), username: igData.username || id };
          }
          throw new ConnectError('account_not_authorized', `This token is for @${igData.username}, not for “${cleanHandle}”. Leave the account field empty, or generate a token while signed in to “${cleanHandle}”.`);
        }
        if (accessToken.startsWith('IG')) finalError = describeMetaError('instagram', igData, igRes.status);
      } catch (err) {
        if (err instanceof ConnectError) throw err;
        note(err);
      }
    }

    // 4. A numeric account ID the token can read (Graph only answers for accounts the token has access to).
    if (cleanHandle && /^\d+$/.test(cleanHandle) && !finalError) {
      try {
        const direct = await this.get<any>(cleanHandle, accessToken, { fields: IG_FIELDS });
        if (direct?.id && direct.username) return info(direct, undefined);
      } catch (err) { note(err); }
    }

    if (finalError) throw finalError;
    if (cleanHandle && linked.length) {
      const list = linked.slice(0, 10).map((l) => `@${l.ig.username ?? '?'} (${l.ig.id})`).join(', ');
      throw new ConnectError('account_not_authorized', `“${cleanHandle}” isn’t one of the Instagram accounts this token is authorized for (${list}). Media Navigator only connects accounts you authorize.`);
    }
    throw new ConnectError('account_not_found',
      `Could not find an Instagram professional account for ${cleanHandle ? `“${cleanHandle}”` : 'this token'}. Check that: 1) the Instagram account is a Business or Creator account, ` +
      `2) it is linked to a Facebook Page you manage (or use an Instagram Login token), and 3) the token has instagram_basic, instagram_manage_insights and pages_show_list, with that Page selected when Meta asks which Pages to share.`);
  }

  /**
   * Fetches real media and real insights from Instagram Graph API across ALL pages
   */
  async fetchMedia(
    accessToken: string, 
    instagramAccountId: string, 
    accountInfo?: InstagramAccountInfo,
    existingMediaMap?: Map<string, NormalizedMedia>
  ): Promise<NormalizedMedia[]> {
    let rawItems: any[] = [];
    const fields = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}';

    const effectiveToken = accountInfo?.pageAccessToken || accessToken;

    // Helper to fetch all pages following paging.next recursively without partial cutoff
    const fetchAllPages = async (initialUrl: string, maxPages: number = config.providers.maxPages): Promise<any[]> => {
      const items: any[] = [];
      let currentUrl: string | null = initialUrl;
      let page = 0;

      while (currentUrl && page < maxPages) {
        page++;
        // A failed page used to end the listing silently, dropping every later post. Retry it, and with smaller pages
        // (Instagram rejects large nested-field pages with "reduce the amount of data") before giving up.
        let json: any = null;
        let url: string = currentUrl;
        for (let attempt = 0; attempt < 4 && !json; attempt++) {
          try {
            const res: Response = await httpFetch(url, { headers: { 'Authorization': `Bearer ${effectiveToken}` } });
            if (res.ok) { json = await res.json(); break; }
            const status = res.status;
            if (status === 400 || status === 500) {
              const limit = Number(new URL(url).searchParams.get('limit') ?? 0);
              if (limit > 10) { const u = new URL(url); u.searchParams.set('limit', String(Math.max(10, Math.floor(limit / 2)))); url = u.toString(); }
            } else if (status === 401 || status === 403) break;
          } catch { /* network blip: retry */ }
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
        if (!json) break;
        if (json.data && Array.isArray(json.data)) items.push(...json.data);
        currentUrl = json.paging?.next ?? null;
      }
      return items;
    };

    if (this.instagramLogin) {
      // Stay on the Instagram host for every page; never send an Instagram token to a Facebook endpoint.
      let after: string | undefined;
      let pages = 0;
      do {
        const page: any = await this.get<any>(`${instagramAccountId}/media`, effectiveToken, { fields, limit: '50', ...(after ? { after } : {}) });
        rawItems.push(...(page.data ?? []));
        after = page.paging?.next ? page.paging?.cursors?.after : undefined;
        if (page.paging?.next && !after) throw new Error('Instagram returned an incomplete pagination cursor. Please retry syncing.');
        pages++;
      } while (after && pages < config.providers.maxPages);
      if (after) throw new Error('Instagram sync reached the configured page limit. Ask the administrator to increase PROVIDER_MAX_PAGES.');
    } else {
    // Strategy 2: Fetch from graph.facebook.com /{id}/media (All Reels, Posts, Carousels)
    if (rawItems.length === 0 && /^\d+$/.test(instagramAccountId)) {
      try {
        const initialUrl = `https://graph.facebook.com/${config.providers.metaApiVersion}/${instagramAccountId}/media?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;
        const pagedItems = await fetchAllPages(initialUrl, 100);
        if (pagedItems.length > 0) {
          rawItems = pagedItems;
        }
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 3: Check /me/media on graph.facebook.com
    if (rawItems.length === 0) {
      try {
        const initialUrl = `https://graph.facebook.com/${config.providers.metaApiVersion}/me/media?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;
        const pagedItems = await fetchAllPages(initialUrl, 50);
        if (pagedItems.length > 0) {
          rawItems = pagedItems;
        }
      } catch {
        // Fall through
      }
    }

    // Strategy 4: Check graph.instagram.com/v21.0/me/media (Instagram Graph API for Creators)
    if (rawItems.length === 0) {
      try {
        const igFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}';
        const initialUrl = `https://graph.instagram.com/${config.providers.metaApiVersion}/me/media?fields=${encodeURIComponent(igFields)}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;
        const pagedItems = await fetchAllPages(initialUrl, 50);
        if (pagedItems.length > 0) {
          rawItems = pagedItems;
        }
      } catch {
        // Fall through
      }
    }

    // Strategy 5: Fetch from graph.instagram.com /me/media with like_count, comments_count fallback
    if (rawItems.length === 0) {
      try {
        const basicWithStats = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}';
        const initialUrl = `https://graph.instagram.com/me/media?fields=${encodeURIComponent(basicWithStats)}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;
        const pagedItems = await fetchAllPages(initialUrl, 50);
        if (pagedItems.length > 0) {
          rawItems = pagedItems;
        }
      } catch {
        // Try without like_count/comments_count if endpoint is older basic display
        try {
          const basicFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}';
          const initialUrl = `https://graph.instagram.com/me/media?fields=${encodeURIComponent(basicFields)}&limit=100&access_token=${encodeURIComponent(effectiveToken)}`;
          const pagedItems = await fetchAllPages(initialUrl, 50);
          if (pagedItems.length > 0) {
            rawItems = pagedItems;
          }
        } catch {
          // Fall through
        }
      }
    }

    }

    if (rawItems.length === 0) {
      return [];
    }

    // Deduplicate by item ID
    const seenIds = new Set<string>();
    const uniqueRawItems = rawItems.filter((it) => {
      if (!it.id || seenIds.has(it.id)) return false;
      seenIds.add(it.id);
      return true;
    });

    /**
     * Resilient insights retriever with fast permission-detection
     */
    let insightsSupported = true;

    const fetchItemInsights = async (itemId: string, isVideoOrReel: boolean): Promise<{
      views: number;
      reach: number;
      impressions: number;
      saved: number;
      shares: number;
      hasRealInsights: boolean;
      /** Metric names Instagram actually returned a value for. */
      measured: Set<string>;
    }> => {
      let views = 0;
      let reach = 0;
      let impressions = 0;
      let saved = 0;
      let shares = 0;
      let hasRealInsights = false;
      const measured = new Set<string>();

      if (!insightsSupported) {
        return { views, reach, impressions, saved, shares, hasRealInsights, measured };
      }

      // Most complete group first; narrower groups when a metric is not offered for this media type.
      void isVideoOrReel;
      const metricGroups = ['views,reach,saved,shares', 'reach,saved,shares', 'reach'];

      for (const metrics of metricGroups) {
        if (!insightsSupported) break;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), config.providers.timeoutMs);

          let res = await httpFetch(
            `${this.baseUrl}/${itemId}/insights?metric=${metrics}&access_token=${encodeURIComponent(effectiveToken)}`,
            { signal: controller.signal }
          );
          if (!res.ok && !this.instagramLogin) {
            const errData = await res.json().catch(() => null);
            if (errData?.error?.code === 10 || errData?.error?.message?.includes('permission')) {
              insightsSupported = false;
              clearTimeout(timeout);
              break;
            }
            res = await httpFetch(
              `https://graph.instagram.com/${config.providers.metaApiVersion}/${itemId}/insights?metric=${metrics}&access_token=${encodeURIComponent(effectiveToken)}`,
              { signal: controller.signal }
            );
          }
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            if (data?.error?.code === 10) {
              insightsSupported = false;
              break;
            }
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              for (const m of data.data) {
                // Support both new lifetime 'total_value.value' and legacy 'values[0].value'
                const val = typeof m.total_value?.value === 'number'
                  ? m.total_value.value
                  : (typeof m.values?.[0]?.value === 'number' ? m.values[0].value : (typeof m.value === 'number' ? m.value : 0));

                // `plays` is Instagram's older name for reel views. Impressions are a different measure and are never used as views.
                if (m.name === 'views' || m.name === 'plays') { views = val; measured.add('views'); }
                if (m.name === 'impressions') { impressions = val; measured.add('impressions'); }
                if (m.name === 'reach') { reach = val; measured.add('reach'); }
                if (m.name === 'saved') { saved = val; measured.add('saved'); }
                if (m.name === 'shares') { shares = val; measured.add('shares'); }
                hasRealInsights = true;
              }
              break;
            }
          }
        } catch {
          // Try next group
        }
      }

      return { views, reach, impressions, saved, shares, hasRealInsights, measured };
    };

    // Process all items in concurrent batches of 10
    const processBatch = async (batch: any[]): Promise<NormalizedMedia[]> => {
      return Promise.all(
        batch.map(async (item): Promise<NormalizedMedia> => {
          const likes = typeof item.like_count === 'number' ? item.like_count : 0;
          const comments = typeof item.comments_count === 'number' ? item.comments_count : 0;
          const interactions = likes + comments;

          const isReel = item.media_product_type === 'REELS' || item.media_type === 'VIDEO';
          const isCarousel = item.media_type === 'CAROUSEL_ALBUM';

          // Best image URL: check thumbnail, direct media_url, or first child
          const childMedia = item.children?.data?.[0];
          const bestImageUrl = item.thumbnail_url || 
            item.media_url || 
            childMedia?.thumbnail_url || 
            childMedia?.media_url ||
            '';

          // Reuse already-verified numbers only for posts older than 30 days that were stored by this
          // version (they carry `missingMetrics`); newer posts get fresh insights on every sync.
          const existing = existingMediaMap?.get(item.id) || existingMediaMap?.get(`ig_${item.id}`);
          const ageDays = item.timestamp ? (Date.now() - Date.parse(item.timestamp)) / 86_400_000 : Infinity;
          const reuse = Boolean(existing && Array.isArray(existing.missingMetrics) && ageDays > 30);

          let views = 0;
          let reach = 0;
          let shares = 0;
          const missingInsights: string[] = [];
          if (reuse && existing) {
            views = existing.views;
            reach = existing.reach;
            shares = existing.shares;
            for (const m of existing.missingMetrics ?? []) if (['views', 'reach', 'shares', 'engagementRate'].includes(m)) missingInsights.push(m);
          } else {
            const insights = await fetchItemInsights(item.id, isReel);
            views = insights.views;
            reach = insights.reach;
            shares = insights.shares;
            // Anything Instagram did not return stays unavailable: never estimated, never borrowed from another metric.
            if (!insights.measured.has('views')) missingInsights.push('views');
            if (!insights.measured.has('reach')) missingInsights.push('reach');
            if (!insights.measured.has('shares')) missingInsights.push('shares');
          }

          let contentType: NormalizedMedia['contentType'] = 'post';
          if (isReel) {
            contentType = 'reel';
          } else if (isCarousel) {
            contentType = 'carousel';
          }

          // Engagement rate = interactions / reach (or / views) × 100, only when that denominator was measured.
          const divisor = !missingInsights.includes('reach') && reach > 0 ? reach : !missingInsights.includes('views') && views > 0 ? views : 0;
          const engagementRate = divisor > 0 ? Number(((interactions / divisor) * 100).toFixed(2)) : 0;
          if (divisor === 0 && !missingInsights.includes('engagementRate')) missingInsights.push('engagementRate');

          let tier: PerformanceTier = 'Average';
          if (engagementRate > 5.5 || interactions > 250 || views > 10000) tier = 'Strong';
          else if (engagementRate > 3.2 || interactions > 80 || views > 4000) tier = 'Above average';
          else if (engagementRate < 1.0 && interactions < 5) tier = 'Declining';

          const observedFact = views > 0
            ? `Generated ${views.toLocaleString()} verified ${isReel ? 'video views/plays' : 'views'} across ${reach > 0 ? `${reach.toLocaleString()} reach` : 'audience feed'} with ${likes.toLocaleString()} likes and ${comments.toLocaleString()} comments.`
            : `Generated ${likes.toLocaleString()} likes and ${comments.toLocaleString()} comments on Instagram.`;

          return {
            id: `ig_${item.id}`,
            workspaceId: 'ws_live',
            platform: 'instagram',
            platformContentId: item.id,
            contentType,
            title: item.caption 
              ? item.caption.slice(0, 70).replace(/\n/g, ' ') + (item.caption.length > 70 ? '...' : '') 
              : `${contentType === 'reel' ? 'Instagram Reel' : (contentType === 'carousel' ? 'Instagram Carousel' : 'Instagram Post')}`,
            caption: item.caption || '',
            thumbnailUrl: bestImageUrl,
            mediaUrl: item.permalink || item.media_url,
            ...(item.media_type === 'VIDEO' && item.media_url ? { videoUrl: item.media_url } : {}),
            publishedAt: item.timestamp || '',
            primarySignal: {
              label: 'Verified Views',
              value: views > 0 ? views.toLocaleString() : `${likes.toLocaleString()} likes`,
              status: tier,
            },
            views,
            reach,
            engagementRate,
            shares,
            likes,
            comments,
            explanation: {
              observedFact,
              possibleReason: `${contentType.toUpperCase()} format achieved ${views > 0 ? `${views.toLocaleString()} views and ` : ''}${interactions.toLocaleString()} verified audience interactions.`,
              whatToRepeat: [
                `${contentType.toUpperCase()} visual pacing & hook`,
                'High-converting caption structure',
              ],
            },
            isDemo: false,
            missingMetrics: [...(typeof item.like_count === 'number' ? [] : ['likes']), ...(typeof item.comments_count === 'number' ? [] : ['comments']), ...missingInsights],
          };
        })
      );
    };

    const normalizedList: NormalizedMedia[] = [];
    const BATCH_SIZE = 25;
    for (let i = 0; i < uniqueRawItems.length; i += BATCH_SIZE) {
      const batch = uniqueRawItems.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch);
      normalizedList.push(...batchResults);
    }

    return normalizedList;
  }
}
