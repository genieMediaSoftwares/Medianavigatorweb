# LinkedIn Community Management & Organization API

## Authorization
- **OAuth 2.0 Flow**: Authorization Code Flow via `https://www.linkedin.com/oauth/v2/authorization`
- **Required Scopes**:
  - `r_organization_social`: Read posts, comments, reactions on organizational pages.
  - `rw_organization_admin`: Manage company page connections.
  - `r_basicprofile`: User authentication.

## Core Endpoints
- Organizational Entities: `GET https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee`
- Posts: `GET https://api.linkedin.com/rest/posts?author=urn:li:organization:{orgId}`
- Post Analytics: `GET https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:{orgId}`

## Limitations & Verification
- `[REQUIRES PLATFORM VERIFICATION]` LinkedIn Developer Portal Enterprise application review is mandatory for organizational insights.
- Refresh Tokens: Expire after 365 days; access tokens expire after 60 days.
