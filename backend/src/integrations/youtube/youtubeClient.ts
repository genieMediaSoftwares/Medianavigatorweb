import { YouTubeAuth, YouTubeAuthValidation } from './youtubeAuth.js';
import { YouTubeDataApi, YouTubeChannelDetails } from './dataApi.js';
import { YouTubeAnalyticsApi, YouTubeAnalyticsReport } from './analyticsApi.js';
import { NormalizedMedia } from '../../../../shared/types.js';

export interface YouTubeSyncResult {
  channel: YouTubeChannelDetails;
  media: NormalizedMedia[];
  analytics: YouTubeAnalyticsReport;
  /** Why per-video watch time is missing (no analytics permission), or undefined when it was measured. */
  watchTimeUnavailable?: string;
}

export class YouTubeClient {
  async validate(credentials: { accessToken?: string; apiKey?: string; channelId?: string; channelQuery?: string }): Promise<YouTubeAuthValidation> {
    return YouTubeAuth.validate(credentials);
  }

  async getChannel(credentials: { accessToken?: string; apiKey?: string; channelId?: string; channelQuery?: string }): Promise<YouTubeChannelDetails> {
    return YouTubeDataApi.getChannel(credentials);
  }

  async sync(credentials: { accessToken?: string; apiKey?: string; channelId?: string; channelQuery?: string }): Promise<YouTubeSyncResult> {
    // 1. Fetch real channel
    const channel = await YouTubeDataApi.getChannel(credentials);

    // 2. Fetch real videos
    let media: NormalizedMedia[] = [];
    const playlistId = channel.uploadsPlaylistId || (channel.id?.startsWith('UC') ? 'UU' + channel.id.slice(2) : '');
    if (playlistId || channel.id) {
      media = await YouTubeDataApi.getVideos({ ...credentials, channelId: channel.id }, playlistId);
    }

    // 3. Per-video watch time from YouTube Analytics. Never estimated: without permission it stays unavailable.
    const watch = await YouTubeAnalyticsApi.getVideoWatchStats(credentials.accessToken, media.map((m) => m.platformContentId));
    media = media.map((m) => {
      const w = watch.stats.get(m.platformContentId);
      if (w) return { ...m, watchTimeMinutes: Math.round(w.estimatedMinutesWatched) };
      return { ...m, watchTimeMinutes: undefined, missingMetrics: [...new Set([...(m.missingMetrics ?? []), 'watchTimeMinutes'])] };
    });

    const analytics = await YouTubeAnalyticsApi.getChannelAnalytics(credentials.accessToken);

    return {
      channel,
      media,
      analytics,
      watchTimeUnavailable: watch.available ? undefined : watch.reason,
    };
  }
}
