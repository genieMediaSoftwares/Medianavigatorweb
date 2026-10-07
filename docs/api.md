# API reference — `/api/v1`

Every client (website, React Native, admin) uses the same endpoints.

**Envelope.** Success: `{ "success": true, "data": … , "meta"?: { "limit", "nextCursor", "total"? } }`.
Error: `{ "success": false, "error": { "code", "message", "details"? } }`.
Codes → HTTP: `BAD_REQUEST` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `PAYLOAD_TOO_LARGE` 413 · `VALIDATION_ERROR` 422 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500 · `PROVIDER_ERROR` 502 · `SERVICE_UNAVAILABLE` 503.
**Auth.** `Authorization: Bearer <accessToken>`. **Pagination.** `?limit=&cursor=` (cursor from `meta.nextCursor`). Every response carries `X-Request-Id`; send one to correlate logs.
**Unknown fields are rejected (422)**, including any client-supplied `userId`.

## Health (no auth, not under /api/v1)
| | |
|---|---|
| `GET /` | `{service, status:"running", health:"/health"}` |
| `GET /health` (also `/api/v1/health`) | `200 {status:"ok", database:"connected"}` or `503 {status:"degraded", database:"disconnected"}` |

## Auth — `/auth` (rate-limited)
| Method & path | Auth | Body → Result |
|---|---|---|
| `POST /auth/register` | – | `{email, password, fullName, organization?, accountType?}` → `201 {user, profile, tokens}`; 409 duplicate |
| `POST /auth/login` | – | `{email, password}` → `{user, tokens}`; 401 wrong credentials; 429 locked |
| `POST /auth/refresh` | – | `{refreshToken}` → `{tokens}` (rotation; replay of an old token revokes the session) |
| `POST /auth/logout` | user | revokes the current session |
| `POST /auth/logout-all` | user | revokes every session |
| `GET /auth/me` | user | `{user, profile}` |
| `POST /auth/change-password` | user | `{currentPassword, newPassword}`; other sessions are revoked |
| `POST /auth/forgot-password` | – | `{email}` → 202 (identical for known/unknown emails); **503** if email delivery is not configured |
| `POST /auth/reset-password` | – | `{token, newPassword}`; single use; all sessions revoked |

`tokens = {accessToken, refreshToken, tokenType:"Bearer", expiresIn, refreshExpiresIn}`.

## Users & profiles
| | | |
|---|---|---|
| `GET /users/me`, `GET /profiles/me` | user | `{user, profile}` |
| `PATCH /profiles/me` | user | `{fullName?, organization?, accountType?, timezone? (IANA), onboardingCompleted?}` |
| `GET /users/me/sessions` | user | active sessions |
| `DELETE /users/me/sessions/:id` | user | revoke one of **your** sessions |
| `DELETE /users/me` | user | `{password}`; deletes the user's data (see `database.md`) |

## Connections
| | | |
|---|---|---|
| `GET /connections` | user | all four platforms with `status`, `connected`, `lastSyncedAt` (ISO), `sync.{state,nextSyncAt,lastError}`, `capabilities`, `oauthAvailable`. Never contains credentials |
| `POST /connections/:platform/connect` | user | `{accessToken\|apiKey, accountId?, pageId?, channelId?, channelQuery?, organizationId?, username?}` → **202** `{connection, syncRun}`. Credentials validated with the provider, then AES-256-GCM encrypted |
| `POST /connections/:platform/oauth/start` | user | → `{authorizeUrl}` (state is single-use, short-lived; PKCE for YouTube) |
| `GET /connections/oauth/:platform/callback` | – | Provider redirect target. Validates state, exchanges the code, stores encrypted tokens, queues a sync, **302** to `WEB_APP_URL/connections?oauth=connected\|denied\|failed&platform=…` (no tokens in the URL) |
| `POST /connections/:platform/sync` | user | → 202 `{syncRun, alreadyQueued}` |
| `POST /connections/sync-all` | user | → 202 `{syncRuns[]}` |
| `GET /connections/sync-runs/:id` | user | run status + item counts (poll this) |
| `POST /connections/:platform/disconnect` (or `DELETE /connections/:platform`) | user | wipes stored credentials, stops syncing, keeps history |
| `GET /connections/:platform/capabilities` | user | what the platform can/cannot provide |

