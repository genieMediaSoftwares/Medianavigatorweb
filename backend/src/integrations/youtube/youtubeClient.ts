import { YouTubeAuth, YouTubeAuthValidation } from './youtubeAuth.js';
import { YouTubeDataApi, YouTubeChannelDetails } from './dataApi.js';
import { YouTubeAnalyticsApi, YouTubeAnalyticsReport } from './analyticsApi.js';
import { NormalizedMedia } from '../../../../shared/types.js';

export interface YouTubeSyncResult {
  channel: YouTubeChannelDetails;
  media: NormalizedMedia[];
  analytics: YouTubeAnalyticsReport;
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

    // 2. Fetch real videos if uploads playlist exists
    let media: NormalizedMedia[] = [];
    if (channel.uploadsPlaylistId) {
      media = await YouTubeDataApi.getVideos(credentials, channel.uploadsPlaylistId);
    }

    // 3. Query analytics if OAuth token available
    const analytics = await YouTubeAnalyticsApi.getChannelAnalytics(credentials.accessToken);

    return {
      channel,
      media,
      analytics,
    };
  }
}
