# Instagram Graph API Integration

## Authentication & OAuth Flow
- **Protocol**: OAuth 2.0 via Meta for Developers.
- **Base Endpoint**: `https://www.facebook.com/v19.0/dialog/oauth`
- **Token Exchange**: `https://graph.facebook.com/v19.0/oauth/access_token`
- **Exchange to Long-Lived Token**: `grant_type=fb_exchange_token` (valid for 60 days).

## Required Scopes
- `instagram_basic`: Core profile data & ID.
- `instagram_manage_insights`: Read media insights, impressions, reach, engagement.
- `pages_show_list`: Discover connected Facebook pages.
- `pages_read_engagement`: Access post interaction metrics.
- `business_management`: `[REQUIRES PLATFORM VERIFICATION]` - Required for Meta App Review.

## Normalized Ingestion Pipeline
1. Ingest Raw Media from `GET /{ig-user-id}/media`
2. Fetch Insights from `GET /{ig-media-id}/insights?metric=reach,impressions,saved,shares,video_views`
3. Normalize to Media Navigator model:
   - Calculate Engagement Rate: `(likes + comments + shares + saves) / reach * 100`
   - Classify Format: `Reel`, `Carousel`, `Image`, `Story`
   - Store in `media_content` with encrypted workspace mapping.

## Rate Limiting & Error Handling
- Rate Limit: 200 calls/hour per user.
- Status Code 190 (OAuthException): Trigger auto-refresh or mark status as `expired` in UI.
- Exponential backoff starting at 2s with jitter.
