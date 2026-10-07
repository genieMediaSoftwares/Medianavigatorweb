# Runbook

| Situation | Check | Action |
|---|---|---|
| API down / 503 | `GET /health` | `database: disconnected` → Atlas status, IP allow-list, `MONGODB_URI`. Mongoose reconnects automatically |
| Startup exits | Logs show `Invalid configuration` | Fix the named variables |
| Syncs stuck `queued` | `GET /admin/sync-runs?status=queued`, `GET /admin/system` → `features.syncWorker` | Enable a worker or the cron trigger (deployment.md) |
| Run stuck `running` | lease expires after `SYNC_LEASE_SECONDS` and is re-claimed; runs out of attempts are closed as `failed` | Wait one lease period |
| Many `connection_expired` | provider revoked tokens or key changed | Users reconnect; if the encryption key changed restore it |
| Provider rate limits | run `errorKind: transient`, retries with backoff | Lower sync frequency (`SYNC_INTERVAL_MINUTES`) |
| AI "unavailable" | `GET /intelligence/status`, run `ai.reason` | Check Gemini key/quota; the app keeps serving measured data |
| User locked out | lockout lifts after `LOGIN_LOCKOUT_MINUTES` | Or reset via forgot-password |
| Suspected abuse | `X-Request-Id` in logs; `GET /admin/audit-logs` | Disable user: `PATCH /admin/users/:id/status` (revokes sessions) |
| Rotate JWT secret | change `JWT_SECRET`, restart | All access tokens invalid; clients refresh transparently |
| Rotate encryption key | not supported in place | All users reconnect (credentials are re-encrypted on connect) |

Logs are JSON lines; search by `requestId`, `syncRunId`, `provider`, `operation`.
