import { NormalizedMedia, PerformanceTier } from '../../../../shared/types.js';

export interface LinkedInOrgInfo {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

export class LinkedInClient {
  private readonly restBase = 'https://api.linkedin.com/rest';
  private readonly v2Base = 'https://api.linkedin.com/v2';

  private getHeaders(accessToken: string): HeadersInit {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    };
  }

  /**
   * Resolves target organization or personal profile
   */
  async resolveAccount(accessToken: string, organizationId?: string): Promise<LinkedInOrgInfo> {
    if (organizationId && organizationId.trim().length > 0) {
      const cleanId = organizationId.replace('urn:li:organization:', '');
      try {
        const res = await fetch(`${this.restBase}/organizations/${cleanId}`, {
          headers: this.getHeaders(accessToken),
        });
        const data = await res.json();
        if (res.ok && data) {
          return {
            id: `urn:li:organization:${cleanId}`,
            name: data.localizedName || data.vanityName || `Organization ${cleanId}`,
            vanityName: data.vanityName,
          };
        }
      } catch {
        // Fallback to basic struct
      }
      return {
        id: `urn:li:organization:${cleanId}`,
        name: `Organization (${cleanId})`,
      };
    }

    // Try finding organizationalEntityAcls to find organizations user manages
    try {
      const aclRes = await fetch(`${this.v2Base}/organizationalEntityAcls?q=roleAssignee`, {
        headers: this.getHeaders(accessToken),
      });
      const aclData = await aclRes.json();
      if (aclRes.ok && aclData.elements && aclData.elements.length > 0) {
        const firstOrg = aclData.elements[0].organizationalTarget;
        return {
          id: firstOrg,
          name: 'Connected LinkedIn Page',
        };
      }
    } catch {
      // ignore
    }

    // Default to user's member account
    return {
      id: 'urn:li:person:me',
      name: 'LinkedIn Member Profile',
    };
  }

  /**
   * Fetches real posts and share statistics
   */
  async fetchPosts(accessToken: string, targetUrn: string): Promise<NormalizedMedia[]> {
    // Attempt fetching posts via UGC or rest/posts
    let postsData: any = null;
    let endpointTried = '';

    try {
      const authorParam = encodeURIComponent(targetUrn);
      endpointTried = `${this.restBase}/posts?author=${authorParam}&q=author&count=20`;
      const res = await fetch(endpointTried, {
        headers: this.getHeaders(accessToken),
      });
      postsData = await res.json();

      if (!res.ok) {
        // Try fallback to v2/ugcPosts
        endpointTried = `${this.v2Base}/ugcPosts?q=authors&authors=List(${encodeURIComponent(targetUrn)})`;
        const v2Res = await fetch(endpointTried, {
          headers: this.getHeaders(accessToken),
        });
        postsData = await v2Res.json();

        if (!v2Res.ok) {
          const errorMsg = postsData.message || postsData.errorDetails?.message || `HTTP ${v2Res.status}`;
          if (v2Res.status === 403 || res.status === 403) {
            throw new Error(`LinkedIn returned an authorization error. Please verify that your LinkedIn account has the required organization permissions (r_organization_social or Community Management access). [Detail: ${errorMsg}]`);
          }
          throw new Error(`LinkedIn post retrieval error: ${errorMsg}`);
        }
      }
    } catch (err: any) {
      throw err;
    }

    const items = postsData.elements || [];
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const normalizedList: NormalizedMedia[] = [];

    for (const post of items) {
      const postId = post.id || post.urn || `li_${Math.random()}`;
      const text = post.commentary || post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || 'LinkedIn Post';
      const title = text.slice(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '...' : '');

      // LinkedIn API permissions heavily restrict direct engagement numbers without Enterprise Marketing Developer approval.
      // We read real counts if present, otherwise 0:
      const likes = post.totalShareStatistics?.likeCount || 0;
      const comments = post.totalShareStatistics?.commentCount || 0;
      const shares = post.totalShareStatistics?.shareCount || 0;
      const impressions = post.totalShareStatistics?.impressionCount || 0;
      const clicks = post.totalShareStatistics?.clickCount || 0;

      const interactions = likes + comments + shares + clicks;
      const engagementRate = impressions > 0 ? Number(((interactions / impressions) * 100).toFixed(2)) : 0;

      let tier: PerformanceTier = 'Average';
      if (engagementRate > 3.0 || interactions > 50) tier = 'Strong';
      else if (engagementRate > 1.5) tier = 'Above average';
      else if (interactions === 0) tier = 'Average';

      normalizedList.push({
        id: `li_${postId}`,
        workspaceId: 'ws_live',
        platform: 'linkedin',
        platformContentId: postId,
        contentType: 'post',
        title,
        caption: text,
        thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
        publishedAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
        primarySignal: {
          label: 'Interactions',
          value: interactions.toString(),
          status: tier,
        },
        views: impressions,
        reach: impressions,
        engagementRate,
        shares,
        likes,
        comments,
        explanation: {
          observedFact: impressions > 0
            ? `Generated ${impressions.toLocaleString()} professional impressions with ${interactions} member interactions.`
            : `Published to LinkedIn with ${interactions} logged member interactions.`,
          possibleReason: 'Professional network engagement reflects topical industry authority.',
          whatToRepeat: [
            'Industry thought leadership insights',
            'Clear professional takeaways',
          ],
        },
        isDemo: false,
      });
    }

    return normalizedList;
  }
}
