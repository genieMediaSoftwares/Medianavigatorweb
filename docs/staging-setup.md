# Isolated staging for capacity verification

`medianavigator.in` is the live site. It is not an approved load-test target. Do not use a production MongoDB URI or customer tokens in load tests. No staging environment has been provisioned by this change.

## Prepare the environment

1. Create a separate MongoDB Atlas test cluster and test database. Use a new database user restricted to that database. A second database on the production cluster is insufficient isolation for a heavy capacity test because CPU, storage I/O and connection limits remain shared.
2. Create a separate Render API service and background worker services from the reviewed commit. Use the service roles in `deployment.md`. Keep the production service and environment variables untouched.
3. Create a separate Vercel project/preview deployment for staging. Set its `API_BASE_URL` to the staging API only. A proposed hostname such as `staging.medianavigator.in` is a setup choice, not an existing verified environment.
4. Configure the backend's required variables from `backend/README.md` in the staging secret manager. Generate fresh staging JWT and credential-encryption keys. Never duplicate production credentials or database connection strings in this repository.
5. Set `WEB_APP_URL`, `API_BASE_URL`, `CORS_ALLOWED_ORIGINS` and provider redirect URIs to the staging services. Use provider test accounts and an isolated AI quota/budget. Initially leave optional providers, SMTP and AI disabled until their complete test configuration is available; required limit variables must still be set.
6. Create dedicated normal/staff test accounts. Do not reuse customer accounts. Test account creation, password reset, onboarding, connection access, data deletion, MFA and rollback before capacity testing.
7. Seed synthetic user/content data at the required volume. Record user count, connected-account count, post-count distribution, document sizes and index sizes. A dataset containing 100,000 empty users does not model analytics load.
8. Issue staging-only access tokens for a representative active subset and store the fixture outside Git. Run the bounded read workload described in `scripts/load/README.md`; use separate tests for browser/proxy, login, AI quota, sync throughput and failure recovery.
9. Capture latency percentiles, errors/drops, CPU, memory, database waits, queue age and external quota/cost. Run a soak and restart drill. Do not increase traffic on the production site to compensate for an undersized staging test.

## Required handoff before execution

- Staging website URL and API URL.
- Confirmation of a separate test cluster/database and synthetic data.
- Hosting owner/budget approval for provisioned resources.
- Test identities supplied through a secret manager; no passwords pasted into chat or committed.
- Agreed peak traffic, retained data volume, sync freshness and acceptable AI spend.

## Credential incident

A database credential was shared in chat during the audit. The owner should rotate it in MongoDB Atlas and update the relevant deployment secret. Do not copy it into staging, logs, fixtures or reports. Rotation must be coordinated with deployment updates so production does not lose database access. The credential value is intentionally absent here.
