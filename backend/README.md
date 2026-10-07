# Media Navigator API

One backend for the website, the React Native app, the admin panel, and any future client.
Modular monolith: Node.js · Express · TypeScript · MongoDB Atlas (Mongoose) · JWT · Cloudflare R2 · Gemini · Meta / YouTube / LinkedIn APIs.

```
Website / Mobile / Admin ──► /api/v1 ──► routes → controllers → services → repositories → MongoDB Atlas
                                              │                     └── integrations (Instagram, Facebook, YouTube, LinkedIn)
                                              ├── services/ai (Gemini)        └── lib/storage (Cloudflare R2)
                                              └── jobs (sync queue worker + scheduler, durable in MongoDB)
```

## Requirements
- Node.js **22+**
- A MongoDB Atlas cluster (or any MongoDB 6+)
- Optional, each enables one feature: Cloudflare R2 (files), Gemini (AI), SMTP (password-reset email), Meta / Google / LinkedIn developer apps (OAuth connect)

## Configuration — one file, no fallbacks
All configuration lives in **`backend/.env`** (git-ignored). On Render, set the *same variable names* in the service environment. There is deliberately **no** `.env.example`, `.env.local`, `.env.production`, etc.

`src/config/env.ts` is the only module that reads `process.env`. It validates everything at startup and exits with a list of every missing/invalid value. Nothing has a default.

Optional feature groups (Gemini, R2, SMTP, each OAuth provider) must be **all set or all absent**. A half-configured group is a startup error; an absent group disables that feature and the API reports it as unavailable (it never fakes it).

| Variable | Required | Meaning |
|---|---|---|
| `NODE_ENV` | yes | `development` \| `test` \| `production` |
| `SERVER_PORT` | yes | Port to listen on (Render: use the port Render provides) |
| `API_BASE_URL` | yes | Public URL of this API (https in production) |
| `WEB_APP_URL` | yes | Web app origin; OAuth callbacks and reset links return here |
| `CORS_ALLOWED_ORIGINS` | yes | Comma-separated browser origins (website, admin). `*` is rejected in production |
| `REQUEST_BODY_LIMIT` | yes | e.g. `100kb` |
| `TRUST_PROXY_HOPS` | yes | Reverse proxies in front of the app (Render = `1`, local = `0`) |
| `MONGODB_URI` | yes | Atlas connection string |
| `MONGODB_QUERY_MAX_LIMIT` | yes | Maximum page size any list endpoint accepts |
| `ANALYTICS_MAX_ITEMS` | yes | Maximum posts loaded per user for analytics |
| `JWT_SECRET` | yes | ≥ 32 chars. `openssl rand -base64 48` |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | yes | e.g. `15m` / `30d` |
| `PASSWORD_HASH_ROUNDS` | yes | bcrypt cost (≥ 10; 12 recommended) |
| `LOGIN_MAX_FAILED_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | yes | Account lockout |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | yes | Reset link lifetime |
| `MAX_SESSIONS_PER_USER` | yes | Oldest sessions are revoked beyond this |
| `CREDENTIAL_ENCRYPTION_KEY` | yes | base64 of 32 random bytes: `openssl rand -base64 32`. **Losing it makes stored provider tokens unreadable (users must reconnect).** |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_GENERAL_MAX`, `_AUTH_MAX`, `_SYNC_MAX`, `_AI_MAX`, `_UPLOAD_MAX`, `_ADMIN_MAX` | yes | Per-client request limits per window, by endpoint class |
| `PROVIDER_TIMEOUT_MS`, `PROVIDER_MAX_RETRIES`, `PROVIDER_RETRY_BASE_MS`, `PROVIDER_MAX_PAGES` | yes | Every provider call has a timeout; only transient GETs retry; page cap per paginated fetch |
| `META_API_VERSION`, `YOUTUBE_API_VERSION`, `LINKEDIN_API_VERSION` | yes | e.g. `v21.0`, `v3`, `202401` |
| `OAUTH_STATE_TTL_SECONDS` | yes | Lifetime of a single-use OAuth state |
| `SYNC_INTERVAL_MINUTES`, `SYNC_TIMEOUT_MS`, `SYNC_LEASE_SECONDS`, `SYNC_MAX_ATTEMPTS` | yes | Scheduled-sync cadence, per-run timeout, worker lease, retry budget |
| `SYNC_WORKER_ENABLED`, `SYNC_SCHEDULER_ENABLED` | yes | `true`/`false`: run the queue worker / due-account scheduler inside this process |
| `SYNC_WORKER_POLL_MS` | yes | Worker poll interval |
| `JOBS_TRIGGER_SECRET` | no | Enables `POST /api/v1/internal/jobs/run` for an external scheduler (Render Cron Job) |
| `AI_TIMEOUT_MS`, `AI_MAX_INPUT_CHARS`, `AI_CACHE_TTL_HOURS` | yes | AI limits and cache lifetime |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | group | Both or neither |
| `FILE_MAX_BYTES`, `FILE_ALLOWED_MIME_TYPES`, `FILE_PRESIGNED_URL_TTL_SECONDS` | yes | Upload limits (allowed: jpeg, png, webp, gif, pdf, mp4, csv, txt) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` (+ optional `R2_PUBLIC_BASE_URL`) | group | Cloudflare R2 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | group | Needed only for forgot-password email |
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` | group | Instagram + Facebook OAuth |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | group | YouTube OAuth |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | group | LinkedIn OAuth |

