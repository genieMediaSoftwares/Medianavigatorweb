# Security

| Area | Implementation |
|---|---|
| Secrets | Only `backend/.env` / Render env. `config/env.ts` is the only `process.env` reader (enforced by a test). No defaults; fail fast. No `.env.example`/other env files (enforced by a test) |
| Provider tokens | Never sent to clients. Encrypted with AES-256-GCM (`lib/crypto.ts`), fresh IV per value, tamper-evident. Decrypted only in memory inside connection/sync services. Never logged or returned |
| Auth | See `authentication.md` |
| Authorization | `requireRole('admin')` on the server; ownership in every repository query; 404 for others' resources |
| Input | zod on params/query/body, `.strict()` (unknown keys → 422); `$`/dotted keys stripped; body size limit; page-size cap; no raw user objects reach Mongo filters |
| NoSQL injection / IDOR | Operators rejected by schemas and stripped; ObjectIds validated; owner constraints everywhere |
| Rate limiting | Separate limits for general, auth, sync/connect/OAuth, AI, upload, admin → `429 RATE_LIMITED`. Counters are stored in MongoDB (`RateLimit` collection, TTL-expired), so limits hold across API instances |
| Headers / CORS | helmet; `x-powered-by` off; CORS allow-list from env (`*` refused in production); native mobile apps are unaffected by CORS and rely on token auth |
| Uploads | Allow-listed MIME ∩ known extensions, extension must match MIME, magic-byte check, size cap, one file/request, server-generated R2 keys, private bucket + short-lived presigned URLs |
| Errors | Central handler; no stack traces, URIs, tokens or file paths; unexpected errors → generic 500 |
| Logging | Structured JSON with request id, route, status, duration, userId. A redactor strips password/token/secret/authorization/key fields and `access_token=…`, `mongodb://…` patterns from messages (tested) |
| Providers | Every call has a timeout; only idempotent GETs retry (timeouts, network, 408/429/5xx) with jittered backoff; 401/403/4xx never retried; known-expired connections are not called again |
| AI | Key server-side only. Prompts contain computed facts; third-party text is fenced as `<untrusted>`; output is schema-validated; failures are never cached |
| Shutdown | SIGINT/SIGTERM close the HTTP server and MongoDB; in-flight leases expire and are recovered |

## Known gaps / decisions to review
- Access tokens are JWT HS256 with one shared secret; rotate `JWT_SECRET` to invalidate all access tokens (refresh tokens are server-side and unaffected).
- No MFA / email verification yet.
- Provider error messages are matched by pattern to decide `expired` vs `permission` vs `transient` (the existing provider clients throw plain errors). Unrecognised errors are treated as non-retryable failures.
- If secrets were ever committed (this repository previously tracked `data/datastore_seed.json` containing access tokens), deleting them from the working tree is **not enough**: rotate those tokens and purge git history (`git filter-repo`/BFG).
