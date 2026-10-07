# YouTube Data API v3 & Analytics API Integration

## Authentication
- **OAuth 2.0**: Google Identity Services / Server-side web server flow.
- **Scopes**:
  - `https://www.googleapis.com/auth/youtube.readonly`
  - `https://www.googleapis.com/auth/yt-analytics.readonly`

## Endpoints
1. Channels: `GET https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true`
2. PlaylistItems (Uploads): `GET https://www.googleapis.com/youtube/v3/playlistItems`
3. Videos: `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails`
4. Analytics: `GET https://youtubeanalytics.googleapis.com/v2/reports`
   - Metrics: `views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,shares`
   - Dimensions: `video,day`

## Quota Limits
- Default quota: 10,000 units/day.
- Cost per list call: 1 unit.
- Cost per video details: 1 unit.
- Background sync schedules batches hourly to conserve quota.
