# Media Navigator Admin

Independent Next.js 16 + TypeScript application. Default port **3001**. The customer website remains on port 3000; Expo remains in `Frontend/`. All use the existing `backend/` API and MongoDB. Admin has no database or social-provider credentials.

## Run

1. Run the existing backend according to `backend/README.md`.
2. In `admin/`, run `npm ci`.
3. Set server-side `API_BASE_URL` to the same API origin used by the website/mobile app. Locally it lives in `admin/.env`; on the host, in the platform environment. The admin app never reads `backend/.env`. Production builds/starts fail unless it uses `https://`. Never use a `NEXT_PUBLIC_` variable for credentials.
4. Run `npm run dev` and open http://localhost:3001.
5. Sign in with an existing administrator. Bootstrap with `npm run admin:create` from `backend/`; there are no default credentials or admin registration endpoint.

The website's old `/admin` page now links to this app when its server has `ADMIN_APP_URL` configured. It contains no admin interface and its BFF blocks admin API paths. Customers' existing website/mobile features are retained.

## Deploy separately

Deploy `admin/` as its own Next.js project/service. Set `API_BASE_URL` on its server; run `npm ci`, `npm run build`, `npm start`. Port 3001 is the default; override the start command if your host needs another port. Use HTTPS in production. Set website `ADMIN_APP_URL` to the deployed admin origin during its build/deployment. The admin server calls the API directly; browser-to-backend CORS additions are unnecessary. Keep the existing database, JWT signing configuration, OAuth callbacks and mobile API URL unchanged.

## Features and guarantees

- Shared dashboard and database/service configuration, users/search, enable/disable, admin promotion/demotion, credit adjustments, connections across Instagram/Facebook/YouTube/LinkedIn, manual sync, cursor-paginated sync/audit history.
- Analytics snapshot monitoring and freshness; Gemini generation attempt counts, outcomes, latency, stored analyses, cache and deep-job state; operational errors and existing role/permission documentation.
- No fabricated measurements or subscription module. Existing credits are managed; subscription billing is absent. Configuration status is not a provider connectivity probe.
- Existing API authentication, password lockout, rate limits and rotating refresh tokens. Dedicated `mn_admin_*` httpOnly cookies; Secure in production; same-origin writes; no-store responses; no tokens in browser JSON/storage.
- Backend validates active session and current database role on every admin request. Self role/status changes and removing the last admin are forbidden. Administrative changes use the existing audit log.
- AI attempt telemetry starts when this release is deployed (90-day retention). Server error metadata starts then (30-day retention). Token usage, billed cost, pre-release call history, and per-customer provider billing are unavailable. Attempts include validation/provider/unconfigured failures; they are not equivalent to billed requests.
- Error view uses at most 50 records per source; no prompts, raw provider errors, signed media URLs, secrets or request bodies. Telemetry writes are best effort and never fail a customer request. MongoDB outage errors cannot be persisted while the database is unavailable; use deployment logs then.
- Existing role model is intentionally preserved: `user` and `admin`. Custom staff roles or per-admin permission editing are not implemented.

## Verify

`npm run typecheck`, `npm test`, `npm run build` in this directory. Backend integration tests are in `backend/tests/adminMonitoring.test.ts`; they need the existing isolated MongoDB test setup. See `docs/admin-verification.md` for the checks performed in this workspace.
