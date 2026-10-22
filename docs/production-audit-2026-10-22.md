# Production readiness audit — 22 October 2026

## Decision

**Improved and tested locally; not yet certified for 100,000 registered users.** Registered-user capacity is a storage MONGODB_URI=[database connection string redacted] operational target, not a concurrent-session guarantee. No production load test or infrastructure changes were performed. No zero-error guarantee is justified.

Scope: web, API, admin, authentication, ingestion, analytics, paid content, AI pipelines, background jobs, database configuration, dependency advisories, public UX, tests and deployment documentation. The mobile `Frontend/` application is outside this web release. This is a source-and-test audit, not an independent penetration test or a line-by-line proof of every file.

## Feature inventory and assessment

| Area | What exists | Assessment / remaining verification |
|---|---|---|
| Public site | Landing, sign-in, sign-up, password reset, public legal routes | Landing and sign-in inspected on medianavigator.in. Local marketing copy corrected to describe synced posts and supported connection methods. Legal owner/contact and policy accuracy still need owner review. |
| Account access | JWT sessions, refresh rotation/grace, account locking, password reset, deletion, staff MFA | Automated auth/security tests pass. SMTP delivery, recovery and MFA enforcement must be rehearsed on staging. |
| Onboarding | Profile setup, connection step, tour, real empty states | Existing no-mock-data behavior retained. Legacy E2E expectations are stale and do not constitute a passing journey suite. |
| Connections | Instagram/Facebook tokens plus configured provider OAuth, YouTube, LinkedIn | Credential encryption and user isolation exist. Live provider approval, token scopes, refresh/revocation and quotas are external release gates. |
| Content | Paginated library, top performers, opportunities, detail and comparisons | Existing concurrent edits to ranking/metrics were preserved. Analytics is bounded by ANALYTICS_MAX_ITEMS; this is not an unlimited-history aggregate. |
| Ads / Boosts | Marketing API retrieval, matched existing posts, independent paid metrics | API scope and identity constraints remain. Cannot guarantee inaccessible/deleted ads or historical data beyond provider retention. |
| Intelligence | Measured/calculated facts, AI interpretations, creative reviews, queued deep analysis, audience evidence | JSON schemas and evidence validation exist. Older prompt requests for unmeasured retention/algorithm explanations corrected; every generation entry point now adds an untrusted-evidence rule. Prompt text is defense in depth, not a guarantee against model mistakes. |
| Planning | Time-zone-aware recommendations, plans, reminders | Functional tests pass. Reminder delivery and contention need a multi-worker soak test. |
| Administration | Separate app, permissions, MFA, audit trail, AI/error telemetry, credit adjustments | Admin tests pass. Configure staff MFA enforcement and restrict operational access before public launch. |
| Accessibility | Responsive layouts, labels, loading/error states, skip link | Tabs and segmented selectors now support arrows/Home/End and one keyboard stop. Full mobile, screen-reader and WCAG review remains unverified. |

## Changes made during this audit

1. **Atomic credit operations:** conditional MongoDB updates prevent concurrent spending/free-check calls from driving balances negative. Legacy missing fields are initialized logically within the same atomic operation. Invalid amounts are rejected. These helpers are not currently called by AI endpoints; a pricing/enforcement policy must be implemented before billing relies on them.
2. **Worker isolation:** added `backend/src/worker.ts` and `npm run start:worker`. `DEEP_WORKER_ENABLED=false` allows API replicas to stop launching deep-analysis workers. No hosting settings were changed.
3. **Lifecycle:** serial, awaitable worker loops prevent overlapping scheduler ticks and let shutdown wait for in-flight jobs. Host termination deadlines may still interrupt long work; durable leases recover it after expiry.
4. **Scheduler fairness:** already queued due accounts are advanced so the same first page cannot starve later accounts. Regression test covers a backlog larger than one batch. Terminal sync updates are fenced by lease owner and stale leases cannot finish/requeue a replacement worker’s run.
5. **Database pressure:** configurable pool size and finite connection-acquisition wait; disabled command buffering while disconnected; bounded health ping. Pool-exhaustion/operation timeout errors return a temporary-unavailable response.
6. **AI lifecycle:** clear multimodal deadline timers, abort timed-out generation, limit in-process concurrent generation, delete temporary uploads when processing fails, avoid raw multimodal provider errors in logs. Provider cancellation can be best effort and does not prove billing stopped.
7. **AI evidence:** corrected contradictory performance prompts, invalidated old prompt-version caches, added a shared instruction boundary covering captions, JSON strings, comments, OCR and speech. Model output still requires validation and human calibration.
8. **Rate limits:** authenticated users use verified identities instead of sharing one web-server IP bucket. Invalid tokens and login endpoints retain IP limits; database-backed limits stay shared across replicas. JWT keying does not replace session/revocation checks.
9. **UI:** keyboard navigation and unique tab IDs; truthful landing copy about synced content, connection methods and sufficient posting history.
10. **Operations:** documented worker topology and added a bounded read-only staging workload script with latency/error thresholds and guards against known production hosts.

## Remaining launch gates, ordered by impact

