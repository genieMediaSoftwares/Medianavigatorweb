# Facebook Pages & Graph API Integration

## Authentication & Authorization
- **Base Endpoint**: `https://graph.facebook.com/v19.0/`
- **OAuth Scopes**:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_read_user_content`
  - `read_insights`

## Media Endpoints
- `GET /{page-id}/feed?fields=id,message,created_time,full_picture,attachments,permalink_url`
- `GET /{post-id}/insights?metric=post_impressions,post_engaged_users,post_reactions_by_type_total`

## Normalization Logic
- Extract caption/title from post message.
- Normalize reactions (Like, Love, Haha, Wow, Sad, Angry) into unified engagement counter.
- Flag high community discussions (comments/reaction ratio > 0.35) as community strength.
