import { hasMeaningfulDenominator } from '../../services/ai/engagementRate.js';
import { config } from '../../config/env.js';
import { httpFetch } from '../../lib/http.js';
import { describeGoogleError, parseExactChannel, YouTubeApiError, type ChannelReference } from './errors.js';
import { NormalizedMedia, PerformanceTier } from '../../../../shared/types.js';

export interface YouTubeChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  uploadsPlaylistId?: string;
}

export class YouTubeDataApi {
  private static readonly API_BASE = `https://www.googleapis.com/youtube/${config.providers.youtubeApiVersion}`;

  private static getHeaders(accessToken?: string): HeadersInit {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
  }

  private static appendAuth(url: URL, apiKey?: string) {
    if (apiKey) {
      url.searchParams.set('key', apiKey);
    }
  }

  /**
   * Resolves the channel exactly, by credential type:
   * - Google sign-in (OAuth access token): the channel the signed-in Google account owns (channels?mine=true).
   * - YouTube Data API key + channelId or channelQuery: the exact named channel.
   * - YouTube Data API key alone: attempts auto-discovery; throws a clear error if not possible
   *   (API keys have no user identity, so YouTube can't determine "which channel is yours").
   * When `channelId` is given (later syncs) the result must be that same channel.
   */
  static async getChannel(credentials: { accessToken?: string; apiKey?: string; channelId?: string; channelQuery?: string }): Promise<YouTubeChannelDetails> {
    const accessToken = credentials.accessToken?.trim();
    const apiKey = credentials.apiKey?.trim();
    const url = new URL(`${this.API_BASE}/channels`);
    url.searchParams.set('part', 'snippet,statistics,contentDetails');

    let requested: string;
    if (accessToken) {
      url.searchParams.set('mine', 'true');
      requested = 'your Google account';
    } else if (apiKey) {
      const parsed: ChannelReference | null = credentials.channelId
        ? { id: credentials.channelId }
        : parseExactChannel(credentials.channelQuery ?? '');
      let target: { id: string } | { handle: string } | null = null;
      if (parsed && 'videoId' in parsed) {
        // A video link names the channel only indirectly; resolve the owner first.
        const ownerId = await this.channelIdForVideo(parsed.videoId, apiKey);
        if (!ownerId) throw new YouTubeApiError(`No YouTube channel matches ${credentials.channelQuery?.trim()}. Check the channel ID or @handle: it must match exactly.`, 'not_found');
        target = { id: ownerId };
      } else if (parsed) {
        target = parsed;
      }

      if (!target) {
        // No channel identifier provided — API keys have no user identity so YouTube cannot
        // auto-detect the channel. Return a clear, one-sentence instruction.
        throw new YouTubeApiError(
          'An API key can\u2019t tell which channel is yours. Enter your YouTube channel @handle (e.g. @YourChannel) or channel ID (starts with UC\u2026) so we know which channel to connect, then try again.',
          'invalid',
        );
      }

      if ('id' in target) {
        url.searchParams.set('id', target.id);
        requested = target.id;
      } else {
        url.searchParams.set('forHandle', target.handle);
        requested = target.handle;
      }
      url.searchParams.set('key', apiKey);
    } else {
      throw new YouTubeApiError('Enter your YouTube Data API key and channel, or connect your Google account.', 'invalid');
    }

    const res = await httpFetch(url.toString(), { headers: this.getHeaders(accessToken) });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw describeGoogleError(res.status, data, 'YouTube Data API v3', accessToken ? 'oauth' : 'api_key');
    if (!data.items || data.items.length === 0) {
      throw new YouTubeApiError(
        accessToken
          ? 'This Google account has no YouTube channel. Sign in with the account that owns your channel.'
          : `No YouTube channel matches ${requested}. Check the channel ID or @handle: it must match exactly.`,
        'not_found',
      );
    }

    const channel = this.formatChannelItem(data.items[0]);
    if (credentials.channelId && channel.id !== credentials.channelId) {
      throw new YouTubeApiError('This Google account owns a different YouTube channel than the one connected. Disconnect YouTube and connect the channel you want.', 'permission');
    }
    return channel;
  }

