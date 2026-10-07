# Media Navigator API Specifications & Integrations Index

This directory provides comprehensive documentation for social media platform integrations used by Media Navigator:

1. **Meta Platforms**:
   - [Instagram Graph API](./meta/instagram.md)
   - [Facebook Pages API](./meta/facebook.md)
2. **Google**:
   - [YouTube Data & Analytics API](./youtube/data-api.md)
3. **LinkedIn**:
   - [LinkedIn Community Management API](./linkedin/organization-api.md)

## Normalization Paradigm
All platform responses are transformed into the unified `NormalizedMedia` model defined in `shared/types.ts`. Raw API tokens and payloads are stored securely in backend tables and never exposed directly to the browser.
