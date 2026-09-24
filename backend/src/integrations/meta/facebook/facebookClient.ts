import { MetaClient } from '../metaClient.js';
import { NormalizedMedia, PerformanceTier } from '../../../../../shared/types.js';

export interface FacebookPageInfo {
  id: string;
  name: string;
  fanCount?: number;
  followersCount?: number;
  pictureUrl?: string;
  category?: string;
}

export class FacebookClient extends MetaClient {
  /**
   * Resolves target Facebook Page
   */
  async resolvePage(accessToken: string, providedPageId?: string): Promise<FacebookPageInfo> {
    if (providedPageId && providedPageId.trim().length > 0) {
      try {
        const page = await this.get<any>(providedPageId, accessToken, {
          fields: 'id,name,fan_count,followers_count,picture,category',
        });
        return {
          id: page.id,
          name: page.name,
          fanCount: page.fan_count,
          followersCount: page.followers_count,
          pictureUrl: page.picture?.data?.url,
          category: page.category,
        };
      } catch (err: any) {
        throw new Error(`Failed to resolve Facebook Page ${providedPageId}: ${err.message}`);
      }
    }

    // Auto-discover through /me/accounts
    const accountsData = await this.get<any>('me/accounts', accessToken, {
      fields: 'id,name,fan_count,followers_count,picture,category,access_token',
    });

    if (!accountsData.data || accountsData.data.length === 0) {
      throw new Error('No managed Facebook Pages found for this user account. Ensure you have administrator or analyst access to at least one Facebook Page.');
    }

    const firstPage = accountsData.data[0];
    return {
      id: firstPage.id,
      name: firstPage.name,
      fanCount: firstPage.fan_count,
      followersCount: firstPage.followers_count,
      pictureUrl: firstPage.picture?.data?.url,
      category: firstPage.category,
    };
  }

  /**
   * Fetches real Facebook posts, videos, and insights
   */
  async fetchPosts(accessToken: string, pageId: string): Promise<NormalizedMedia[]> {
    const fields = 'id,message,created_time,full_picture,permalink_url,shares,reactions.summary(total_count),comments.summary(total_count)';
    
    // Fetch all pages using paging.next
    let allPosts: any[] = [];
    let currentUrl: string | null = `https://graph.facebook.com/v21.0/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(accessToken)}`;
    let pageCount = 0;

    while (currentUrl && pageCount < 30) {
      pageCount++;
      try {
        const res: Response = await fetch(currentUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        });
        if (!res.ok) break;
        const json: any = await res.json();
        if (json.data && Array.isArray(json.data)) {
          allPosts.push(...json.data);
        }
        if (json.paging && typeof json.paging.next === 'string' && json.paging.next.length > 0) {
          currentUrl = json.paging.next;
        } else {
          currentUrl = null;
        }
      } catch {
        break;
      }
    }

    if (allPosts.length === 0) {
      return [];
    }

    const normalizedList: NormalizedMedia[] = [];

    for (const post of allPosts) {
      const reactionsCount = post.reactions?.summary?.total_count || 0;
      const commentsCount = post.comments?.summary?.total_count || 0;
      const sharesCount = post.shares?.count || 0;
      const totalInteractions = reactionsCount + commentsCount + sharesCount;

      let postImpressions = 0;
      let postEngagedUsers = 0;

      // Query post insights if permissions allow
      try {
        const insightsRes = await this.get<any>(`${post.id}/insights`, accessToken, {
          metric: 'post_impressions,post_engaged_users',
        });
        if (insightsRes.data && Array.isArray(insightsRes.data)) {
          for (const item of insightsRes.data) {
            const val = item.values?.[0]?.value || 0;
            if (item.name === 'post_impressions') postImpressions = val;
            if (item.name === 'post_engaged_users') postEngagedUsers = val;
          }
        }
      } catch {
        // Leave at 0 if restricted by Facebook API permissions
      }

      const divisor = postImpressions > 0 ? postImpressions : (reactionsCount + commentsCount > 0 ? (reactionsCount + commentsCount) * 15 : 100);
      const engagementRate = Number(((totalInteractions / divisor) * 100).toFixed(2));

      let tier: PerformanceTier = 'Average';
      if (engagementRate > 4.5 || totalInteractions > 100) tier = 'Strong';
      else if (engagementRate > 2.0) tier = 'Above average';
      else if (engagementRate < 0.5 && totalInteractions === 0) tier = 'Declining';

      const text = post.message || 'Facebook Update';
      const title = text.slice(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '...' : '');

      normalizedList.push({
        id: `fb_${post.id}`,
        workspaceId: 'ws_live',
        platform: 'facebook',
        platformContentId: post.id,
        contentType: 'post',
        title,
        caption: post.message || '',
        thumbnailUrl: post.full_picture || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80',
        mediaUrl: post.permalink_url,
        publishedAt: post.created_time,
        primarySignal: {
          label: 'Interactions',
          value: totalInteractions.toString(),
          status: tier,
        },
        views: postImpressions,
        reach: postEngagedUsers,
        engagementRate,
        shares: sharesCount,
        likes: reactionsCount,
        comments: commentsCount,
        explanation: {
          observedFact: postImpressions > 0
            ? `Achieved ${postImpressions.toLocaleString()} impressions with ${reactionsCount} reactions and ${commentsCount} comments.`
            : `Achieved ${reactionsCount} reactions, ${commentsCount} comments, and ${sharesCount} shares on Facebook.`,
          possibleReason: `Post drove ${totalInteractions} verified community actions.`,
          whatToRepeat: [
            'Direct community conversation prompts',
            'Authentic updates',
          ],
        },
        isDemo: false,
      });
    }

    return normalizedList;
  }
}
