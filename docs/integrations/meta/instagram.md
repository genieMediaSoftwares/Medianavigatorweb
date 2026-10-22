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

## Ads / Boosts (read-only)

The content library has an **Ads / Boosts** tab after Opportunities. Regular Instagram media does not enumerate every advertising creative. The paid importer therefore also uses the Meta Marketing API on `graph.facebook.com`, with the configured API version and the same encrypted connection token.

- Supply a **Facebook Graph user token** with `ads_read`, access to the ad accounts, and the existing Instagram/Page permissions. An app key or app secret alone is insufficient. Instagram Login tokens cannot access ads; the UI explains this without blocking ordinary post syncing.
- Read `/me/adaccounts`, each account's `/ads` (including paused and archived statuses), and `/insights` at ad level with `publisher_platform` breakdown and `date_preset=maximum`. All pagination cursors are followed within a bounded sync budget. Timeout, permissions, repeated cursors, or provider failures produce a visible partial/unavailable status; inaccessible/deleted creatives and data beyond Meta's retention cannot be guaranteed.
- Import only creatives whose Instagram identity matches the connected profile or whose source/effective media matches its posts. This excludes other clients reachable through the same token. Creatives without sufficient identity information cannot safely be imported.
- Existing-post promotions are categorized as **Promoted posts / Boosts**; other attributable creatives are **Ads**. This does not claim Meta distinguishes the Boost button from Ads Manager.
- Metrics use only Instagram placement rows. Missing values stay `null`; spend keeps the ad-account currency and reporting dates. Paid records live in a separate collection and never inflate organic content totals or rankings.
- Historical paid records remain with their individual sync timestamps; partial runs retain already received records. Reconnecting to a different Instagram identity cannot expose the old identity's ads. User deletion removes paid records.
- Syncing is read-only: no campaign, budget, creative or delivery settings are changed.

References: [Meta Instagram Login limitations](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login), [Meta Business SDK ad creative fields](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adcreative.py), [Meta Business SDK advertising accounts](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adaccount.py), [Marketing API authorization](https://developers.facebook.com/docs/marketing-api/overview/authorization/).
