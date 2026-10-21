import { httpFetch } from '../../lib/http.js';
import { ConnectError } from '../../lib/errors.js';
import { MetaApiError } from '../meta/metaErrors.js';
import { MetaAuth } from '../meta/metaAuth.js';
import { InstagramClient } from '../meta/instagram/instagramClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const legacyClient = new InstagramClient();
const loginClient = new InstagramClient(true);
const clientFor = (c: ProviderCredentials) => c.instagramLogin ? loginClient : legacyClient;
/** Needed for legacy Facebook Login tokens. */
const REQUIRED_SCOPES = ['instagram_basic', 'pages_show_list'];
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
      catch (err) {
        const error = err instanceof Error ? err.message : 'Instagram sign-in failed';
        const reason = err instanceof ConnectError || err instanceof MetaApiError ? err.reason : undefined;
        return { isValid: false, error, reason, kind: reason === 'token_expired' || /expired/i.test(error) ? 'expired' : 'permission' };
      }
    }
    const v = await MetaAuth.validateToken(token(creds), 'instagram');
    if (v.isValid) {
      // A Facebook user token reports what was granted: say exactly which required permission is missing, rather than
      // failing later with "no Instagram account found".
      const missing = v.scopesVerified ? REQUIRED_SCOPES.filter((s) => !v.scopes.includes(s)) : [];
      if (missing.length) {
        return { isValid: false, reason: 'permission_missing', kind: 'permission', error: `This token was generated without ${missing.join(' and ')}. In Graph API Explorer add ${missing.join(', ')} (with instagram_manage_insights and pages_read_engagement), generate a new token and select the Facebook Page linked to your Instagram account.` };
      }
      return { isValid: true };
    }
    const reason = v.reason ?? 'token_invalid';
    return { isValid: false, error: v.error || 'Instagram authentication failed.', reason, kind: reason === 'token_expired' ? 'expired' : reason === 'permission_missing' || reason === 'app_restricted' ? 'permission' : 'invalid' };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const a = await clientFor(creds).resolveAccount(token(creds), creds.accountId || creds.username || creds.channelQuery);
    return {
      providerAccountId: a.id,
      handle: `@${a.username.replace(/^@/, '')}`,
      displayName: a.name,
      avatarUrl: a.profilePictureUrl,
      accountInfo: { id: a.id, username: a.username, name: a.name, followersCount: a.followersCount, followsCount: a.followsCount, mediaCount: a.mediaCount },
      credentialsPatch: { accountId: a.id, accessToken: token(creds) },
    };
  },

  async fetchContent(creds, account, ctx) {
    const info = await clientFor(creds).resolveAccount(token(creds), creds.accountId || account.providerAccountId);
    const listing = { complete: false };
    const items = await clientFor(creds).fetchMedia(token(creds), info.id, info, ctx.existing, listing);
    // Instagram's profile `media_count` can be higher than what its /media edge returns, and the API says nothing about
    // the difference. Only a listing that was read to its last page counts as complete; a cut-off listing makes the run
    // partial, and the already-stored posts are kept.
    const partialReason = listing.complete ? undefined
      : `Instagram stopped returning posts after ${items.length}. The posts already received were saved; sync again to read the rest.`;
    const insights = creds.instagramLogin ? await loginClient.fetchAccountInsights(token(creds), info.id) : undefined;
    return {
      items, partialReason,
      accountInfo: {
        id: info.id, username: info.username, name: info.name, followersCount: info.followersCount, followsCount: info.followsCount, mediaCount: info.mediaCount,
        mediaListComplete: listing.complete,
        // How many posts Instagram's API returned for this account, known only when every page was read.
        accessibleMediaCount: listing.complete ? items.length : null,
        mediaListCheckedAt: new Date().toISOString(),
        ...(insights ? { insights } : {}),
      },
    };
  },
};