| Priority | Gate | Concrete acceptance evidence |
|---|---|---|
| P1 | Realistic capacity test | Isolated staging with 100,000 synthetic registered users, representative connected accounts/posts and indexes; stepped traffic and 24-hour soak. Measure the authenticated API and the web proxy independently. |
| P1 | Production topology and recovery | Always-on API replicas and separate sync/deep workers; MongoDB backup restore rehearsal; queue-age, database and provider alerts; tested rollback. |
| P1 | API/AI cost and fairness | Provider quota headroom, distributed admission/fairness, tenant-level job quotas and a documented credit policy. Per-process generation limits do not cap fleet-wide cost. |
| P1 | Queue fencing under failure | Sync finish/requeue writes now check lease ownership; content persistence rechecks ownership and connection identity. Validate multi-collection reconnect races and worker-kill recovery under staging contention before scaling aggressively. Deep-report updates already use owner predicates. |
| P1 | Login traffic behind the web proxy | Login/IP buckets can still represent a shared proxy IP. Establish a trusted client-IP forwarding boundary or edge limits; do not trust arbitrary client X-Forwarded-For headers. Load-test login independently. |
| P1 | Authenticated browser journeys | Replace stale E2E selectors/assumptions, then run real sign-up, onboarding, connect, sync, compare, deep report, planner, deletion and staff workflows using disposable staging accounts. No customer credentials were used. |
| P2 | Analytics at high data volumes | Measure document reads/CPU; move frequent summaries toward incremental aggregates. Show coverage when the configured item cap is reached. Validate indexes with query execution plans. |
| P2 | Long-running report routes | Some older AI endpoints remain synchronous and may exceed hosting request limits. Move customer entry points to queued status/polling flows and verify cancellation. |
| P2 | End-to-end cancellation | Sync's outer Promise timeout does not cancel every nested provider operation; bound body reads and propagate abort signals through adapters. |
| P2 | Prompt regression quality | Curated real-media evaluation set: multiple languages, silent clips, long videos, adversarial captions, absent metrics, inaccurate timestamps and repeated recommendations. Require evidence correctness and actionable distinct sections, not only valid JSON. |
| P2 | Full UX/accessibility | Mobile widths 360/390/768 px, keyboard-only and screen reader, long titles/counts, expired media, offline, quota, slow sync, empty and partial states. |
| P2 | Telemetry | Add request latency histograms, queue age, provider rate-limit metrics, memory/event-loop lag and real AI token/cost accounting; current telemetry does not supply all of these. |

## Capacity model (assumptions, not measurements)

User-confirmed target: **100,000 registered users**. Initial planning scenario: 2,000 simultaneously active sessions (2%), 10,000 daily active users. Replace these assumptions with analytics before choosing instance counts.

- One foreground request per session every 30 seconds is about **67 requests/second**, before navigation bursts and background polling. Test 10 → 50 → 100 → 200 requests/second with production-like datasets and separate burst tests.
- If all 100,000 users connect two accounts and every account syncs hourly, that is **55.6 sync jobs/second**. At an assumed 15 seconds/job and 70% utilization it needs roughly **1,191 concurrent worker slots**. This is an illustration of why cadence and provider quotas matter, not a recommended deployment size.
- The same two accounts with daily sync require about **2.3 jobs/second**; activity-aware scheduling and incremental retrieval are essential. Actual sync durations must be measured per provider/account size.
- Database capacity depends on retained posts: 100,000 users × 2 accounts × 500 posts means **100 million content documents**, before analyses, jobs and indexes. User count alone is not a sizing specification.
- Keep total `replicas × MONGODB_POOL_SIZE` inside the database connection budget, including worker/admin/API processes. Increasing the pool alone does not create database capacity.

Proposed release SLOs: read API p95 < 1 s, p99 < 2.5 s, unexpected errors + dropped load < 1%; no cross-user data or lost durable jobs; no negative credits; queue-age within the chosen freshness SLA. These are targets, not achieved measurements. Track external provider failures separately without hiding their customer impact.

## Verification record

- Final full backend run: 429 tests passed across 40 files.
- Web: 58 unit tests, TypeScript, lint and production webpack build passed.
- Admin: 20 tests, TypeScript and production webpack build passed.
- API and separate worker production bundles built successfully.
- npm production dependency audit: zero reported advisories in backend, web and admin at the time checked. This is not a security guarantee.
- Staging workload script dry-run validated; no performance traffic sent to production.
- Public website landing/sign-in inspected; authenticated journeys and mobile visual QA were not completed. A local production preview correctly showed the backend-unreachable error for an existing session because no local API was running; this does not verify the authenticated application.
- No infrastructure purchase, production deployment or database migration was performed. This hardening change is prepared for review and staging verification; a Git push does not certify production readiness.

The supplied environment address was the production domain, not verified staging. Use [the isolated staging setup](staging-setup.md) before load testing. No supplied database credential was used.

## Release sequence

1. Review this diff separately from pre-existing uncommitted ranking/connection changes.
2. Deploy the API/worker configuration to isolated staging; retain existing encryption keys and secrets.
3. Seed representative staging-only data and issue test tokens for many different users; never copy production tokens into fixtures.
4. Complete P1 gates above, then run workload/soak/restart tests and record actual throughput, costs and bottlenecks.
5. Canary the release, monitor latency/queue lag/provider failures, and expand only after passing the SLOs. Roll back code/config together if errors rise; never rotate the credential-encryption key as a rollback step.