  /** Resolves the owning channel of a single video (used when the user pastes a video link). */
  private static async channelIdForVideo(videoId: string, apiKey: string): Promise<string | null> {
    const url = new URL(`${this.API_BASE}/videos`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);
    const res = await httpFetch(url.toString(), { headers: this.getHeaders() });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw describeGoogleError(res.status, data, 'YouTube Data API v3', 'api_key');
    return data.items?.[0]?.snippet?.channelId ?? null;
  }

  private static formatChannelItem(item: any): YouTubeChannelDetails {
    const uploadsPlaylist = item.contentDetails?.relatedPlaylists?.uploads || 
      (item.id?.startsWith('UC') ? 'UU' + item.id.slice(2) : undefined);

    return {
      id: item.id,
      title: item.snippet?.title || 'YouTube Channel',
      description: item.snippet?.description || '',
      customUrl: item.snippet?.customUrl || (item.snippet?.title ? `@${item.snippet.title.replace(/\s+/g, '')}` : undefined),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : undefined,
      videoCount: item.statistics?.videoCount ? parseInt(item.statistics.videoCount, 10) : undefined,
      viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined,
      uploadsPlaylistId: uploadsPlaylist,
    };
  }

  /**
   * Fetches actual real videos for the channel and converts to NormalizedMedia
   */
  static async getVideos(
    credentials: { accessToken?: string; apiKey?: string; channelId?: string },
    uploadsPlaylistId: string
  ): Promise<NormalizedMedia[]> {
    const { accessToken, apiKey } = credentials;

    // Resolve uploads playlist ID: either passed in or derived from channelId (UC... -> UU...)
    let playlistId = uploadsPlaylistId;
    if (!playlistId && credentials.channelId?.startsWith('UC')) {
      playlistId = 'UU' + credentials.channelId.slice(2);
    }

    const allVideoIds: string[] = [];

    // Attempt 1: Fetch via playlistItems
    if (playlistId) {
      try {
        let nextPageToken: string | undefined = undefined;
        let page = 0;
        const maxPages = config.providers.maxPages;

        do {
          page++;
          const playlistUrl = new URL(`${this.API_BASE}/playlistItems`);
          playlistUrl.searchParams.set('part', 'snippet,contentDetails');
          playlistUrl.searchParams.set('playlistId', playlistId);
          playlistUrl.searchParams.set('maxResults', '50');
          if (nextPageToken) {
            playlistUrl.searchParams.set('pageToken', nextPageToken);
          }
          this.appendAuth(playlistUrl, apiKey);

          const playlistRes = await httpFetch(playlistUrl.toString(), { headers: this.getHeaders(accessToken) });
          const playlistData = await playlistRes.json().catch(() => ({}));

          if (!playlistRes.ok || playlistData.error) {
            // An empty uploads playlist is a 404; anything else on the first page is a real problem to report.
            if (page === 1 && playlistRes.status !== 404) throw describeGoogleError(playlistRes.status, playlistData, 'YouTube Data API v3', accessToken ? 'oauth' : 'api_key');
            break;
          }

          if (playlistData.items && Array.isArray(playlistData.items)) {
            for (const it of playlistData.items) {
              const vId = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
              if (vId && !allVideoIds.includes(vId)) {
                allVideoIds.push(vId);
              }
            }
          }

          nextPageToken = playlistData.nextPageToken;
        } while (nextPageToken && page < maxPages);
      } catch (err) {
        if (err instanceof YouTubeApiError) throw err;
        // Network hiccup: continue to the same-channel search fallback
      }
    }

    // Attempt 2: Fallback to search if playlistItems yielded nothing
    if (allVideoIds.length === 0 && credentials.channelId) {
      try {
        const searchUrl = new URL(`${this.API_BASE}/search`);
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('channelId', credentials.channelId);
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('order', 'date');
        searchUrl.searchParams.set('maxResults', '50');
        this.appendAuth(searchUrl, apiKey);

        const searchRes = await httpFetch(searchUrl.toString(), { headers: this.getHeaders(accessToken) });
        const searchData = await searchRes.json();

        if (searchRes.ok && searchData.items && Array.isArray(searchData.items)) {
          for (const it of searchData.items) {
            const vId = it.id?.videoId;
            if (vId && !allVideoIds.includes(vId)) {
              allVideoIds.push(vId);
            }
          }
        }
      } catch {
        // Fall through
      }
    }

    // If channel has zero published videos, return empty list (never inject trending/mock videos)
    if (allVideoIds.length === 0) {
      return [];
    }

    // 2. Fetch full video statistics and content details in chunks of 50
    const normalizedList: NormalizedMedia[] = [];
    const CHUNK_SIZE = 50;

    for (let i = 0; i < allVideoIds.length; i += CHUNK_SIZE) {
      const chunkIds = allVideoIds.slice(i, i + CHUNK_SIZE);
      const videosUrl = new URL(`${this.API_BASE}/videos`);
      videosUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      videosUrl.searchParams.set('id', chunkIds.join(','));
      this.appendAuth(videosUrl, apiKey);

      const videosRes = await httpFetch(videosUrl.toString(), { headers: this.getHeaders(accessToken) });
      const videosData = await videosRes.json();

      if (!videosRes.ok || !videosData.items) continue;

      normalizedList.push(...this.convertYouTubeItemsToNormalizedMedia(videosData.items));
    }

    return normalizedList;
  }

