import { httpFetch } from '../../lib/http.js';
import { MetaAuth } from '../meta/metaAuth.js';
import { InstagramClient } from '../meta/instagram/instagramClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const legacyClient = new InstagramClient();
const loginClient = new InstagramClient(true);
const clientFor = (c: ProviderCredentials) => c.instagramLogin ? loginClient : legacyClient;
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

  async refreshCredentials(creds) {
    if (!creds.instagramLogin) return creds;
    const expires = Date.parse(creds.expiresAt || '');
    if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error('Instagram connection expired; reconnect required.');
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', token(creds));
    const response = await httpFetch(url, { maxRetries: 0 });
    const data = await response.json().catch(() => ({}));
    if (data.error?.code === 190 || response.status === 401) throw new Error('Instagram connection expired; reconnect required.');
    if (!response.ok || typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Instagram token refresh temporarily unavailable.');
    return { ...creds, accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() };
  },

  async validate(creds) {
    if (creds.instagramLogin) {
      try { await loginClient.resolveAccount(token(creds), creds.accountId); return { isValid: true }; }
      catch (err) { const error = err instanceof Error ? err.message : 'Instagram sign-in failed'; return { isValid: false, error, kind: /expired/i.test(error) ? 'expired' : 'permission' }; }
    }
    const v = await MetaAuth.validateToken(token(creds));
    if (v.isValid) return { isValid: true };
    const error = v.error || 'Instagram authentication failed.';
    return { isValid: false, error, kind: /expired/i.test(error) ? 'expired' : /permission|blocked|restriction/i.test(error) ? 'permission' : 'invalid' };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const a = await clientFor(creds).resolveAccount(token(creds), creds.accountId || creds.username || creds.channelQuery);
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
    const info = await clientFor(creds).resolveAccount(token(creds), creds.accountId || account.providerAccountId);
    const items = await clientFor(creds).fetchMedia(token(creds), info.id, info, ctx.existing);
    const reported = account.accountInfo.mediaCount;
    // The paginator may stop early when a page request fails; compare against the count the platform reports.
    const partialReason = reported && items.length < reported * 0.9
      ? `Fetched ${items.length} of ${reported} items reported by Instagram; the remainder may be Stories/archived or a page failed to load.`
      : undefined;
    const insights = creds.instagramLogin ? await loginClient.fetchAccountInsights(token(creds), info.id) : undefined;
    return { items, partialReason, accountInfo: { id: info.id, username: info.username, name: info.name, followersCount: info.followersCount, mediaCount: info.mediaCount, ...(insights ? { insights } : {}) } };
  },
};
