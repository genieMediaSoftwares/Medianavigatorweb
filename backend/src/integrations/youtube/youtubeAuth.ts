import { config } from '../../config/env.js';
import { httpFetch } from '../../lib/http.js';
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
  /**
   * Validates YouTube credentials (OAuth Access Token or Data API Key)
   */
  static async validate(credentials: {
    accessToken?: string;
    apiKey?: string;
    channelId?: string;
    channelQuery?: string;
  }): Promise<YouTubeAuthValidation> {
    const { accessToken, apiKey, channelId } = credentials;

    if (!accessToken && !apiKey) {
      return {
        isValid: false,
        hasAnalyticsPermission: false,
        missingPermissions: ['youtube.readonly', 'yt-analytics.readonly'],
        authType: 'oauth',
        error: 'Please provide a valid YouTube OAuth Access Token or YouTube Data API Key.',
      };
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
            error: tokenInfo.error_description || 'YouTube OAuth token validation failed. Token may be invalid or expired.',
          };
        }

        const scopeString = tokenInfo.scope || '';
        const scopes = scopeString.split(' ');
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

    // Validate YouTube API Key
    if (apiKey && apiKey.trim().length > 0) {
      try {
        // Test YouTube Data API key directly against Google's API
        // If channelId is a 24-character UC ID, test channels endpoint; otherwise test video endpoint to verify key
        const isNumericOrUC = channelId && /^UC[a-zA-Z0-9_-]{22}$/.test(channelId);
        const testUrl = isNumericOrUC
          ? `https://www.googleapis.com/youtube/${config.providers.youtubeApiVersion}/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`
          : `https://www.googleapis.com/youtube/${config.providers.youtubeApiVersion}/videos?part=snippet&id=Ks-_Mh1QhMc&key=${encodeURIComponent(apiKey)}`;

        const testRes = await httpFetch(testUrl);
        const testData = await testRes.json();

        if (!testRes.ok || testData.error) {
          return {
            isValid: false,
            hasAnalyticsPermission: false,
            missingPermissions: [],
            authType: 'api_key',
            error: testData.error?.message || 'Invalid YouTube Data API key. Please check your key in Google Cloud Console.',
          };
        }

        return {
          isValid: true,
          hasAnalyticsPermission: true,
          missingPermissions: [],
          authType: 'api_key',
        };
      } catch (err: any) {
        return {
          isValid: false,
          hasAnalyticsPermission: false,
          missingPermissions: [],
          authType: 'api_key',
          error: `YouTube API key verification error: ${err.message}`,
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