  /**
   * Transforms raw YouTube API video items into standardized NormalizedMedia assets
   */
  private static convertYouTubeItemsToNormalizedMedia(items: any[]): NormalizedMedia[] {
    const list: NormalizedMedia[] = [];

    for (const v of items) {
      const vId = v.id?.videoId || (typeof v.id === 'string' ? v.id : v.snippet?.resourceId?.videoId);
      if (!vId) continue;

      const views = v.statistics?.viewCount ? parseInt(v.statistics.viewCount, 10) : 0;
      const likes = v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : 0;
      const comments = v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : 0;
      const rawDuration = v.contentDetails?.duration || '';
      const durationSeconds = this.parseDuration(rawDuration);

      const isShort = durationSeconds > 0 && durationSeconds <= 60;
      const contentType: NormalizedMedia['contentType'] = isShort ? 'short' : 'video';

      const interactions = likes + comments;
      const engagementRate = hasMeaningfulDenominator(views) ? Number(((interactions / views) * 100).toFixed(2)) : 0;

      let tier: PerformanceTier = 'Average';
      if (engagementRate > 6.0 || views > 50000) tier = 'Strong';
      else if (engagementRate > 3.0 || views > 10000) tier = 'Above average';
      else if (engagementRate < 1.0 && views < 500) tier = 'Declining';

      list.push({
        id: `yt_${vId}`,
        workspaceId: 'ws_live',
        platform: 'youtube',
        platformContentId: vId,
        contentType,
        title: v.snippet?.title || 'YouTube Video',
        caption: v.snippet?.description || '',
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url || '',
        mediaUrl: `https://www.youtube.com/watch?v=${vId}`,
        publishedAt: v.snippet?.publishedAt || '',
        durationSeconds,
        primarySignal: {
          label: isShort ? 'Short Plays' : 'Video Views',
          value: views.toLocaleString(),
          status: tier,
        },
        views,
        reach: views,
        engagementRate,
        // The YouTube Data API doesn't expose shares; the adapter marks them unavailable.
        shares: 0,
        likes,
        comments,
        explanation: {
          observedFact: `Verified ${isShort ? 'YouTube Short' : 'YouTube Video'} generated ${views.toLocaleString()} real views, ${likes.toLocaleString()} likes, and ${comments.toLocaleString()} comments.`,
          possibleReason: isShort 
            ? 'Short-form vertical video format drove algorithm feed retention and replay velocity.'
            : 'Long-form depth provided search indexing and watch-time completion.',
          whatToRepeat: [
            v.snippet?.tags?.[0] ? `Tag: ${v.snippet.tags[0]}` : 'Topic clarity',
            isShort ? 'Punchy opening hook in first 3 seconds' : 'Clear chapter progression',
          ],
        },
        isDemo: false,
      });
    }

    return list;
  }

  private static parseDuration(isoStr: string): number {
    const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
