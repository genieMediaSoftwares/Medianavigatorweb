# Architecture

**Modular monolith.** One Express API serves the website, the React Native app, the admin panel and any future client. There is no separate mobile/website/admin backend.

```
backend/src
├── server.ts            start-up: connect DB, ensure indexes, listen, start jobs, graceful shutdown (SIGINT/SIGTERM)
├── app.ts               Express app: request-id, helmet, CORS allow-list, body limit, input sanitising, routes, errors
├── config/env.ts        the ONLY reader of process.env; validated, frozen config object; fails fast
├── middleware/          auth (JWT + server-side session), requireRole, rateLimit, validate (zod), requestId, cors, errorHandler
├── routes/              one router per resource; mounted at /api/v1
├── controllers/         thin: parse validated input, call a service, shape the response
├── services/            business logic: auth, users, connections, oauth, sync, analytics (+engine, stats), planner, notifications, files, admin, ai/*
├── repositories/        all MongoDB access; every user-owned query includes the owner
├── models/              Mongoose schemas + indexes
├── integrations/        provider clients (Meta, YouTube, LinkedIn), one adapter per platform behind a common interface, mapper to the internal model
├── jobs/                sync worker + scheduler (durable queue lives in MongoDB)
├── lib/                 crypto (AES-256-GCM), jwt, http (timeouts/retries), storage (R2), logger (redacting), errors, pagination
└── validators/          zod schemas for params, query and body
```

## Request flow
`request-id → helmet → CORS → body limit → sanitise ($-keys) → rate limit → route → validate(zod) → authenticate → requireRole → controller → service → repository → MongoDB`.
Identity always comes from the verified token + a live session lookup; a client-supplied `userId` is never accepted (schemas are `.strict()`).

## Provider abstraction
`ProviderAdapter { validate, resolveAccount, fetchContent, refreshCredentials?, capabilities }`. Each platform implements it inside `integrations/adapters/`. The sync engine is written once and works for all four. `capabilities` declares which metrics a platform cannot supply; those are stored as *unavailable*, not zero.

## Sync
`HTTP → enqueue SyncRun (queued) → worker claims (atomic) → adapter.fetchContent → normalise → bulk upsert (idempotent by connectedAccountId+providerMediaId) → snapshot + alerts + notification → finish run`.
- One active run per account is enforced by a partial unique index; double clicks return the existing run.
- Workers claim with a lease; a crashed worker's run is picked up again after the lease expires.
- Transient failures retry with jittered backoff up to `SYNC_MAX_ATTEMPTS`; expired credentials mark the connection `connection_expired` and are **never** retried; missing permissions mark `permission_required`.
- Sync only ever upserts. A partial provider response can never delete previously synced content.
- The queue is durable (MongoDB). The worker/scheduler can run inside the API process or be moved to a separate process without code changes. See `deployment.md` for what Render does and does not guarantee.

## Analytics
Pure functions over stored content (`analytics.engine.ts`, `analytics.stats.ts`). Typical performance uses the **median**; means are reported alongside and named as means. Classification (TOP / TYPICAL / LOW / INSUFFICIENT_DATA) is relative to the user's own history on the same platform (P25/P75 and median ratios, minimum 5 posts). `CALC_VERSION` is stored on snapshots and in cache keys. "All platforms" includes only connected platforms; a platform scope includes only that platform. Publish-time analysis uses the user's profile timezone.

## AI
Server-side only. Inputs are computed facts (`measured` and `calculated`); the model returns an *interpretation* that is schema-validated. Responses always carry `ai.status` (`ran | cached | unavailable | failed | not_needed`). With no AI, endpoints still answer with measured facts and say so. Results are cached per user + analysis + subject + data version + prompt version (`PROMPT_VERSION`).

## Scaling path
API, worker and scheduler already coordinate only through MongoDB. Rate-limit counters live in MongoDB too, so limits are shared across instances.
