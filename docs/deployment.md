# Deployment (Render)

The API is stateless and uses no local disk, no local MongoDB, no localhost URLs.

## Web service
- Root directory: repository root (leave Render's Root Directory empty).
- Build: `npm --prefix backend ci && npm --prefix backend run build`
- Start: `npm --prefix backend start`
- Build context must include `shared/`: backend source imports runtime policies from it. A checkout restricted to `backend/` cannot build this release.
- Health check path: `/health` (returns 503 when MongoDB is unreachable)
- Environment: every variable from `backend/README.md` with the same names. Set `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, `API_BASE_URL=https://…`, and a real `CORS_ALLOWED_ORIGINS`.
- Nothing is deployed or changed automatically by this repository.

## Background sync — what is and isn't guaranteed
The queue is durable (MongoDB). Whether anything *processes* it depends on the Render plan:

| Setup | Behaviour |
|---|---|
| `SYNC_WORKER_ENABLED=true`, `SYNC_SCHEDULER_ENABLED=true` on an **always-on** web service | Syncs run continuously and recover after restarts (expired leases are re-claimed). |
| Free/spun-down instances | The in-process loop only runs while the instance is awake; scheduled syncs will be late or missed. **Not reliable.** |
| Recommended for reliability | Set `JOBS_TRIGGER_SECRET` and create a **Render Cron Job** every few minutes: `curl -fsS -X POST -H "x-jobs-secret: $JOBS_TRIGGER_SECRET" https://<api>/api/v1/internal/jobs/run`. It queues due accounts and processes a bounded batch (up to `SYNC_TIMEOUT_MS`). A dedicated Background Worker running the same build with only `SYNC_WORKER_ENABLED=true` is the next step. |

Syncs triggered by a user are queued immediately and wait for a worker; if none is running they stay `queued` until one is (clients should show "syncing"/"queued" from `GET /connections/sync-runs/:id`).

### Dedicated background worker (recommended for the pilot)
`npm --prefix backend run build` from the repository root produces `backend/dist/server.mjs` and `backend/dist/worker.mjs`. Create a Render **Background Worker** from the same repo/branch with the repository root (leave Root Directory empty), build `npm --prefix backend ci && npm --prefix backend run build`, start `npm --prefix backend run worker`, and the same environment as the API. The worker always runs every task: social sync worker + scheduler, plan reminders, deep-analysis jobs and account-deletion cleanup. Note the internal `/internal/jobs/run` trigger only covers sync; it does not run deep analysis, reminders or account cleanup.

The web service also runs deep-analysis and account-cleanup loops unless `DEEP_ANALYSIS_WORKER_ENABLED=false` / `ACCOUNT_CLEANUP_WORKER_ENABLED=false`; sync loops follow `SYNC_WORKER_ENABLED` / `SYNC_SCHEDULER_ENABLED`. Running the loops in both processes is safe (MongoDB leases, unique active-run index, idempotent reminder keys), but once the worker is verified you can turn them off on the web service.

Verify it in production, not only locally: Admin → Analytics → **Background workers** shows the last successful iteration for each task (`social_sync`, `sync_scheduler`, `planner_reminders`, `deep_analysis`, `account_cleanup`) and the number of pending account cleanups. A task that is missing or older than a few minutes means nothing is running it. That page is not an alert: configure Render notifications for worker crashes/restarts separately.

## Configuration by application
Each application has exactly one configuration source: its own `.env` locally, the hosting platform's environment when deployed. No application reads another application's `.env`, and there are no `.env.example`/template files. Validation errors name the variable, never its value. Real `.env` files are git-ignored and excluded from EAS uploads (`.easignore`).

| Application | Local file | Hosted | Validated by | Required | Production-only rules |
|---|---|---|---|---|---|
| API + worker | `backend/.env` (resolved from `src/config` and from `dist/`) | Render environment (API and worker share the same values) | `backend/src/config/env.ts` at startup | Every variable marked "yes" in `backend/README.md`; Gemini, R2, SMTP and each OAuth provider are all-or-nothing groups | `API_BASE_URL` and `WEB_APP_URL` must be https; `CORS_ALLOWED_ORIGINS` must not contain `*` |
| Website (`web/`) | `web/.env` | Vercel/host environment, at build and runtime | `web/env.ts` from `next.config.ts` (build/start) | `API_BASE_URL` | https `API_BASE_URL`; `OPERATOR_NAME`, `SUPPORT_EMAIL` required; `ADMIN_APP_URL` (optional) https |
| Admin (`admin/`) | `admin/.env` | Host environment | `admin/env.ts` from `next.config.ts` | `API_BASE_URL` | https `API_BASE_URL` |
| Mobile (`Frontend/`) | `Frontend/.env` (dev server only) | `eas.json` `env` of the `preview` and `production` profiles: `EXPO_PUBLIC_API_BASE_URL=https://medianavigator-api.onrender.com` | `Frontend/src/config/env.ts` at app start | `EXPO_PUBLIC_API_BASE_URL` | Release bundles must use https; no localhost/LAN fallback exists |

Only `EXPO_PUBLIC_*` values reach the mobile bundle and none of them are secrets. The website and admin read `API_BASE_URL` on the server only; nothing is exposed through `NEXT_PUBLIC_*`.

## Exact Render setup for the pilot
| Setting | API (Web Service) | Worker (Background Worker) |
|---|---|---|
| Root directory | repository root (empty setting) | repository root (empty setting) |
| Build command | `npm --prefix backend ci && npm --prefix backend run build` | `npm --prefix backend ci && npm --prefix backend run build` |
| Start command | `npm --prefix backend start` | `npm --prefix backend run worker` |
| Health check | `/health` | none (Render worker); use the admin Background workers panel |
| Plan | always-on (not free/sleeping) | always-on |
| Environment | full backend set, `NODE_ENV=production`, `TRUST_PROXY_HOPS=1` | identical to the API |
| Job switches | Recommended once the worker is verified: `SYNC_WORKER_ENABLED=false`, `SYNC_SCHEDULER_ENABLED=false`, `DEEP_ANALYSIS_WORKER_ENABLED=false`, `ACCOUNT_CLEANUP_WORKER_ENABLED=false` | ignored: the worker always runs every task |

Do not consider the worker running until Admin → Analytics → Background workers shows `social_sync`, `sync_scheduler`, `planner_reminders`, `deep_analysis` and `account_cleanup` updating on the deployed system.

## Operations checklist (each item needs evidence from the deployed system)
- **Health:** `/health` returns 200 with `database: connected`; an uptime monitor alerts a named person on non-200.
- **Worker failures:** Render notifications for worker deploy failures/crashes go to the incident owner; heartbeats checked after every deploy and restart.
- **Backups and restore:** confirm MongoDB Atlas backup schedule/retention; restore one snapshot into an isolated cluster and read encrypted provider credentials with the matching `CREDENTIAL_ENCRYPTION_KEY` (a restore without that key cannot decrypt tokens).
- **Rollback:** record the release commit for API, worker, web and admin; roll back with Render/Vercel "redeploy previous" to that commit. Schema changes in this release are additive (new collections `accountdeletions`, `workerheartbeats`), so the previous build still runs.
- **Password reset email:** with SMTP configured, request a reset for a test account, receive it, use the link once, confirm a second use fails.
- **Storage failure recovery:** delete a test account that owns an uploaded file while R2 is unreachable (staging), confirm "pending account cleanups" > 0, restore R2, confirm it drops to 0 and the object is gone.
- **Account deletion verification:** delete a staging test account; confirm sign-in and refresh fail, its data is gone and another account is unaffected.
- **Capacity and timeouts:** load-test expected pilot concurrency against staging; confirm AI requests stop at `AI_TIMEOUT_MS`/`CONTENT_ANALYSIS_TIMEOUT_MS` with an honest failure, and set Gemini/provider spending alerts.

## Rollout checklist
1. Rotate any token that was ever committed; purge history.
2. Create the Atlas user/network rules; set env; deploy.
3. `npm run admin:create -- <email>` (from a trusted shell with the production env).
4. Register OAuth redirect URIs with Meta/Google/LinkedIn.
5. Verify `/health`, register a test user, connect one account, watch `GET /connections`.

## Instagram sign-in (no user-supplied tokens)

New Instagram connections use Instagram API with Instagram Login. Existing Facebook-token Instagram connections remain readable until reconnected.

Set this complete group in the backend environment (locally and on Render):

- `INSTAGRAM_APP_ID`: Instagram app ID from Meta's Instagram API setup with Instagram Login.
- `INSTAGRAM_APP_SECRET`: matching Instagram app secret; server only.
- `INSTAGRAM_REDIRECT_URI`: `https://medianavigator-api.onrender.com/api/v1/connections/oauth/instagram/callback`

Register that exact redirect URI in the Instagram Business Login settings. Keep `WEB_APP_URL=https://medianavigatorweb.vercel.app` and `CORS_ALLOWED_ORIGINS=https://medianavigatorweb.vercel.app` on Render. Vercel needs `API_BASE_URL=https://medianavigator-api.onrender.com`, `OPERATOR_NAME` and `SUPPORT_EMAIL` (production builds fail without them; see "Configuration by application"); never put the app secret there or in `NEXT_PUBLIC_*`.

The requested read-only scopes are `instagram_business_basic` and `instagram_business_manage_insights`. Test with an authorized Instagram Business/Creator tester account first. Public customers require Meta's review/access approval. Personal Instagram accounts are not supported by this API.

The callback consumes a short-lived, single-use state bound to the signed-in Media Navigator user, exchanges the code on the server, upgrades and encrypts the token, and queues the existing media/insights sync. It returns to Connections, where import progress updates automatically and View analysis opens the existing analytics. No password or access token is collected in the Instagram connection form. Missing app settings show an explicit setup notice instead of a broken redirect.

Verify live login, denial, reconnect, initial sync and insights with a real test account after configuring the app. Tests with mocked Meta responses do not prove that Meta has approved access.

Instagram long-lived tokens are refreshed during sync when less than seven days remain. Expired or revoked access requires reconnecting. Refresh depends on the sync worker running; a sleeping Render instance cannot refresh in the background. Account insights cover the last 28 days, include collection timestamps and unavailable metric names, and feed the Ask AI context alongside synced post metrics. Full video analysis uses the existing user-triggered analysis flow.

## Facebook Page sign-in

The Facebook card redirects directly to official Facebook authorization when configured. There are no Facebook API-key, Page-ID, or token fields in the UI. Set `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI` on the backend. For production the redirect must be `https://medianavigator-api.onrender.com/api/v1/connections/oauth/facebook/callback`; register the identical URL in Meta's Facebook Login settings. Request `pages_show_list`, `pages_read_engagement`, and `read_insights` and complete Meta's required access review for public users. This reads managed Pages, not personal-profile posts. The backend still uses the official Graph API after consent. Without the app credentials, the UI explains that sign-in is not configured.
