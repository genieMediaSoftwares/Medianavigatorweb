# Authentication & authorization

## Passwords
bcrypt (`PASSWORD_HASH_ROUNDS`). Min 8 chars with a letter and a number. Hashes are `select:false` and never returned or logged. Login does one bcrypt comparison even for unknown emails (no timing-based user enumeration) and returns the same message for "unknown email" and "wrong password". After `LOGIN_MAX_FAILED_ATTEMPTS` failures the account is locked for `LOGIN_LOCKOUT_MINUTES`.

## Tokens
- **Access token**: JWT HS256, short-lived, claims `sub`, `sessionId`, `role`, `iat`, `exp` only.
- **Refresh token**: opaque random value; only its SHA-256 hash is stored in the `sessions` collection.
- **Rotation + reuse detection**: each refresh issues a new refresh token. Presenting an already-rotated token revokes the whole session.
- Every authenticated request checks, in MongoDB, that the session is live and unexpired and that the account is active; the **role is read from the database**, so a demoted admin loses access immediately even with an old token.
- Revocation: logout (this session), logout-all, password change (other sessions), password reset (all), account disable/delete (all), session cap `MAX_SESSIONS_PER_USER`.
- Clients send tokens in the `Authorization` header (no cookies → no CSRF surface). Store refresh tokens in the platform keychain/secure storage on mobile.

## Password reset
`forgot-password` stores only a hash of a random token (single-use, `PASSWORD_RESET_TOKEN_TTL_MINUTES`) and emails a link to `WEB_APP_URL/reset-password?token=…`. Without SMTP configured the endpoint returns 503 rather than pretending to send.

## Roles
`user` and `admin`. `authenticate` then `requireRole('admin')` guard `/api/v1/admin/*`. The first admin is created manually with `npm run admin:create -- <email>`; nothing is seeded at startup and registration can never set a role.

## Ownership
Identity is derived from the session only. All user-owned repository functions take the owner id as a mandatory filter (media, connections, sync runs, notifications, files, planner, AI cache). Cross-user access returns 404 (not 403) so ids cannot be probed. This is covered by automated tests for media, sync runs, notifications, files, planner and OAuth state.

## Provider OAuth
`POST /connections/:platform/oauth/start` creates a server-side state bound to the user (stored hashed, single use, `OAUTH_STATE_TTL_SECONDS`). The callback consumes the state atomically, rejects unknown/expired/replayed/wrong-platform states without calling the provider, exchanges the code (PKCE verifier for YouTube), encrypts the tokens, and redirects to the web app with no secrets in the URL. Authorization codes are never stored.
