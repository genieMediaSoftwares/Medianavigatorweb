# Admin roles, MFA and credit ledger: migration and rollback plan

Status: implemented and tested **locally only**. Nothing has been applied to a shared or production database, and nothing has been deployed. The project has no migration framework: Mongoose creates declared indexes at startup (`ensureIndexes`) and never rewrites documents.

## 1. Schema changes (all additive)

| Change | Collection | Data rewrite? | Old code reading new data | New code reading old data |
|---|---|---|---|---|
| `User.role` enum widened to `user, admin, super_admin, ops_admin, support, auditor` | users | No | Fine for `user`/`admin`. Users given the new roles would fail old enum validation on save and be denied by the old `requireRole('admin')` | `admin` keeps every permission (an alias of `super_admin`) |
| `User.mfa` sub-document (`enabled`, encrypted `secretEnc`/`pendingSecretEnc`, `enabledAt`, `lastUsedStep`, hashed `recoveryCodeHashes`) | users | No (absent means off) | Ignored: MFA-enabled staff could sign in with only a password (a security downgrade, not a lockout) | Absent means MFA off |
| `Session.reauthAt` | sessions | No | Ignored | Null means "re-confirm before high-risk actions" |
| `CreditTransaction` (new) with index `{userId, createdAt, _id}` | credittransactions | No | Ignored | Empty means "no adjustments recorded"; no history is invented |
| New optional env: `STAFF_MFA_REQUIRED`, `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` | — | — | Unknown variables are ignored | Absent means off / not rotating |

## 2. Existing administrator accounts

- The local development database has **1** staff account, with role `admin`. It keeps full access with no change: `admin` maps to the complete permission set, and the last-super-admin safeguard counts both `admin` and `super_admin`.
- No rename is needed. Renaming `admin` to `super_admin` is optional cosmetics and can be done later through the admin UI (it is audited).
- After deployment every staff action on role, status, credits or MFA reset asks for the password (step-up) once per 5 minutes. This is a new prompt, not a lockout.

## 3. Rollout sequence

1. Deploy the backend with `STAFF_MFA_REQUIRED` unset. Behaviour for customers on web and mobile is unchanged (verified by the existing auth and planner suites).
2. Deploy the admin app (sign-in code step, Security page, step-up dialog).
3. Each staff member enrols at **Admin → Security** and stores their recovery codes.
4. Verify that nobody is missing: count staff without MFA (`role ≠ user`, `deletedAt = null`, `mfa.enabled ≠ true`); the result must be 0.
5. Set `STAFF_MFA_REQUIRED=true` and restart. Un-enrolled staff then get `MFA_ENROLLMENT_REQUIRED` on admin endpoints but can still open Security to enrol.

## 4. Recovery and break-glass

| Situation | Path |
|---|---|
| Lost phone, has recovery codes | Sign in with a recovery code (single use), then set up again on the Security page |
| Lost phone and codes | Another super administrator uses **Reset two-step sign-in** on the person's customer page (step-up and audit required). The person is signed out everywhere and enrols again |
| Last super administrator lost phone and codes | No one in the app can reset them, and turning `STAFF_MFA_REQUIRED` off does not help (their own MFA still applies at sign-in). A database operator sets `mfa.enabled=false` and clears `mfa.secretEnc` on that one user, under a recorded change ticket. The person signs in and enrols again. Recommendation: always keep at least two enrolled super administrators |

## 5. Rollback

1. Before rolling back the backend, set any users with `super_admin`, `ops_admin`, `support` or `auditor` back to `admin` or `user`. Old code only understands those two roles.
2. Roll back the code. The extra fields and the `credittransactions` collection can stay: old code ignores them and they cost nothing.
3. Unset `STAFF_MFA_REQUIRED`. Do **not** remove `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` if a key rotation is in progress (see `SECRET_ROTATION_RUNBOOK.md`).

## 6. Billing

Credit **charging is not enabled**. `creditService` still has no callers, and no endpoint is billable. The ledger records only admin adjustments made from now on (`kind: admin_adjustment`), with reason, actor and resulting balance. Enabling charges needs an approved product decision: which endpoints, prices, free checks, refunds on AI failure, and the error clients show when the balance is insufficient.
