# Media Navigator web client

Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4 + Recharts + TanStack Query + react-hook-form/zod. Built to the brief in [`docs/FRONTEND_PROMPT.md`](../docs/FRONTEND_PROMPT.md) and styled from the logo in `docs/brand/logo.jpg`.

## Configuration

One required value, no defaults and no fallbacks. A missing or malformed value stops `next dev`, `next build` and `next start` with a readable message (`env.ts`).

| Variable | Required | What it is |
|---|---|---|
| `API_BASE_URL` | yes | Origin of the Media Navigator API, for example `https://api.example.com`. Server-side only; it is never sent to the browser. |

The project keeps a single env file, `backend/.env`. If the host has not provided `API_BASE_URL`, `next.config.ts` copies **only that one key** from `../backend/.env` (nothing else from that file ever enters the web process). On a host such as Vercel, set `API_BASE_URL` in the platform instead.

For the end-to-end tests only: `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (all required, no defaults).

## Run

```bash
# 1. the API (see ../backend/README.md), then
cd web
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

The API must know the web app's address in `WEB_APP_URL` (OAuth sends people back to `<WEB_APP_URL>/connections?oauth=…`). Because the browser only talks to this app (see below), `CORS_ALLOWED_ORIGINS` does not need to include it.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest: formatting, API client, proxy, post card, env, post tags
E2E_BASE_URL=http://localhost:3000 E2E_USER_EMAIL=… E2E_USER_PASSWORD=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
```

Mocks exist only inside `tests/`.

## How it is put together

- **Backend-for-frontend.** The browser calls `/api/v1/*` on this app (`app/api/v1/[...path]/route.ts`). That route forwards to `API_BASE_URL`, attaches the access token from an `httpOnly` cookie, refreshes it once on a 401 (one refresh at a time, because refresh tokens rotate), and keeps tokens out of page JavaScript entirely. `auth/refresh` is not reachable from the browser. Cookies are `HttpOnly; SameSite=Lax` and `Secure` whenever the request came over HTTPS.
- **Route guard.** `proxy.ts` redirects signed-out visitors away from private pages (cookie presence only). The API enforces real authorisation on every call; the admin area also checks the role from the server.
- **Navigation** is seven items (`lib/nav.ts`); everything else is a tab inside a page, kept in the URL so links and reloads work.
- **Design tokens** live in `app/globals.css` (colours sampled from the logo, light and dark themes). Components use token classes, never hex values.
- **Images** from the platforms are rendered as-is (`images.unoptimized`) because their hosts are not known ahead of time; a missing or expired image falls back to a neutral tile.

## Page → API map

| Page | Endpoints |
|---|---|
| Landing, Terms, Privacy | none |
| Sign in / Create account / Forgot / Reset | `POST /auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` |
| Onboarding | `PATCH /profiles/me`, `GET /connections` |
| Home | `GET /intelligence/overview`, `/intelligence/summary`, `/connections`, `/media/:id` |
| Posts, Post detail | `GET /media`, `/intelligence/summary`, `/intelligence/performers`; `POST /intelligence/diagnose-post`, `/analyze-item`, `/analyze-video`, `/compare` |
| Insights | `GET /intelligence/summary`, `/history`, `/trends`, `/patterns`, `/signals`, `/status`; `POST /intelligence/ask` |
| Best times | `GET /intelligence/timing` |
| Plan | `GET /intelligence/recommendations`, `/planner`, `/planner/insights`; `POST /recommendations/:id/plan`, `/planner`; `DELETE /planner/:id` |
| Connections | `GET /connections`; `POST /connections/:platform/oauth/start`, `/connect`, `/sync`, `/disconnect`, `/sync-all`; `GET /connections/sync-runs/:id` |
| Notifications | `GET /notifications`, `/notifications/unread-count`; `POST /notifications/:id/read`, `/notifications/read-all` |
| Settings | `PATCH /profiles/me`, `POST /auth/change-password`, `/auth/logout-all`, `GET /users/me/sessions`, `DELETE /users/me/sessions/:id`, `/files*`, `DELETE /users/me` |
| Admin | `/admin/*` |

## Known gaps (not faked)

See the end of this file's parent task report; items that the API cannot support are shown to the user as "not available" or "not set up yet" instead of being invented.
