# Deployment (Render)

The API is stateless and uses no local disk, no local MongoDB, no localhost URLs.

## Web service
- Root directory: `backend`
- Build: `npm ci && npm run build`
- Start: `npm start`
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

Register that exact redirect URI in the Instagram Business Login settings. Keep `WEB_APP_URL=https://medianavigatorweb.vercel.app` and `CORS_ALLOWED_ORIGINS=https://medianavigatorweb.vercel.app` on Render. Vercel only needs `API_BASE_URL=https://medianavigator-api.onrender.com`; never put the app secret there or in `NEXT_PUBLIC_*`.

The requested read-only scopes are `instagram_business_basic` and `instagram_business_manage_insights`. Test with an authorized Instagram Business/Creator tester account first. Public customers require Meta's review/access approval. Personal Instagram accounts are not supported by this API.

The callback consumes a short-lived, single-use state bound to the signed-in Media Navigator user, exchanges the code on the server, upgrades and encrypts the token, and queues the existing media/insights sync. It returns to Connections, where import progress updates automatically and View analysis opens the existing analytics. No password or access token is collected in the Instagram connection form. Missing app settings show an explicit setup notice instead of a broken redirect.

Verify live login, denial, reconnect, initial sync and insights with a real test account after configuring the app. Tests with mocked Meta responses do not prove that Meta has approved access.

Instagram long-lived tokens are refreshed during sync when less than seven days remain. Expired or revoked access requires reconnecting. Refresh depends on the sync worker running; a sleeping Render instance cannot refresh in the background. Account insights cover the last 28 days, include collection timestamps and unavailable metric names, and feed the Ask AI context alongside synced post metrics. Full video analysis uses the existing user-triggered analysis flow.

## Facebook Page sign-in

The Facebook card redirects directly to official Facebook authorization when configured. There are no Facebook API-key, Page-ID, or token fields in the UI. Set `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI` on the backend. For production the redirect must be `https://medianavigator-api.onrender.com/api/v1/connections/oauth/facebook/callback`; register the identical URL in Meta's Facebook Login settings. Request `pages_show_list`, `pages_read_engagement`, and `read_insights` and complete Meta's required access review for public users. This reads managed Pages, not personal-profile posts. The backend still uses the official Graph API after consent. Without the app credentials, the UI explains that sign-in is not configured.


## Public URLs for the Meta app settings

For the web deployment at `https://medianavigatorweb.vercel.app`, use:

- Privacy policy: `https://medianavigatorweb.vercel.app/privacy`
- Terms of Service: `https://medianavigatorweb.vercel.app/terms`
- User data deletion instructions: `https://medianavigatorweb.vercel.app/data-deletion`

These routes are public and do not require sign-in. Verify all three load on the deployed site before submitting the Meta settings; a Git push alone does not confirm deployment.

## Local development without sample account data

The old `preview-mock-api.mjs` server is retired. Start the real backend using `backend/.env`, then start the web app with its real `API_BASE_URL`. Do not override the API address with the old port 4100 demo service. New accounts have no connections or analytics until the user connects a channel and completes a sync.
