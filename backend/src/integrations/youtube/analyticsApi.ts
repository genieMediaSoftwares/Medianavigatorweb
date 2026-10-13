import { httpFetch } from '../../lib/http.js';
export interface YouTubeAnalyticsReport {
  hasAnalytics: boolean;
  missingPermissionMessage?: string;
  metrics?: {
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
  };
}

export interface VideoWatchStats {
  /** Lifetime minutes watched, as estimated by YouTube Analytics. */
  estimatedMinutesWatched: number;
  /** Average seconds watched per view. */
  averageViewDuration: number;
  /** Average share of the video watched, 0–100+. */
  averageViewPercentage: number;
}

export class YouTubeAnalyticsApi {
  private static readonly API_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports';
  /** YouTube's own earliest valid report date. */
  private static readonly SINCE = '2005-02-14';
  /** Video ids per report request (the filter accepts up to 500; keep URLs short). */
  private static readonly BATCH = 200;

  /**
   * Per-video lifetime watch statistics for the channel the OAuth token owns (yt-analytics.readonly).
   * Returns `available: false` with the reason when the scope wasn't granted, so callers mark the metric unavailable
   * instead of storing zeros. Videos YouTube has no data for are simply absent from the map.
   */
  static async getVideoWatchStats(accessToken: string | undefined, videoIds: string[]): Promise<{ available: boolean; reason?: string; stats: Map<string, VideoWatchStats> }> {
    const stats = new Map<string, VideoWatchStats>();
    if (!accessToken) return { available: false, reason: 'YouTube Analytics needs a Google sign-in with the yt-analytics.readonly permission.', stats };
    if (videoIds.length === 0) return { available: true, stats };

    const endDate = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < videoIds.length; i += this.BATCH) {
      const batch = videoIds.slice(i, i + this.BATCH);
      const url = new URL(this.API_BASE);
      url.searchParams.set('ids', 'channel==MINE');
      url.searchParams.set('startDate', this.SINCE);
      url.searchParams.set('endDate', endDate);
      url.searchParams.set('dimensions', 'video');
      url.searchParams.set('metrics', 'estimatedMinutesWatched,averageViewDuration,averageViewPercentage');
      url.searchParams.set('filters', `video==${batch.join(',')}`);
      url.searchParams.set('maxResults', String(batch.length));
      try {
        const res = await httpFetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          return { available: false, reason: data.error?.message || `YouTube Analytics returned HTTP ${res.status}.`, stats: new Map() };
        }
        const cols: string[] = (data.columnHeaders ?? []).map((c: { name: string }) => c.name);
        const at = (name: string) => cols.indexOf(name);
        for (const row of data.rows ?? []) {
          stats.set(String(row[at('video')]), {
            estimatedMinutesWatched: Number(row[at('estimatedMinutesWatched')]) || 0,
            averageViewDuration: Number(row[at('averageViewDuration')]) || 0,
            averageViewPercentage: Number(row[at('averageViewPercentage')]) || 0,
          });
        }
      } catch (err: any) {
        return { available: false, reason: `YouTube Analytics lookup failed: ${err.message}`, stats: new Map() };
      }
    }
    return { available: true, stats };
  }

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

      const res = await httpFetch(url.toString(), {
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
