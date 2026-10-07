# Provider integrations

Provider specifics (endpoints, permissions) are in `docs/integrations/` (Meta, YouTube, LinkedIn).

| Platform | What is synced | Not available / limits |
|---|---|---|
| Instagram | posts, reels, carousels with likes/comments; views/reach/saves/shares from insights when the token has insights permission | Stories and Live are not returned. `watchTimeMinutes` unavailable. Items without insights show those metrics as unavailable |
| Facebook | Page posts (and engagement); insights where `read_insights` is granted | Personal profiles are not available. Saves unavailable |
| YouTube | channel + videos with views/likes/comments | Shorts vs long video is **inferred** (`contentTypeBasis:"inferred"`); reach/shares/saves unavailable; watch time/retention need OAuth + Analytics scope. YouTube content is never called "Reels" |
| LinkedIn | organization (Page) posts and available counts | Needs Community Management permissions; without them the connection is `permission_required`. Personal-profile analytics unavailable |

Adapters live in `backend/src/integrations/adapters/` and implement `ProviderAdapter`. Provider clients are the existing, working implementations, with these changes: all HTTP goes through `lib/http.ts` (timeout, bounded retry), API versions and page caps come from configuration, and identity of items without an id is derived deterministically (LinkedIn).

**Live verification status:** the adapters and OAuth flows are covered by automated tests with stand-ins. They have **not** been exercised against live Meta/Google/LinkedIn accounts from this repository's test environment. Verify each provider once with a real account before relying on it.
