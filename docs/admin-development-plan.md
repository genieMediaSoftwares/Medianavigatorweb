# Separate administration application

## Inspection and decisions

- `web/`: Next.js 16, React, TypeScript, cookie-based backend-for-frontend; existing admin UI at `/admin`.
- `Frontend/`: Expo/React Native app, secure token storage, same versioned Express API.
- `backend/`: Express/TypeScript, Mongoose/MongoDB, JWT access tokens, rotating refresh sessions, database-backed authentication and rate limiting, encrypted social credentials.
- Existing features: four social adapters/OAuth, sync worker/scheduler, daily analytics snapshots, Gemini analysis/cache/jobs, planner, notifications, files, credits, audit history, admin user/role/status/credit operations.
- Existing roles are `user` and `admin`. Keep these authoritative roles rather than introducing incompatible identities or role claims. Every admin endpoint verifies the current database role and session.
- No billing provider, subscription model, or payment lifecycle exists. Manage existing credits; do not invent subscriptions.
- Existing AI records are analyses/cache/jobs, not a provider billing ledger. Report those accurately, with unknown token usage/cost explicitly unavailable.

## Implementation sequence

1. Create independent `admin/` Next.js/TypeScript package on port 3001, retaining brand assets/colors and reusing existing admin UI patterns.
2. Restrict the admin BFF to admin endpoints and required authentication, isolate its cookies, reject non-admin login, enforce same-origin writes and no-store responses.
3. Extend existing protected backend admin routes with AI/analytics monitoring, error visibility and an explicit permissions manifest. Persist sanitized server errors without request bodies, credentials or provider payloads.
4. Provide dashboard, users/credits, connections/sync, analytics, AI, health, errors, audit and roles views. Retire the embedded website console; its entry becomes a link to the independently deployed app.
5. Verify backend security and monitoring against an isolated test database, typecheck/build the independent app, and run relevant website regressions. Document exact results and deployment configuration.

## Integration and deployment

All three clients use the existing API and MongoDB; the admin has no database connection or provider credentials. Host admin independently and set its server-only `API_BASE_URL`. Set website `ADMIN_APP_URL` for the legacy admin entry. Bootstrap administrators with the existing `backend` `npm run admin:create` command. Use HTTPS in production. Local test fixtures remain isolated from real application data.
