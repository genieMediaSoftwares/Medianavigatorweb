# Media Navigator: remaining launch work

Reviewed: 22 October 2026. Scope: current local backend, website, admin and mobile source, configuration, documentation, automated checks and installed production dependency audits.

## Decision

**Do not launch this checkout to public customers yet.** The main product exists, but the backend cannot currently build. There is also confirmed historical secret exposure that has not been resolved locally. Public provider access and production operations still need evidence.

This is a launch readiness review, not a security certification. Local code can differ from the deployed release. Live customer accounts, hosting dashboards, provider approval dashboards and store consoles were not available for verification. Attempts to read the documented public API/website failed from this environment; that does not prove an outage.

## What already exists

- Website, mobile app and separate admin application.
- Signup/sign-in, rotating sessions, password reset implementation and account deletion.
- Instagram, Facebook, YouTube and LinkedIn adapters and OAuth implementation.
- Durable sync queue, retry handling and token encryption.
- Posts, analytics, AI reports, best times and content planning.
- Admin permissions, MFA implementation, audit logs, operational views and credit-adjustment ledger.

These are implemented features; passing live acceptance tests is a separate requirement. Older documents saying MFA/custom staff roles are absent are outdated. The earlier website audit false-success message has also been fixed.

## Must finish before public launch

| Order | Remaining work | Why it matters | Complete when | Suggested owner |
| --- | --- | --- | --- | --- |
| 1 | Fix the missing credit-service import | Backend TypeScript, build and 25 test suites fail. A new deployment from this source cannot succeed. | Remove or correctly implement the dependency according to the intended free/paid product; backend typecheck, full test suite and production build all pass. | Backend developer |
| 2 | Finish secret rotation and exposure cleanup | Local JWT and encryption secrets still match a historical committed environment file. Production usage is unknown. | Check affected environments, replace exposed credentials, migrate encrypted records safely, remove old key fallback after verification, and coordinate Git-history cleanup. Record completion without recording secret values. | Technical owner / infrastructure |
| 3 | Verify public social-platform access | A connection working for an app owner or tester does not establish customer access. | Record approval/access status and test a fresh external customer account for each advertised provider: consent, denial, import, metrics, reconnect and revoked access. Hide any provider that is not ready. | Provider-app owner + QA |
| 4 | Prove background jobs run reliably | Sync, token refresh, deep AI jobs and planner reminders depend on running processes. | Verify an always-on deployment, scheduled imports without opening the app, queue recovery after restart, token refresh, deep-analysis completion and reminder delivery. | Infrastructure + backend |
| 5 | Complete production service setup and recovery tests | Source code cannot prove that email, storage, AI or backups work in production. | Password reset email arrives and works; private upload/read/delete works; Gemini succeeds and fails gracefully; restore a backup into an isolated environment with its encryption key; rehearse rollback. | Infrastructure + QA |
| 6 | Finish public-facing privacy/help/contact information | Website legal pages contain owner/contact placeholders; mobile documentation describes behavior that differs from the backend. | Fill actual operator/support details; align web/mobile descriptions of AI media processing, retained history, planning and deletion with real behavior; test support contact. | Product owner + developer |
| 7 | Close account-deletion reliability gaps | R2 deletion failures are logged, but file records are then removed. The reviewed flow has no durable retry for leftover objects. | Provide retriable cleanup or another verified way to remove failed objects; test storage failure and interrupted deletion; document retained audit/ledger data accurately. | Backend developer |
| 8 | Complete real customer journey testing | Current unit/integration checks cannot demonstrate the whole launch experience. | Pass signup through connection, sync, analysis, planning, reconnect, reset and deletion on the deployed candidate, plus admin access/permissions/MFA and cross-user isolation. | QA + product owner |
| 9 | Establish a reproducible release process | Website default build failed locally; CI has no mobile job and no browser E2E run. Existing browser tests still expect the old embedded admin console. | Pick and verify the actual deployment build command, update stale E2E tests for separate admin, run staging smoke tests and mobile checks, and record the exact release commit and rollback version. | Developer / release owner |
| 10 | Review mobile dependency advisories and validate release builds | Mobile npm audit reports advisories; passing TypeScript does not prove a signed app works. | Assess affected dependency paths and shipped-code exposure, remediate or document justified dispositions, then test the signed release on target devices. Confirm production API configuration and distribution setup. | Mobile developer |
| 11 | Add operational launch evidence | Admin telemetry exists, but it is not an external alerting or recovery system. | Name the incident owner; prove API-down, database-down and stuck-queue alerts reach them; run expected-launch concurrency testing and set provider/AI spending alerts or caps. | Infrastructure + product owner |

### Evidence for the most urgent findings

**Backend build failure:** `backend/src/services/adminMonitoring.service.ts:8` imports `CREDIT_RULES` from `./credits.service.js`, but the corresponding source file is missing. Both TypeScript and esbuild report this exact error. Backend tests finish with 9 files passing / 25 suites failing to load; 93 individual tests pass. The failed suites did not execute their tests.

**Secret exposure:** `docs/platform-audit/SECRET_ROTATION_RUNBOOK.md` says rotation is prepared, not executed. A value comparison during this review confirmed that local `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` still match commit `475dd30`. The commit is reachable from the locally recorded remote branch `origin/claude/stoic-euler-ye2hf6`; remote server state was not refreshed. No secret values were printed. Production values have not been compared. Follow the dual-key migration procedure rather than simply replacing the encryption key.

