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
        const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
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
        const testUrl = channelId
          ? `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`
          : `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${encodeURIComponent(apiKey)}`; // Google Developers channel as canary

        const testRes = await fetch(testUrl);
        const testData = await testRes.json();

        if (!testRes.ok || testData.error) {
          return {
            isValid: false,
            hasAnalyticsPermission: false,
            missingPermissions: ['YouTube Analytics API requires OAuth token'],
            authType: 'api_key',
            error: testData.error?.message || 'Invalid YouTube Data API key.',
          };
        }

        return {
          isValid: true,
          hasAnalyticsPermission: false,
          missingPermissions: ['https://www.googleapis.com/auth/yt-analytics.readonly (Analytics requires OAuth)'],
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