`platform ∈ instagram | facebook | youtube | linkedin`. Statuses: `syncing`, `sync_complete`, `sync_failed`, `permission_required`, `connection_expired`, `not_connected`.
Sync run statuses: `queued`, `running`, `succeeded`, `partial` (incomplete provider result), `failed`, `cancelled`.

## Media
| | | |
|---|---|---|
| `GET /media?platform=&limit=&cursor=` | user | cursor-paginated content from live connections; each item has `unavailableMetrics[]` and `contentTypeBasis` (`provider`\|`inferred`) |
| `GET /media/:id` | user | one item (owner only; 404 otherwise) |

## Intelligence (all derived from stored data)
| | | |
|---|---|---|
| `GET /intelligence/status` | user | AI / storage / email availability and provider capabilities |
| `GET /intelligence/summary?platform=&days=` | user | **median-based**, user-relative summary: period comparison, content-type and topic performance, trending topics, `topContent`, `needsImprovement`, rule-based `contentIdeas` (`generatedBy:"rules"`), `platformsIncluded` |
| `GET /intelligence/history?from=&to=&platform=&limit=` | user | daily per-account snapshots |
| `GET /intelligence/overview`, `/timing`, `/signals`, `/performers?sortBy=`, `/patterns`, `/archive-audit`, `/recommendations`, `/trends` | user | legacy-shaped views (`/analytics/overview`, `/timing`, `/recommendations`, `/trends` also exist at the top level) |
| `POST /intelligence/ask` | user, AI-limited | `{question}` → `{answer, observedSignal, suggestedAction, source, ai, measured}` |
| `POST /intelligence/analyze-item` | user, AI-limited | `{mediaId}` → `{observedFact, possibleReason, actionableRecommendations, …, measured, calculated, ai}` |
| `POST /intelligence/diagnose-post` | user, AI-limited | `{mediaId, forcedStatus?}` → diagnosis with `measured`, `calculated`, `ai`, `limitations` |
| `POST /intelligence/analyze-video` | user, AI-limited | `{mediaId}` → qualitative hook/caption assessment + `unavailable[]` (no retention/hook-score is ever invented) |
| `POST /intelligence/compare` | user | `{mediaIdA, mediaIdB}` → deterministic side-by-side |

`ai.status`: `ran` · `cached` · `unavailable` (not configured) · `failed` · `not_needed`. When not `ran`/`cached`, text fields contain measured facts only.

## Planner
`GET /planner`, `POST /planner {day,time,platform,contentType?,title}`, `DELETE /planner/:id`, `GET /planner/insights` (best windows with sample sizes, recommended formats, topics, gaps), `POST /recommendations/:id/plan {day?,time?}` (422 if history is too thin to propose a slot and none is given).

## Notifications & alerts
`GET /notifications?unreadOnly=`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`; legacy `GET /alerts`, `POST /alerts/:id/dismiss`.

## Files (Cloudflare R2) — `503` when R2 is not configured
`POST /files` (multipart `file` + `purpose`), `GET /files`, `GET /files/:id` (metadata + short-lived presigned URL), `DELETE /files/:id`. Owner-only; type, extension and magic bytes are checked; keys are server-generated.

## Admin — role `admin` enforced on the server, rate-limited
`GET /admin/system`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/status`, `GET /admin/connections`, `POST /admin/connections/:id/sync`, `GET /admin/sync-runs`, `GET /admin/audit-logs`. Admins never receive provider tokens. Role/status changes, manual syncs and admin logins are audited.

## Internal
`POST /internal/jobs/run` with header `x-jobs-secret` (= `JOBS_TRIGGER_SECRET`): queues due syncs and processes a bounded batch. 503 if the secret is not configured, 403 if wrong.
