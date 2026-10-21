# Secret exposure and rotation runbook

Status: **prepared, not executed.** Every step that changes a deployed system, rotates a key or rewrites git history needs explicit approval from the system owner. No secret value appears in this document.

## 1. Exposure scope (verified 21 Oct 2026, by comparing hashes only)

| Item | Finding |
|---|---|
| Affected file | `backend/.env` |
| Commit | `475dd30` "Add backend environment configuration file" (12 Oct 2026) |
| Reachable from | Remote branch `origin/claude/stoic-euler-ye2hf6` on GitHub. **Not** in `main` or `origin/main` |
| Variables in that commit | `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `MONGODB_URI`, plus a commented MongoDB Atlas connection string containing a database username and password |
| Still in use locally | `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` in today's local `backend/.env` are **identical** to the committed values. `MONGODB_URI` differs |
| Local file | The local `backend/.env` currently contains **2** commented lines with credential-bearing MongoDB connection strings |
| Unknown (needs the owner) | Whether any deployed environment uses these values; whether the repository is or was public or shared outside the team |

## 2. What depends on each secret

| Secret | Protects | Effect of rotation |
|---|---|---|
| Atlas database user (in the commented URI) | Direct database access | Rotating breaks nothing if no service uses that user. Confirm in Atlas before deleting it |
| `JWT_SECRET` | Signing of short-lived access tokens. The API also requires a live server-side session for the token's user, which limits forgery | All access tokens become invalid. Clients refresh silently: refresh tokens are server-side hashes and are unaffected |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM encryption of: provider tokens (`connectedaccounts.credentialsEnc`), OAuth PKCE verifiers (`oauthstates.codeVerifierEnc`), staff MFA secrets (`users.mfa.secretEnc`, `users.mfa.pendingSecretEnc`) | **Changing it alone makes all of these unreadable.** Locally this means 3 active connections (YouTube, Instagram, Facebook) would stop syncing, and any enrolled MFA would stop working. Use the dual-key procedure below |

## 3. Preserving token readability (implemented locally, not deployed)

- `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` (optional): when set, `decryptSecret` tries the current key and then the previous key. AES-GCM authentication rejects a wrong key, so this is unambiguous. New values are always encrypted with the current key (`backend/src/lib/crypto.ts`). Tested in `backend/tests/security.test.ts`.
- `backend/scripts/reencrypt-secrets.ts` moves every value to the current key. It is a **dry run by default**; `--apply` writes. Each write is conditional on the old ciphertext still being stored, so a token the sync worker refreshed meanwhile is never overwritten. It prints counts only. A dry run against the local development database reported 3 values already on the current key, 0 to move, 0 unreadable.

## 4. Rotation procedure (each step needs approval)

1. **Confirm usage.** On each environment, the operator compares hashes of the deployed values with the exposed ones (for example `printf %s "$VALUE" | sha256sum`), never printing values. Record which environments are affected.
2. **Database user.** In MongoDB Atlas, rotate the exposed user's password or delete the user. Update `MONGODB_URI` wherever that user is used. Rollback: restore the previous URI if a service fails to connect, then fix forward.
3. **JWT secret.** Generate one (`openssl rand -base64 48`), set `JWT_SECRET`, restart the API. Expect one silent refresh per client. Rollback: restore the old value (only while it is still considered safe).
4. **Encryption key.**
   1. Generate a new key: `openssl rand -base64 32`.
   2. Set the new key as `CREDENTIAL_ENCRYPTION_KEY` and the old one as `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS`. Restart the API. Everything stays readable.
   3. Run `npx tsx scripts/reencrypt-secrets.ts` (dry run) and check that `unreadable` is 0.
   4. Run it with `--apply`. Run the dry run again: `toMove` and `unreadable` must both be 0.
   5. Trigger one sync per platform (admin panel → Social connections → Sync) and confirm success.
   6. Remove `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` and restart.
   - Rollback: until step 6, setting the old key back as current keeps everything readable, because re-encrypted values are readable through `_PREVIOUS`, so swap the two. After step 6, the old key alone cannot read re-encrypted values. Keep it in the secret store until the rotation is confirmed.
5. **Repository.** Delete the remote branch `claude/stoic-euler-ye2hf6`, purge `backend/.env` from history (`git filter-repo --path backend/.env --invert-paths`), force-push the affected refs, and ask collaborators to re-clone. If the repository was ever public, ask GitHub Support to clear cached views. This rewrites history and needs team coordination.
6. **Local cleanup.** Remove the commented credential lines from local `backend/.env` files.
7. **Back up the new key** separately from database backups (`docs/database.md`). A database backup is useless without its key.
