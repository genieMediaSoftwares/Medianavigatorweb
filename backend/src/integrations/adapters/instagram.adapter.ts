import { MetaAuth } from '../meta/metaAuth.js';
import { InstagramClient } from '../meta/instagram/instagramClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const client = new InstagramClient();
const token = (c: ProviderCredentials) => (c.accessToken || c.apiKey || '').trim();

export const instagramAdapter: ProviderAdapter = {
  platform: 'instagram',
  capabilities: {
    platform: 'instagram',
    unavailableMetrics: ['watchTimeMinutes'],
    unsupportedContent: ['stories', 'live'],
    supportsOAuth: true,
    supportsPkce: false,
    incrementalInsights: true,
    notes: [
      'Stories and Live are not returned: the API permissions used here do not expose them.',
      'Views/reach/saves come from per-post insights where the token has insights permission; otherwise they are unknown, not zero.',
    ],
  },

  async validate(creds) {
    const v = await MetaAuth.validateToken(token(creds));
    if (v.isValid) return { isValid: true };
    const error = v.error || 'Instagram authentication failed.';
    return { isValid: false, error, kind: /expired/i.test(error) ? 'expired' : /permission/i.test(error) ? 'permission' : 'invalid' };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const a = await client.resolveAccount(token(creds), creds.accountId || creds.username || creds.channelQuery);
    return {
      providerAccountId: a.id,
      handle: `@${a.username.replace(/^@/, '')}`,
      displayName: a.name,
      avatarUrl: a.profilePictureUrl,
      accountInfo: { id: a.id, username: a.username, name: a.name, followersCount: a.followersCount, mediaCount: a.mediaCount },
      credentialsPatch: { accountId: a.id, accessToken: token(creds) },
    };
  },

  async fetchContent(creds, account, ctx) {
    const info = await client.resolveAccount(token(creds), creds.accountId || account.providerAccountId);
    const items = await client.fetchMedia(token(creds), info.id, info, ctx.existing);
    const reported = account.accountInfo.mediaCount;
    // The paginator may stop early when a page request fails; compare against the count the platform reports.
    const partialReason = reported && items.length < reported * 0.9
      ? `Fetched ${items.length} of ${reported} items reported by Instagram; the remainder may be Stories/archived or a page failed to load.`
      : undefined;
    return { items, partialReason };
  },
};
