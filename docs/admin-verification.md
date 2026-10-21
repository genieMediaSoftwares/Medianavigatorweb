# Admin implementation and verification

Verified on 19 October 2026 in the supplied Windows workspace.

## Completed

- Separate `admin/` Next.js 16 + TypeScript package, independent dev/build/start scripts, lockfile and CI job. Reused existing branding, UI components and backend administrative operations.
- Admin dashboard and configuration/health; user search and cursor pagination; role/status/credit operations; Instagram/Facebook/YouTube/LinkedIn connection monitoring and manual sync; platform filters; sync history; analytics snapshot count/freshness; Gemini attempt monitoring; error records; audit history; existing roles and permissions.
- Shared existing Express API, MongoDB, accounts, session authentication, credit balances, social adapters, analytics and sync workers. No second database, registration system or billing system.
- Removed embedded website administration UI. Legacy `/admin` is an entry link configured using website `ADMIN_APP_URL`; website BFF rejects admin API paths.
- Isolated admin httpOnly cookies, no-store responses, same-origin writes, restricted BFF routes, rejected non-admin login, and backend database role/session checks. Normal-user signup cannot assign admin privileges.
- Added metadata-only telemetry with TTL indexes. Gemini attempts record outcome/model/latency; API server errors record route template/status/request ID. Existing sync/analysis error records are read without exposing raw provider payloads.
- Admin credit updates are atomic, including legacy missing balances, and retain existing audit records and nonnegative balance validation.

## Results

| Check | Result |
| --- | --- |
| Backend full suite | 28 files, **363 tests passed**, including 5 new monitoring/telemetry/concurrency tests |
| Admin security suite | **8 tests passed** |
| Website regression suite | 7 files, **34 tests passed** |
| Mobile regression suite | 4 files, **26 tests passed** |
| Backend/admin/website/mobile TypeScript | Passed |
| Backend production build | Passed |
| Admin production build | Passed with the package's `next build --webpack` command |
| Website production build | Passed with `npm run build -- --webpack` |
| Website lint | Passed |
| Mobile lint | Passed with one existing warning: `SecureStorageKey` redeclaration in `Frontend/src/lib/storage/secure-storage.ts:12` |
| Production admin smoke check | `/sign-in` returned HTTP 200 and rendered the sign-in form |
| Browser visual inspection | Branded public sign-in page verified |

Initial sandbox runs could not launch MongoDB or access some worker temporary files; affected checks passed outside the sandbox. Turbopack's CSS worker failed on this Windows installation even outside the sandbox; the independent admin package uses supported Webpack dev/build scripts. Website code retains its existing scripts. Its build needed additional time for existing font fetch retries.

All database integration checks used isolated MongoDB and provider test doubles. Production users, provider accounts and billing were not modified for verification. Protected browser workflows were covered through BFF and backend integration tests; they were not clicked through using a live administrator account.

## Deployment and limits

- Deploy `admin/` independently; configure server-only `API_BASE_URL` to the same existing backend. Set website `ADMIN_APP_URL` during its build/deployment. Bootstrap/sign in using an existing administrator; `backend/` already supplies `npm run admin:create`.
- Validate HTTPS, deployed sign-in, and real provider/sync connectivity after deployment. No external production deployment was performed.
- Existing roles remain `user` and `admin`; granular custom staff roles/permission editing are not implemented.
- No subscription or payment implementation exists. The panel exposes the existing credits system rather than inventing subscriptions.
- Historical provider call data cannot be reconstructed. New generation-attempt telemetry is retained 90 days; server error metadata 30 days. Writes are best effort; database outages need host logs.
- Gemini token counts, billed costs and per-user provider billing are not tracked. Attempts are distinct from billable model calls and can include configuration/provider/validation failures.
- Analytics monitoring reports existing snapshot count and most recent update; it does not invent cross-account revenue, audience totals or historical growth charts.
- Health configuration flags are not active external-provider uptime probes. Error views show the latest 50 records per source; host logs remain the source for detailed stack traces and infrastructure failures.

See [development plan](admin-development-plan.md) and [admin setup](../admin/README.md).
