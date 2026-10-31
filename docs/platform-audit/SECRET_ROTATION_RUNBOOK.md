# Secret exposure and rotation runbook

Status: **prepared, not executed.** Every step that changes a deployed system, rotates a key or rewrites git history needs explicit approval from the system owner. No secret value appears in this document.

## 1. Exposure scope (rechecked 26 Oct 2026, equality results only)

| Item | Finding |
|---|---|
| Affected file | `backend/.env` |
| Commit | `475dd30` "Add backend environment configuration file" (12 Oct 2026) |
| Reachable from | Locally recorded remote ref `origin/claude/stoic-euler-ye2hf6`; not local `main`. Remote server refs were not refreshed; this does not prove current GitHub reachability |
| Variables in that commit | `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `MONGODB_URI`, plus a commented MongoDB Atlas connection string containing a database username and password |
| Still in use locally | `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` in today's local `backend/.env` are **identical** to the committed values. `MONGODB_URI` differs |
| Local file | The local `backend/.env` currently contains **2** commented lines with credential-bearing MongoDB connection strings |
| Unknown (needs the owner) | Whether any deployed environment uses these values; whether the repository is or was public or shared outside the team |

## 2. What depends on each secret

| Secret | Protects | Effect of rotation |
|---|---|---|
| Atlas database user (in the commented URI) | Direct database access | Rotating breaks nothing if no service uses that user. Confirm in Atlas before deleting it |
| `JWT_SECRET` | Signing of short-lived access tokens. The API also requires a live server-side session for the token's user, which limits forgery | Rotation alone invalidates access tokens but leaves refresh sessions valid. For this exposure, also revoke affected sessions during a coordinated cutover, requiring website/mobile/admin re-login |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM encryption of: provider tokens (`connectedaccounts.credentialsEnc`), OAuth PKCE verifiers (`oauthstates.codeVerifierEnc`), staff MFA secrets (`users.mfa.secretEnc`, `users.mfa.pendingSecretEnc`) | **Changing it alone makes old-key values unreadable.** Matching stored connections, pending OAuth and enrolled MFA would fail. The earlier local connection count is not a fresh database inventory. Use the dual-key procedure below |

## 3. Preserving token readability (implemented locally, not deployed)

- `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` (optional): when set, `decryptSecret` tries the current key and then the previous key. AES-GCM authentication rejects a wrong key, so this is unambiguous. New values are always encrypted with the current key (`backend/src/lib/crypto.ts`). Tested in `backend/tests/security.test.ts`.
- `backend/scripts/reencrypt-secrets.ts` is a **dry run by default**; `--apply` writes. The 26 October local revision preflights all four encrypted fields before any writes, including malformed/unsupported/non-string values. Any unreadable value blocks the whole write pass. Writes compare the original ciphertext so a concurrent refresh is never overwritten. A final full scan must show zero `toMove` and `unreadable`. Output contains field names/counts/status only. Partial database/network failure is resumable with both keys retained. No migration has been run against the owner's local or hosted database in this follow-up; drills use synthetic keys and disposable MongoDB.

## 4. Rotation procedure (each step needs approval)

1. **Confirm usage and recoverability.** Inventory production, staging, preview, local development, all API replicas, dedicated workers, cron/admin scripts, CI/deployment secret stores and retained backups. Compare secret equality inside trusted operator tooling and record only affected/not affected, never values or stable fingerprints. Record exact database and release candidate identifiers. Back up the database and securely retain the matching key versions separately. Prove an isolated restore can decrypt provider, PKCE and both MFA fields. Generate new independent keys directly into an approved secret manager; do not print them into terminals/chat/logs or save them in Git. Approve a maintenance window and recovery operator.
2. **Database user.** Rotate every exposed Atlas database principal, including credentials from commented historical URIs. Prefer a new least-privilege principal: switch all authorized services, verify connectivity, then disable the old principal and inspect Atlas access logs/network rules. Do not restore known-exposed credentials as routine rollback. If application rollback is needed, keep the new database credential and fix forward. The differing local URI does not prove the historical user was disabled.
3. **JWT and sessions.** Restrict sign-in/refresh issuance and drain old API instances during the approved cutover, so sessions cannot be minted between revocation and the new-key rollout. Replace `JWT_SECRET` consistently on all token-verifying/signing processes and the shared worker configuration. Revoke existing affected server-side sessions with a documented cutover boundary; verify both old access and refresh tokens fail. Resume login on new-key instances and test fresh sign-in, staff MFA and cross-client logout. Users must sign in again on website, mobile and admin; app passwords do not change. Do not delete accounts or provider connections. Reverting application code must retain the new JWT key and session revocations. Do not re-enable the exposed signer.
4. **Encryption key.**
   1. Generate an independent random 32-byte key directly into the approved secret manager, stored as base64. Do not display the value in terminal output or chat.
   2. Set the new key as `CREDENTIAL_ENCRYPTION_KEY` and the old one as `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` on **every** API/worker/cron/script process that accesses the same database. First verify all running code supports dual-key reads. Drain/pause old-only readers/writers during this coordinated transition: an old-only instance cannot read new ciphertext. Do not begin migration until the entire fleet has the intended key pair. New writes use only the new current key. Both old and new ciphertext stay readable by the updated fleet.
   3. Run `npx tsx scripts/reencrypt-secrets.ts` (dry run) and check that `unreadable` is 0.
   4. Only after separately approved environment-specific dry-run counts show no unreadable values, run with `--apply`. A preflight failure writes nothing; an interruption mid-pass may leave mixed key versions, so keep both keys and resume. The script verifies all fields after writing. Run another dry run: `toMove` and `unreadable` must both be 0 in every field. Resolve `skippedChanged` through the rescan, not by forcing an overwrite. No database IDs, plaintext or ciphertext belong in the report.
   5. Using approved controlled accounts, verify each platform's decrypt/refresh/sync, an in-flight/new OAuth PKCE callback, staff MFA and MFA enrolment. External requests require approval. Prove a new backup is decryptable with the new key alone in an isolated restore. Confirm no old-only writer can restart with stale configuration.
   6. Remove `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` from the API and the worker and restart both.
   - Recovery: while mixed ciphertext exists, keep **both** keys in every recovery process. Prefer code rollback with the new/current plus old/previous pair intact. An emergency swap also needs both keys and reintroduces writes under the exposed key, so requires an explicit incident decision. An old-only build/key cannot safely roll back a partially migrated database. Runtime removal of the previous key is separate from controlled retention needed for older backups. Restore old backups only into isolation with their matching keys; migrate before serving them. Never remove the only key that can read a retained backup.
5. **Repository.** After credential rotation, separately plan exposure/history cleanup with the team and GitHub Support as needed. No branch deletion, history rewrite or force-push is authorized by this audit. History cleanup cannot invalidate already-copied secrets and never substitutes for rotation.
6. **Local cleanup.** Remove the commented credential lines from local `backend/.env` files.
7. **Back up the new key** separately from database backups (`docs/database.md`). A database backup is useless without its key.

## 5. Limits and conditional credential replacement

Changing the encryption key protects future storage but cannot undo disclosure of old ciphertext plus the old key. If database access/log review cannot rule out theft, plan provider-token revocation/reconnection and staff MFA re-enrolment/recovery-code replacement separately with the owner. Re-encrypting the same provider token does not revoke a stolen copy. Temporary PKCE states may instead be invalidated with users retrying consent, but that also needs approval. No evidence in the inspected historical file proves SMTP, Resend, R2, Gemini or social application secrets were exposed; inventory them and rotate if their own evidence warrants it, rather than silently replacing unrelated credentials.

Local fixes/tests do not authorize any live execution of this procedure. Record approval, environment, maintenance window, counts, operator and recovery plan before each hosted change. Do not paste secret values here.
