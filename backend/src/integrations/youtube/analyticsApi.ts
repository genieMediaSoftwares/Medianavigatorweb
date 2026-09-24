export interface YouTubeAnalyticsReport {
  hasAnalytics: boolean;
  missingPermissionMessage?: string;
  metrics?: {
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
  };
}

export class YouTubeAnalyticsApi {
  private static readonly API_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports';

  static async getChannelAnalytics(accessToken?: string): Promise<YouTubeAnalyticsReport> {
    if (!accessToken) {
      return {
        hasAnalytics: false,
        missingPermissionMessage: 'YouTube Analytics requires an OAuth Access Token with "yt-analytics.readonly" scope.',
      };
    }

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const endDate = now.toISOString().split('T')[0];
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const url = new URL(this.API_BASE);
      url.searchParams.set('ids', 'channel==MINE');
      url.searchParams.set('startDate', startDate);
      url.searchParams.set('endDate', endDate);
      url.searchParams.set('metrics', 'estimatedMinutesWatched,averageViewDuration,subscribersGained');

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          hasAnalytics: false,
          missingPermissionMessage: data.error?.message || 'YouTube Analytics permission is unavailable. Reconnect your YouTube account with yt-analytics.readonly authorization.',
        };
      }

      const rows = data.rows?.[0];
      if (!rows || rows.length < 3) {
        return {
          hasAnalytics: true,
          metrics: {
            estimatedMinutesWatched: 0,
            averageViewDuration: 0,
            subscribersGained: 0,
          },
        };
      }

      return {
        hasAnalytics: true,
        metrics: {
          estimatedMinutesWatched: rows[0] || 0,
          averageViewDuration: rows[1] || 0,
          subscribersGained: rows[2] || 0,
        },
      };
    } catch (err: any) {
      return {
        hasAnalytics: false,
        missingPermissionMessage: `YouTube Analytics lookup error: ${err.message}`,
      };
    }
  }
}