**Background jobs:** `backend/src/jobs/index.ts` starts deep analysis in process, and starts sync/reminders according to feature switches. The external `/internal/jobs/run` trigger only queues/processes sync; it does not run the deep-analysis worker or planner reminders. A sync cron alone therefore does not establish reliability for all background features.

**Privacy/help:** `web/components/legal/legal-layout.tsx` still says operator/contact are “to be added by the owner.” Mobile `settings/help.tsx` and `settings/privacy.tsx` say disconnecting deletes synced data; `backend/src/services/connection.service.ts` and database documentation describe retaining history. Mobile privacy text also describes AI mainly as shortened captions/metrics, while current analysis supports images/videos.

**Deletion:** `backend/src/services/user.service.ts` catches object deletion errors and continues deleting file metadata. Add a reliable recovery path before claiming that all uploaded content has been removed.

**Release testing:** `.github/workflows/ci.yml` checks backend, web and admin, but has no mobile or browser E2E job. `web/tests/e2e/app.spec.ts` still expects a Users tab inside the website's `/admin`; the admin console has moved to its own app. Do not count those browser flows as verified.

## Decisions needed for launch scope

| Decision | Current reality | Practical launch choice |
| --- | --- | --- |
| Free pilot or paid product? | Credits/adjustment history exist; automatic AI credit charging and subscription payments are not implemented. AI monitoring does not track token cost. | A free pilot can launch with explicit usage/cost limits. A paid launch needs checkout/subscriptions or another agreed payment process, entitlements and charging/refund rules tested end to end. |
| Which platforms? | Four integrations exist; their production approvals are unverified. | Advertise only platforms with verified customer access. |
| Website only, Android, or iOS too? | Mobile checks pass; signed release/device/store readiness was not verified. Production API env is explicit in the preview EAS profile, but production depends on externally configured values. No iOS bundle identifier is present in the reviewed app config. | Release each surface only after its own acceptance test. Verify production environment, signing and required identifiers for the chosen targets. |
| Does Planner publish posts? | The app is designed to read social data and help users plan; users publish on the platform and can mark the plan published. | Describe it as planning/reminders. Automatic social publishing is separate future scope. |

Email verification is not implemented in the reviewed auth model/routes. For unrestricted free signup with AI access, decide how to control disposable-account abuse: verified email, invitations or another explicit control. Staff MFA already exists; enrol staff and verify production enforcement/recovery rather than rebuilding it.

## Checks run during this review

| Check | Result |
| --- | --- |
| Backend TypeScript | **Failed:** missing credit-service import |
| Backend production build | **Failed:** same missing import |
| Backend tests | **Failed overall:** 25 suites fail to load, 9 files / 93 tests pass; reproduced outside sandbox |
| Website TypeScript and lint | Passed |
| Website unit tests | **42 passed** across 8 files outside sandbox |
| Website default production build | Failed in this Windows environment: Turbopack CSS worker failure; hosted default-build status is unknown |
| Website Webpack production build | Passed using `npm run build -- --webpack` outside sandbox |
| Admin TypeScript, tests and production build | Passed; **20 tests** across 2 files; build passed outside sandbox |
| Mobile TypeScript, lint and tests | Passed; **33 tests** across 6 files |
| Backend / website / admin production dependency audit | Each returned **0 known advisories** at review time; this is not a security guarantee |
| Mobile production dependency audit | **31 affected package entries: 21 high, 10 moderate**, including transitive/tooling dependencies; these are not 31 independently proven exploitable runtime issues |
| Authenticated live browser journeys / real provider accounts | Not exercised in this review |
| Load, backup restore, deployed alerts and signed mobile release | Not verified |

Some initial tests/builds encountered sandbox temporary-file permissions. Website/admin checks were rerun outside the sandbox to distinguish those errors from source failures. Mobile audit remediation must preserve Expo/React Native compatibility: several automated audit suggestions propose incompatible major changes or downgrades. Do not apply a blind forced update.

## Launch acceptance checklist

- [ ] Release commit is identified; backend/web/admin checks pass and deployment builds are reproducible.
- [ ] Exposed secrets are replaced in all affected environments and encrypted data remains readable.
- [ ] Every advertised provider works for an approved external customer, including reconnect/revocation.
- [ ] Sync, deep analysis and reminders work while the customer is away and after service restart.
- [ ] Password reset, private storage, AI failure handling and account deletion pass against the deployed candidate.
- [ ] Staff MFA, recovery and permission checks pass on the deployed admin application.
- [ ] Real contact/legal/help information matches product behavior.
- [ ] Backup restore, rollback, alerts, capacity and cost controls are demonstrated.
- [ ] Mobile dependency findings are assessed and target release devices pass, if mobile is included.
- [ ] Product owner approves the tested free/paid scope and any explicitly deferred items.

Start with a small invited customer pilot after the blockers are closed, monitor it through background-job cycles, and expand only after the real customer flows remain reliable. There is no defensible completion percentage or firm launch date until provider approvals and production evidence are known.

## External references checked

- [Google OAuth production policy guidance](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance): production OAuth configuration and verification requirements depend on requested scopes/use.
- [LinkedIn increasing access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access): development and standard access are different; customer launch access must be confirmed in the provider console.

This review produced a report only. No app feature was changed, no deployment or account was modified, and no secret was rotated.