OAuth redirect URIs must be `{API_BASE_URL}/api/v1/connections/oauth/{platform}/callback` and registered with each provider.

## MongoDB Atlas
Create a cluster → Database Access user (least privilege: `readWrite` on the app database) → Network Access (allow Render's outbound IPs, or `0.0.0.0/0` with a strong password if you must) → copy the `mongodb+srv://…` string into `MONGODB_URI`. Indexes are created on startup with `createIndexes` (additive; the app never drops collections or data).

## Run locally
```bash
cd backend
npm install
# create backend/.env with the variables above (there is no template file, see the table)
npm run dev                 # http://localhost:<SERVER_PORT>
npm run admin:create -- you@example.com   # first administrator (prompts for a password; nothing is auto-created)
```
Check: `GET /` → `{"success":true,"data":{"service":"Media Navigator API","status":"running","health":"/health"}}` and `GET /health` (503 + `database: "disconnected"` whenever MongoDB is unreachable).

## Test, typecheck, build
```bash
npm run typecheck
npm test            # integration tests run against a real MongoDB (mongodb-memory-server)
npm run build       # → dist/server.mjs
npm start
```
If your network blocks the MongoDB binary download used by the tests, point `MONGOMS_SYSTEM_BINARY` at a local `mongod`.
Tests never call real provider, Gemini, R2 or SMTP services (they are replaced by in-test stand-ins).

## Deploy on Render
See `docs/deployment.md`. Build: `cd backend && npm ci && npm run build`. Start: `cd backend && npm start`. Health check path: `/health`.

## Documentation
`docs/architecture.md` · `docs/api.md` · `docs/authentication.md` · `docs/database.md` · `docs/deployment.md` · `docs/security.md` · `docs/integrations.md` · `docs/runbook.md`

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Exits immediately printing `Invalid configuration` | Read the listed variables; fix `backend/.env` / Render env |
| `/health` returns 503 `database: disconnected` | Atlas network allow-list, wrong URI, cluster paused |
| Everyone's connections show `connection_expired` after a deploy | `CREDENTIAL_ENCRYPTION_KEY` changed. Restore the old key or have users reconnect |
| Syncs stay `queued` | No worker running: set `SYNC_WORKER_ENABLED=true` or trigger via `/api/v1/internal/jobs/run` (see deployment doc) |
| `503 Password reset email is not configured` | SMTP group not set |
| `503 File storage is not configured` | R2 group not set |
| AI responses say "AI unavailable" | Gemini group not set, quota exhausted, or the model call failed (see `ai.reason` in the response) |
