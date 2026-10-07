# Database (MongoDB Atlas, Mongoose)

| Collection | Purpose | Key indexes |
|---|---|---|
| `users` | accounts, role, lockout state | `email` unique; `role,status` |
| `profiles` | name, organization, timezone, onboarding | `userId` unique |
| `sessions` | refresh-token hashes, revocation | `refreshTokenHash` unique; `userId,revokedAt,expiresAt`; TTL 30d after expiry |
| `passwordresets` | hashed reset tokens | `tokenHash` unique; TTL on `expiresAt` |
| `oauthstates` | single-use OAuth state | `stateHash` unique; TTL on `expiresAt` |
| `connectedaccounts` | one per user per platform; **encrypted** credentials; status; sync schedule | `userId,platform` unique; `platform,providerAccountId` unique where `active`; `active,nextSyncAt` |
| `contentitems` | normalized posts/videos | `connectedAccountId,providerMediaId` unique; `userId,publishedAt`; `userId,platform,publishedAt`; `userId,legacyId` unique |
| `analytics` | daily per-account snapshot (`calcVersion`) | `connectedAccountId,date` unique; `userId,date` |
| `syncruns` | durable queue + history | `connectedAccountId` unique where `active` (one active run); `status,queuedAt`; `connectedAccountId,queuedAt` |
| `notifications` | notifications and derived alerts | `userId,createdAt`; `userId,dedupeKey` unique (partial) |
| `files` | R2 object metadata only | `key` unique; `userId,status,createdAt` |
| `aicaches` | cached AI output | `userId,cacheKey` unique; TTL on `expiresAt` |
| `plannedcontents` | user planner entries | `userId,createdAt` |
| `auditlogs` | admin/security events (no secrets) | `createdAt`; `actorId,createdAt`; `action,createdAt` |

## Rules
- Created with `createIndexes` at startup (additive only). **The app never drops collections, resets data, seeds data, or runs destructive migrations.** Schema changes that need a data migration must be documented and run deliberately.
- Content identity is `(connectedAccountId, providerMediaId)`; sync is an idempotent bulk upsert.
- Metrics a platform cannot supply are listed in `unavailableMetrics` instead of being stored as real zeros.
- List endpoints are cursor-paginated and capped by `MONGODB_QUERY_MAX_LIMIT`.

## Lifecycle
- **Disconnect**: status `disconnected`, `active=false`, encrypted credentials wiped (`null`), no further syncs; historical content and snapshots are retained (hidden from analytics and feeds).
- **Delete account**: sessions revoked; connections' credentials wiped and records removed; the user's content, snapshots, notifications, files (R2 objects deleted best-effort), planner and AI cache are deleted; the profile is removed; the user row is kept as an anonymized, disabled tombstone (no email/password) so audit references remain valid. Only rows owned by that user id are touched (tested).
- **Retention**: expired sessions, reset tokens, OAuth states and AI cache entries expire via TTL indexes.

## Backups
Use Atlas backups/Cloud Backup on production. Back up `CREDENTIAL_ENCRYPTION_KEY` separately from the database.
