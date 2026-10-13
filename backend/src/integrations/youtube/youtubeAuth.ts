import { httpFetch } from '../../lib/http.js';
import { looksLikeApiKey, parseExactChannel } from './errors.js';

export interface YouTubeAuthValidation {
  isValid: boolean;
  channelId?: string;
  channelTitle?: string;
  hasAnalyticsPermission: boolean;
  missingPermissions: string[];
  authType: 'oauth' | 'api_key';
  error?: string;
}

export class YouTubeAuth {
  /** Validates YouTube credentials by type: a Data API key (key only), or a Google sign-in (OAuth). */
  static async validate(credentials: {
    accessToken?: string;
    apiKey?: string;
    channelId?: string;
    channelQuery?: string;
  }): Promise<YouTubeAuthValidation> {
    const { accessToken, apiKey, channelQuery, channelId } = credentials;
    const fail = (error: string, authType: 'oauth' | 'api_key', missingPermissions: string[] = []): YouTubeAuthValidation =>
      ({ isValid: false, hasAnalyticsPermission: false, missingPermissions, authType, error });

    // An API key sent where a Google sign-in token belongs is what produced Google's bare "Invalid Value" before.
    if (accessToken?.trim() && looksLikeApiKey(accessToken)) {
      return fail('That is a YouTube Data API key, not a Google sign-in. Paste it in the API key field instead.', 'api_key');
    }

    if (!accessToken?.trim()) {
      if (!apiKey?.trim()) return fail('Enter your YouTube Data API key, or connect your Google account.', 'api_key');
      if (!looksLikeApiKey(apiKey)) return fail('That doesn\u2019t look like a Google API key. Keys start with \u201cAIza\u201d and are 39 characters long; copy it from Google Cloud Console \u2192 Credentials.', 'api_key');

      // An API key has no user identity, so YouTube can't tell which channel is yours: the channel must be named exactly.
      if (!channelId?.trim() && !channelQuery?.trim()) {
        return fail('An API key can\u2019t tell which channel is yours. Enter your YouTube channel @handle (e.g. @YourChannel) or channel ID (starts with UC\u2026) so we know which channel to connect, then try again.', 'api_key');
      }

      // If the user supplied a channel handle/ID, validate its format early.
      if (!channelId?.trim() && !parseExactChannel(channelQuery ?? '')) {
        return fail('Enter your channel ID (starts with UC\u2026) or your exact @handle (e.g. @YourChannel). Search terms aren\u2019t accepted.', 'api_key');
      }

      return {
        isValid: true,
        hasAnalyticsPermission: false,
        missingPermissions: ['https://www.googleapis.com/auth/yt-analytics.readonly'],
        authType: 'api_key',
      };
    }

    if (channelQuery?.trim()) {
      return fail('A channel ID or @handle isn\u2019t needed with Google sign-in: the channel your Google account owns is connected automatically.', 'oauth');
    }

    // Check OAuth Access Token if provided
    if (accessToken && accessToken.trim().length > 0) {
      try {
        const tokenInfoRes = await httpFetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
        const tokenInfo = await tokenInfoRes.json();

        if (!tokenInfoRes.ok || tokenInfo.error) {
          return {
            isValid: false,
            hasAnalyticsPermission: false,
            missingPermissions: [],
            authType: 'oauth',
            error: 'Your Google sign-in is invalid or has expired. Connect your Google account again.',
          };
        }

        const scopeString = tokenInfo.scope || '';
        const scopes = scopeString.split(' ');
        if (!scopes.some((sc: string) => /auth\/youtube(\.readonly)?$/.test(sc))) {
          return {
            isValid: false,
            hasAnalyticsPermission: false,
            missingPermissions: ['https://www.googleapis.com/auth/youtube.readonly'],
            authType: 'oauth',
            error: 'This token doesn\u2019t include YouTube access. Authorize the youtube.readonly scope and generate a new token.',
          };
        }
        const hasAnalytics = scopes.some((s: string) => s.includes('yt-analytics'));
        const missing: string[] = [];

        if (!hasAnalytics) {
          missing.push('https://www.googleapis.com/auth/yt-analytics.readonly');
        }

        return {
          isValid: true,
          hasAnalyticsPermission: hasAnalytics,
          missingPermissions: missing,
          authType: 'oauth',
        };
      } catch (err: any) {
        return {
          isValid: false,
          hasAnalyticsPermission: false,
          missingPermissions: [],
          authType: 'oauth',
          error: `YouTube OAuth verification error: ${err.message}`,
        };
      }
    }

    return {
      isValid: false,
      hasAnalyticsPermission: false,
      missingPermissions: [],
      authType: 'oauth',
      error: 'Invalid YouTube credentials.',
    };
  }
}
