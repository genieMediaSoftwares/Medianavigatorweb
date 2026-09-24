# Authentication & Security Protocol

## 1. Authentication Flow
Media Navigator utilizes JSON Web Tokens (JWT) combined with HTTP-only session cookies and CSRF protection headers.
- **Access Tokens**: Short-lived (15 minutes).
- **Refresh Tokens**: Stored hashed in the database with sliding expiration (7 days).
- **Workspace Scoping**: Every authenticated request evaluates workspace claims (`workspace_id`) to prevent Insecure Direct Object Reference (IDOR).

## 2. OAuth Platform Authorization
Social network credentials (Instagram, Facebook, YouTube, LinkedIn) are acquired through server-mediated OAuth 2.0 PKCE / Authorization Code flows.
1. Frontend requests authorization URL: `GET /api/v1/connections/:platform/auth-url`
2. User authenticates on third-party provider.
3. Callback received at backend: `GET /api/v1/connections/:platform/callback?code=...&state=...`
4. Exchange token and encrypt secret using AES-256-GCM before database write.
5. Tokens are never exposed in frontend API responses.
