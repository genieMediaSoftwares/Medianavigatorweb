# API reference — `/api/v1`

Every client (website, React Native, admin) uses the same endpoints.

**Envelope.** Success: `{ "success": true, "data": … , "meta"?: { "limit", "nextCursor", "total"? } }`.
Error: `{ "success": false, "error": { "code", "message", "details"? } }`.
Codes → HTTP: `BAD_REQUEST` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `PAYLOAD_TOO_LARGE` 413 · `VALIDATION_ERROR` 422 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500 · `PROVIDER_ERROR` 502 · `SERVICE_UNAVAILABLE` 503 · `MEDIA_UNAVAILABLE` 422 (the post's real media could not be obtained, e.g. Instagram withholds the file for some reels; no content analysis is produced from numbers alone).
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
| `POST /intelligence/content-analysis` | user, AI-limited | `{mediaId, type: deep\|why_top\|why_bottom, reanalyze?, rank?}` → saved six-point analysis over the real media (fetched automatically: Instagram full video with audio, full image, or every carousel slide in order; YouTube public video. A video whose file cannot be obtained returns `MEDIA_UNAVAILABLE` instead of a cover-image or numbers-only analysis) plus live metrics, comparison, `mediaBasis`, `analyzedAt`, `fromCache`, `stale`, `refreshError?`. Returns the saved result unless the post's data changed materially, it is older than `CONTENT_ANALYSIS_STALE_HOURS`, or `reanalyze` is set. A failed refresh keeps the previous result |
| `GET /intelligence/content-analysis?mediaId=&type=` | user | the saved analysis only (or `null`), never generates |

`ai.status`: `ran` · `cached` · `unavailable` (not configured) · `failed` · `not_needed`. When not `ran`/`cached`, text fields contain measured facts only.

## Planner
Original (web planner, unchanged): `GET /planner` (plans with a weekday and time), `POST /planner {day,time,platform,contentType?,title}`, `DELETE /planner/:id`, `GET /planner/insights` (best windows with sample sizes, recommended formats, topics, gaps), `GET /planner/best-times?platform&days&metric?&contentType?` (each account now also carries `missingPermissions`), `POST /recommendations/:id/plan {day?,time?}` (422 if history is too thin to propose a slot and none is given).

Smart Content Planner (V2). Every route is scoped to the signed-in user; another user's plan is a 404.
- `GET /planner/plans?from&to` dated plans in `[from, to)` (ISO instants, at most 120 days), earliest first; `GET /planner/plans?undated=true` ideas, undated drafts and older weekday-only plans (`needsDate: true`).
- `POST /planner {title, timezone, targets:[{platform, format, localDate?, localTime?, caption?, reminders?, checklist?}], description?, caption?, cta?, referenceUrl?, notes?, goal?, status?, source?:{mediaId, analysisType, recommendationIndex}}` creates one plan per target (shared `groupId` when several). `localDate` is `YYYY-MM-DD`, `localTime` 24-hour `HH:mm`, in the IANA `timezone`; the server stores the instant (`scheduledAt`) plus those local values. A time skipped by a DST change moves to the next valid time. Without a date the plan is an `idea`. Formats: Instagram reel/image/carousel/story, Facebook reel/video/image/text, YouTube short/video, LinkedIn text/image/video/document. `source` must be a saved analysis of the user's; only the recommendation text and a short summary are copied.
- `GET /planner/:id` → `{plan, group}` (other platforms' plans of the same idea). `PATCH /planner/:id` edits fields, format, checklist (whole list), reminders (`[0,15,30,60,1440]` minutes before), date/time/timezone, or `clearDate` (ideas/drafts only).
- `POST /planner/:id/status {status, localDate?, localTime?, timezone?}`: idea → draft/planned/cancelled; draft → idea/planned/ready/cancelled; planned → idea/draft/ready/cancelled; ready → idea/draft/planned/cancelled; published → ready (undo, unlinks the post); cancelled → idea/draft/planned. Planned/ready need a date. `missed` is never stored: a planned/ready/draft plan more than 1 hour past its time is reported as `status: "missed"` (`storedStatus` keeps the real one).
- `GET /planner/:id/matches` synced posts on the same account, platform and post type published from 1 day before to 3 days after the plan, not linked elsewhere. `state: possible | none | unavailable` (`reason`: not_connected, format_not_synced, no_date, expired, permission_required). Nothing is linked automatically.
- `POST /planner/:id/publish {mediaId?} | {url?} | {}` marks it published: `mediaId` links that synced post (`verification: matched`); a `url` equal to a synced post's permalink also links it; otherwise `verification: manual`. A post can be linked to one plan only (409).
- `GET /planner/:id/review` for a linked post: measured metrics only (`value: null` when the platform didn't report it), each compared with the median of the same account's posts of the same type from the previous 90 days when at least 5 have that number; saved analyses and up to 3 Deep Analysis ideas to plan next.
- Reminders: with the sync scheduler enabled (`SYNC_SCHEDULER_ENABLED=true`), a 1-minute job writes each due reminder to Notifications (`type: plan_reminder`, `data.planId`), exactly once per plan, offset and planned time (unique `dedupeKey`), never for idea/draft/published/cancelled plans or more than 30 minutes late. The mobile app also schedules them as device notifications.

## Notifications & alerts
`GET /notifications?unreadOnly=`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`; legacy `GET /alerts`, `POST /alerts/:id/dismiss`.

## Files (Cloudflare R2) — `503` when R2 is not configured
`POST /files` (multipart `file` + `purpose`), `GET /files`, `GET /files/:id` (metadata + short-lived presigned URL), `DELETE /files/:id`. Owner-only; type, extension and magic bytes are checked; keys are server-generated.

## Admin — role `admin` enforced on the server, rate-limited
`GET /admin/system`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/status`, `GET /admin/connections`, `POST /admin/connections/:id/sync`, `GET /admin/sync-runs`, `GET /admin/audit-logs`. Admins never receive provider tokens. Role/status changes, manual syncs and admin logins are audited.

## Internal
`POST /internal/jobs/run` with header `x-jobs-secret` (= `JOBS_TRIGGER_SECRET`): queues due syncs and processes a bounded batch. 503 if the secret is not configured, 403 if wrong.
