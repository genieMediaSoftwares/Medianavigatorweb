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
