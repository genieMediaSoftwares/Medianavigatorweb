import { YouTubeClient } from '../youtube/youtubeClient.js';
import { httpFetch } from '../../lib/http.js';
import { config } from '../../config/env.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const client = new YouTubeClient();

export const youtubeAdapter: ProviderAdapter = {
  platform: 'youtube',
  capabilities: {
    platform: 'youtube',
    unavailableMetrics: ['reach', 'shares', 'saves'],
    unsupportedContent: ['posts', 'live-chat'],
    supportsOAuth: true,
    supportsPkce: true,
    incrementalInsights: false,
    notes: [
      'Shorts vs long videos is inferred by us (the Data API has no Shorts flag), so contentTypeBasis is "inferred".',
      'Watch time and retention need OAuth with the YouTube Analytics scope; an API key alone only provides public counts.',
    ],
  },

  async validate(creds) {
    const v = await client.validate(creds);
    if (v.isValid) return { isValid: true };
    const error = v.error || 'YouTube authorization failed.';
    return { isValid: false, error, kind: /expired|invalid_token|401/i.test(error) ? 'expired' : /permission|forbidden|quota/i.test(error) ? 'permission' : 'invalid' };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const ch = await client.getChannel(creds);
    return {
      providerAccountId: ch.id,
      handle: ch.customUrl || ch.title,
      displayName: ch.title,
      avatarUrl: ch.thumbnailUrl,
      accountInfo: { id: ch.id, name: ch.title, followersCount: ch.subscriberCount, mediaCount: ch.videoCount },
      credentialsPatch: { channelId: ch.id },
    };
  },

  async fetchContent(creds, account) {
    const result = await client.sync({ ...creds, channelId: account.providerAccountId });
    const reported = account.accountInfo.mediaCount;
    const partialReason = reported && result.media.length < reported * 0.9
      ? `Fetched ${result.media.length} of ${reported} videos reported by YouTube (private/unlisted videos are not returned).`
      : undefined;
    return { items: result.media, partialReason };
  },

  async refreshCredentials(creds: ProviderCredentials) {
    const y = config.providers.youtube;
    if (!y || !creds.refreshToken) throw new Error('YouTube refresh is not configured');
    const res = await httpFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: y.clientId, client_secret: y.clientSecret, refresh_token: creds.refreshToken, grant_type: 'refresh_token' }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error(`YouTube token refresh failed (${json.error || res.status}); the connection has expired.`);
    return { ...creds, accessToken: json.access_token, expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString() };
  },
};
