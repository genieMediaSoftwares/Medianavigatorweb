# Production pilot execution evidence

Starting point: `main`, commit `0e5c8c77a8d600852e129b9ede541869bed50f97`, 22 October 2026.

Preserved pre-existing changes: Frontend/eas.json, package.json, package-lock.json, secure-storage.ts, vitest config rename, root .easignore and the readiness report. No production deployment, credentials, provider accounts or shared history will be changed by this work. Owner confirms Instagram and YouTube live-token integrations work; preserve them.

## Live checklist

- [x] Read execution instructions, readiness report, rotation runbook, branch/status/history and component instructions.
- [x] Reproduce backend typecheck and build failure: both exit 1, missing `./credits.service.js` in admin monitoring.
- [ ] Restore backend checks, keeping charging/payments deferred.
- [ ] Verify security controls and prepare exposure remediation without rotating live secrets.
- [ ] Verify analysis success, errors, duplicate requests and restart recovery; fix demonstrated defects.
- [ ] Provide reliable worker/scheduler execution and operational visibility.
- [ ] Implement durable account/storage deletion and recovery tests.
- [ ] Verify reset email/token and storage error handling using isolated test doubles.
- [ ] Preserve social adapters and verify regression coverage.
- [ ] Make website/admin builds reproducible and correct public documentation/contact configuration.
- [ ] Assess mobile advisories, bundle, and attempt signed testing APK; record actual outcome.
- [ ] Add current-architecture browser E2E, mobile CI and secret/dependency checks.
- [ ] Exercise isolated recovery/capacity checks and record exact remaining production actions.
- [ ] Review final diff and run required checks.

## Owner decisions / external checks

Pending: pilot signup policy, actual operator name/support email; public provider approvals; production credential rotation/history cleanup; deployment/monitoring/backups; physical Android device availability. Continue independent repository work while these remain pending.

## Credit system

Charging, purchases, subscriptions, pricing, entitlements and refunds remain deferred. Preserve current balances, adjustment ledger and administrative permissions. Monitoring reports unavailable credit rules rather than inventing them.

## Continuation evidence — 22 October 2026 (second session)

Nothing was committed, pushed, deployed or rotated. Credit charging stays disabled (`billing.chargingEnabled: false`, `creditRules: null`, asserted in `backend/tests/adminMonitoring.test.ts`).

| Check | Command | Result |
| --- | --- | --- |
| Backend typecheck | `cd backend && npm run typecheck` | Pass |
| Backend build | `cd backend && npm run build` | Pass: `dist/server.mjs`, `dist/worker.mjs` |
| Backend tests | `cd backend && npm test` | 411 passed, 1 failed (see open decision below) |
| Built worker smoke test | `dist/worker.mjs` against in-memory MongoDB with dummy test config | All 5 tasks heartbeat; after kill + restart, an expired-lease deletion completed |
| Admin | `cd admin && npm run typecheck && npm test && npm run build` | Pass; 20 tests |
| Website | `cd web && npm run typecheck && npm run lint && npm test && npm run build` | Pass; 42 tests; default build passed on this machine |
| Mobile | `cd Frontend && npx tsc --noEmit && npm run lint && npm test` | Pass; 33 tests |
| Expo compatibility | `npx expo-doctor` | 21/21 after `expo@~57.0.31`, `expo-router@~57.0.29` |
| Mobile bundle API URL | `npx expo export --platform android` | Bundle contains `https://medianavigator-api.onrender.com`; no localhost/LAN URLs |
| Testing APK | `expo prebuild` + `gradlew assembleRelease` | **Not produced**: Gradle 9.3.1 download timed out (no network access to services.gradle.org; local cache is partial) |
| Production dependency audit | `npm audit --omit=dev` | backend/web/admin 0; mobile 28 (21 high, 7 moderate), every remaining fix is an incompatible major downgrade |

### Open decision: provider-account ownership
`tests/sync.test.ts › will not let a second user take over a provider account that is already connected` expects 409. Commit `7d13013` intentionally allows several users to connect the same provider account (`connection.service.ts` comment, non-unique index). This failure predates this work. The test was left unchanged. The owner must choose between restoring single ownership and updating the test to assert per-user isolation instead.

