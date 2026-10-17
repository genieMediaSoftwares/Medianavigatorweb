import { MetaAuth } from '../meta/metaAuth.js';
import { FacebookClient } from '../meta/facebook/facebookClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const client = new FacebookClient('facebook');
/** Needed to list the Pages a user token manages and read their posts. */
const REQUIRED_SCOPES = ['pages_show_list', 'pages_read_engagement'];
const token = (c: ProviderCredentials) => (c.accessToken || '').trim();

export const facebookAdapter: ProviderAdapter = {
  platform: 'facebook',
  capabilities: {
    platform: 'facebook',
    // Watch time exists only for videos; the client marks it unavailable per post where it does not apply.
    unavailableMetrics: ['saves'],
    unsupportedContent: ['stories', 'live'],
    supportsOAuth: true,
    supportsPkce: false,
    incrementalInsights: false,
    notes: ['Page posts only. Personal profiles are not available through the Graph API.', 'Insights require read_insights. Include pages_read_engagement and pages_read_user_content for engagement and comments; Meta may restrict individual edges or metrics. Video watch time applies only to video posts.'],
  },

  async validate(creds) {
    const v = await MetaAuth.validateToken(token(creds), 'facebook');
    if (v.isValid) {
      // A user token reports what was granted: name the missing permission now instead of failing on the Page lookup.
      const missing = v.scopesVerified ? REQUIRED_SCOPES.filter((s) => !v.scopes.includes(s)) : [];
      if (missing.length) {
        return { isValid: false, reason: 'permission_missing', kind: 'permission', error: `This token was generated without ${missing.join(' and ')}. In Graph API Explorer, add ${missing.join(', ')} under Permissions, click Generate Access Token, select your Page when Meta asks which Pages to share, then connect again.` };
      }
      return { isValid: true };
    }
    const reason = v.reason ?? 'token_invalid';
    return { isValid: false, error: v.error || 'Facebook authentication failed.', reason, kind: reason === 'token_expired' ? 'expired' : reason === 'permission_missing' || reason === 'app_restricted' ? 'permission' : 'invalid' };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const page = await client.resolvePage(token(creds), creds.pageId);
    return {
      providerAccountId: page.id,
      handle: page.name,
      displayName: page.name,
      avatarUrl: page.pictureUrl,
      accountInfo: { id: page.id, name: page.name, followersCount: page.followersCount || page.fanCount },
      credentialsPatch: { pageId: page.id, pageAccessToken: page.pageAccessToken },
    };
  },

  async fetchContent(creds, account, ctx) {
    // Use the original User token for permission inspection; Page tokens do not expose /me/permissions.
    const permissions = await MetaAuth.grantedPermissions(token(creds));
    return client.fetchPosts(token(creds), account.providerAccountId, creds.pageAccessToken, ctx.existing, permissions ?? undefined);
  },
};
