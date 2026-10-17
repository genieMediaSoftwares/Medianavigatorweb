import { createHash } from 'node:crypto';
import { config } from '../../config/env.js';
import { httpFetch } from '../../lib/http.js';
import { ConnectError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { NormalizedMedia, PerformanceTier } from '../../../../shared/types.js';

export interface LinkedInOrgInfo {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

/** Organization roles that may read a Company Page's posts and statistics. */
const ALLOWED_ROLES = new Set(['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR', 'ANALYST', 'CURATOR']);

/** LinkedIn REST errors as a reason and a next step. The raw provider response stays out of user-facing text. */
export function describeLinkedInError(status: number, body: any, action: string): ConnectError {
  const code = String(body?.code ?? body?.serviceErrorCode ?? '');
  logger.warn('linkedin request refused', { operation: 'linkedin', status, providerCode: code, providerMessage: String(body?.message ?? '').slice(0, 300) });
  if (status === 401) {
    return /EXPIRED/i.test(code) || /expired/i.test(String(body?.message ?? ''))
      ? new ConnectError('token_expired', 'This LinkedIn access token has expired (they last 60 days). Generate a new one and connect again.')
      : new ConnectError('token_invalid', 'LinkedIn didn’t accept this access token. Copy the whole token again from the LinkedIn Developer Portal’s token generator.');
  }
  if (status === 403) {
    return new ConnectError('permission_missing', `LinkedIn refused to ${action}. The token needs the rw_organization_admin (or r_organization_admin) and r_organization_social scopes, which LinkedIn only grants after it approves the Community Management API for your app in the Developer Portal.`);
  }
  if (status === 426 || /VERSION/i.test(code)) {
    return new ConnectError('provider_unavailable', `LinkedIn no longer supports the API version this server is configured with (LINKEDIN_API_VERSION=${config.providers.linkedinApiVersion}). Set LINKEDIN_API_VERSION to a current YYYYMM version in the server configuration.`);
  }
  if (status === 429) return new ConnectError('provider_unavailable', 'LinkedIn is rate-limiting this app. Wait a few minutes and try again.');
  if (status === 404) return new ConnectError('account_not_found', `LinkedIn couldn’t find what was needed to ${action}.`);
  return new ConnectError('provider_unavailable', `LinkedIn couldn’t ${action} right now (HTTP ${status}). Please try again in a few minutes.`);
}

export class LinkedInClient {
  private readonly restBase = 'https://api.linkedin.com/rest';
  private readonly v2Base = 'https://api.linkedin.com/v2';

  private getHeaders(accessToken: string): HeadersInit {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': config.providers.linkedinApiVersion,
    };
  }

  /**
   * The LinkedIn Company Page (organization) to connect. Only an organization on which the signed-in member holds an
   * approved role is accepted, as reported by LinkedIn's organizationAcls; a typed ID is never connected unchecked, and a
   * personal profile is never used (member analytics are not available to this integration).
   */
  async resolveAccount(accessToken: string, organizationId?: string): Promise<LinkedInOrgInfo> {
    const wanted = (organizationId || '').trim().replace(/^urn:li:organization:/, '').replace(/^https?:\/\/(www\.)?linkedin\.com\/company\/([^/]+).*$/i, '$2');
    const res = await httpFetch(`${this.restBase}/organizationAcls?q=roleAssignee&state=APPROVED&count=100`, { headers: this.getHeaders(accessToken) });
    const body: any = await res.json().catch(() => null);
    if (!res.ok) throw describeLinkedInError(res.status, body, 'list the Company Pages you manage');

    const roles = new Map<string, string[]>();
    for (const e of Array.isArray(body?.elements) ? body.elements : []) {
      const urn: string | undefined = e.organization ?? e.organizationalTarget;
      const id = urn?.match(/^urn:li:organization:(\d+)$/)?.[1];
      if (id && ALLOWED_ROLES.has(e.role)) roles.set(id, [...(roles.get(id) ?? []), e.role]);
    }
    if (!roles.size) {
      throw new ConnectError('account_not_found', 'This LinkedIn account has no approved Administrator or Analyst role on any Company Page. Ask a Page admin to give you one, then generate a new token. Personal profiles can’t be connected.');
    }

    const ids = [...roles.keys()];
    const named = await Promise.all(ids.slice(0, 10).map(async (id) => ({ id, ...(await this.organization(accessToken, id)) })));
    let pick: string | undefined;
    if (wanted) {
      pick = ids.find((id) => id === wanted) ?? named.find((o) => o.vanityName?.toLowerCase() === wanted.toLowerCase())?.id;
      if (!pick) {
        throw new ConnectError('account_not_authorized', `You don’t have an approved admin or analyst role on Company Page “${wanted}”. Pages you can connect: ${named.map((o) => `${o.name} (${o.id})`).join(', ')}.`);
      }
    } else if (ids.length === 1) pick = ids[0];
    else {
      throw new ConnectError('account_selection_required', `You manage ${ids.length} Company Pages. Enter the ID of the one to connect: ${named.map((o) => `${o.name} (${o.id})`).join(', ')}.`, { field: 'organizationId' });
    }
    const org = named.find((o) => o.id === pick) ?? { id: pick, ...(await this.organization(accessToken, pick)) };
    return { id: `urn:li:organization:${pick}`, name: org.name, vanityName: org.vanityName };
  }

  /** Name of an organization the member has a role on (best effort: the ACL already proved access). */
  private async organization(accessToken: string, id: string): Promise<{ name: string; vanityName?: string }> {
    try {
      const res = await httpFetch(`${this.restBase}/organizations/${encodeURIComponent(id)}`, { headers: this.getHeaders(accessToken) });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data) return { name: data.localizedName || data.vanityName || `Company Page ${id}`, vanityName: data.vanityName };
    } catch { /* name only */ }
    return { name: `Company Page ${id}` };
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
      const res = await httpFetch(endpointTried, {
        headers: this.getHeaders(accessToken),
      });
      postsData = await res.json();

      if (!res.ok) {
        // Try fallback to v2/ugcPosts
        endpointTried = `${this.v2Base}/ugcPosts?q=authors&authors=List(${encodeURIComponent(targetUrn)})`;
        const v2Res = await httpFetch(endpointTried, {
          headers: this.getHeaders(accessToken),
        });
        postsData = await v2Res.json();

        if (!v2Res.ok) throw describeLinkedInError(res.status === 403 ? 403 : v2Res.status, postsData, 'read this Company Page’s posts');
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
      // Identity must be stable across syncs; derive it from the post content when the API gives no id.
      const postId = post.id || post.urn || `li_${createHash('sha1').update(`${post.createdAt ?? post.created?.time ?? ''}|${post.commentary ?? ''}`).digest('hex').slice(0, 16)}`;
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
        thumbnailUrl: '',
        publishedAt: post.createdAt ? new Date(post.createdAt).toISOString() : '',
        primarySignal: {
          label: 'Interactions',
          value: interactions.toString(),
          status: tier,
        },
        views: impressions,
        reach: impressions,
        engagementRate,
        // Without impressions the rate has no denominator: unknown, not 0%.
        // /rest/posts carries no statistics: counts LinkedIn didn't return are unknown, not 0.
        missingMetrics: [...(impressions > 0 ? [] : ['engagementRate', 'views']), ...(post.totalShareStatistics ? [] : ['likes', 'comments', 'shares'])],
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