### Secret exposure (no values recorded)
Commit `475dd30` added `backend/.env` (reachable from `origin/claude/stoic-euler-ye2hf6`). It contains `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`, whose local values are still identical, and a `MONGODB_URI` that differs from the current local value but is still exposed; it is a remote (Atlas) URI with an embedded database username and password, so it is the most urgent item. The file contains no provider, Gemini, R2 or SMTP keys. Follow `docs/platform-audit/SECRET_ROTATION_RUNBOOK.md` §4 with approval for each step. Consequences: changing the Atlas user's password disconnects every service using that user until its `MONGODB_URI` is updated; rotating `JWT_SECRET` invalidates outstanding access tokens and clients refresh silently once (refresh tokens are server-side hashes, so users are not signed out); the encryption key must use the two-key migration (`CREDENTIAL_ENCRYPTION_KEY` + `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS`, then `scripts/reencrypt-secrets.ts`), because changing it alone makes every stored provider token, PKCE verifier and staff MFA secret unreadable. The API and the dedicated worker must receive identical new values and both be restarted. History cleanup (delete `claude/stoic-euler-ye2hf6`, `git filter-repo`, force-push, re-clone) rewrites shared history and needs explicit owner authorisation.

## Configuration and cleanup round — 22 October 2026 (third session)

Nothing committed, pushed, deployed or rotated. Credit charging still disabled; a new test (`backend/tests/ai.test.ts` › credit charging is on hold) proves analyses — successful, re-run, video and with the provider unavailable — leave balances, free checks and the ledger unchanged.

**Configuration:** each app now has a single source (its own `.env` locally, platform env when hosted). Removed the web/admin `next.config.ts` fallback that silently read `API_BASE_URL` from `backend/.env`. Fixed the bundled backend reading a repository-root `.env` (now always `backend/.env`). Production validation added: web and admin require an https `API_BASE_URL`; web requires `OPERATOR_NAME` and `SUPPORT_EMAIL` (legal pages no longer show placeholders) and validates `ADMIN_APP_URL`; mobile release bundles require an https `EXPO_PUBLIC_API_BASE_URL`, pinned in both EAS installable profiles. See `docs/deployment.md` › Configuration by application.

**Removed (unreferenced; verified before deletion):** `preview-mock-api.mjs` (demo API with fabricated metrics), `scratchpad/*.cjs` (scripts seeding fake YouTube content into a live database), `.preview-src.tgz` (duplicate web source snapshot), three Python wheels, `backend/scripts/check-video-analysis.ts` (one-off script decrypting a specific account's live token), unused dependencies (web: two Radix packages, `dotenv`, `@testing-library/user-event`, `jsdom`; admin: three Radix packages).

**Ownership decision evidence:** `backend/tests/sharedProviderAccount.test.ts` proves that, under the current shared model, two users of one provider account keep separate encrypted tokens, content and deletion. The original 409 test is unchanged and still fails pending the owner's decision.

| Check | Result |
| --- | --- |
| Backend typecheck / build / tests | Pass / pass / 413 of 414 (only the ownership test fails) |
| Web typecheck, lint, tests, production build | Pass; 45 tests; build passes with https API origin and fails (by design) with the local http origin |
| Admin typecheck, tests, production build | Pass; 22 tests; same https guard verified |
| Mobile typecheck, lint, tests, Android export | Pass; 37 tests; bundle contains the Render URL, no secret variable names; only `localhost` string is React Native's own dev-server constant |
| Audits (`--omit=dev`) | backend/web/admin 0; mobile 28 (21 high, 7 moderate), unchanged, all fixes are incompatible major downgrades |
| Local release APK | **Failed**: native CMake step hit the Windows 260-character path limit (react-native-gesture-handler codegen object path ≈359 chars; a short drive letter still leaves ≈332). Build in EAS (Linux) or on a machine with long-path support |
| Website E2E (Playwright) | Not run: needs a running stack and test-account credentials. Stale admin-console tests rewritten for the separate admin app |
