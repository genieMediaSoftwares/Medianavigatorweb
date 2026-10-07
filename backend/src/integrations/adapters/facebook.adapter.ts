import { MetaAuth } from '../meta/metaAuth.js';
import { FacebookClient } from '../meta/facebook/facebookClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const client = new FacebookClient();
const token = (c: ProviderCredentials) => (c.accessToken || '').trim();

export const facebookAdapter: ProviderAdapter = {
  platform: 'facebook',
  capabilities: {
    platform: 'facebook',
    unavailableMetrics: ['watchTimeMinutes', 'saves'],
    unsupportedContent: ['stories', 'live'],
    supportsOAuth: true,
    supportsPkce: false,
    incrementalInsights: false,
    notes: ['Page posts only. Personal profiles are not available through the Graph API.', 'Impressions/reach require the read_insights permission.'],
  },

  async validate(creds) {
    const v = await MetaAuth.validateToken(token(creds));
    if (v.isValid) return { isValid: true };
    const error = v.error || 'Facebook authentication failed.';
    return { isValid: false, error, kind: /expired/i.test(error) ? 'expired' : /permission/i.test(error) ? 'permission' : 'invalid' };
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

  async fetchContent(creds, account) {
    const items = await client.fetchPosts(token(creds), account.providerAccountId, creds.pageAccessToken);
    return { items };
  },
};
