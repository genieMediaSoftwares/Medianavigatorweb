# Media Navigator: web client

Next.js 16 (App Router) + React 19 + TypeScript (strict). A read-only analytics client for the Media Navigator API
(`docs/api.md`). The browser only ever talks to this app; this app's server talks to the API.

```
Browser ──► Next.js pages (client components, TanStack Query)
   │
   └──► /api/v1/*  (app/api/v1/[...path]/route.ts, server side) ──► API_BASE_URL/api/v1/*
              tokens live here, in httpOnly cookies
```

## Configuration: environment only, no fallbacks

All configuration comes from **`web/.env`** (git-ignored) or the host's environment, using these names. `env.ts` is the
only module that reads `process.env`; it is imported by `next.config.ts`, so `next build`, `next dev` and `next start`
all stop immediately and list every missing or invalid value. Nothing has a default, and no host, port or URL is
written anywhere in the code. No variable is exposed to the browser (there are no `NEXT_PUBLIC_` variables).

| Variable | Meaning |
|---|---|
| `API_BASE_URL` | Origin of the Media Navigator API, e.g. `https://api.example.com`. Origin only: no path, no `/api/v1`. Used at request time, server side only. |
| `COOKIE_SECURE` | `true` to mark the session cookies `Secure` (required whenever the site is served over https). `false` only for plain-http local development. |
| `OPERATOR_NAME` | The legal name of whoever runs this deployment. Shown on Terms and Privacy. |
| `SUPPORT_EMAIL` | Support/privacy contact. Shown on Terms, Privacy and the "password reset isn't set up" message. |

`OPERATOR_NAME` and `SUPPORT_EMAIL` are written into the static Terms, Privacy and Forgot-password pages at build time,
so rebuild after changing them. `API_BASE_URL` and `COOKIE_SECURE` are read when requests arrive.

On the API side, set `WEB_APP_URL` (in `backend/.env`) to this app's public origin: OAuth connections and password-reset
emails send people back there. The API's `CORS_ALLOWED_ORIGINS` is not involved, because the browser never calls the
API directly.

## Run, build, test

```bash
cd web
npm install
# create web/.env with the four variables above
npm run dev              # development server (port: Next.js reads PORT from the environment)
npm run build && npm run start

npm run lint             # ESLint
npm run typecheck        # route types + tsc --noEmit (loads next.config, so it needs the variables too)
npm test                 # Vitest: units, BFF route handler, components
npx playwright install chromium
E2E_BASE_URL=<address of the running app> npm run test:e2e   # Playwright, API mocked at the browser boundary
```

Mocks exist only under `tests/`. The app itself has no seed, demo, sample or placeholder data: with nothing to show it
shows an empty state with the next step.

## How authentication works (backend-for-frontend)

- `POST /auth/login` and `/auth/register` go through `app/api/v1/[...path]/route.ts`, which moves the returned tokens into
  two httpOnly, SameSite=Lax cookies (`Secure` when `COOKIE_SECURE=true`) and removes them from the JSON the browser sees.
- Every other call gets `Authorization: Bearer <access token>` added on the server. On a 401 the server refreshes **once**
  and retries; if that fails, the cookies are cleared and the browser is sent to "You've been signed out".
- Refreshes are single-flight per refresh token. The API revokes a session when a rotated refresh token is presented
  twice, and browsers send requests in parallel, so concurrent and slightly-late requests share one refresh.
  This state is per server process: run one process, or use sticky sessions.
- `/auth/refresh` and `/internal/*` can't be reached from the browser. Writes from another site are rejected (Origin and
  `Sec-Fetch-Site` checks, on top of SameSite cookies).
- `proxy.ts` only checks that a session cookie exists, to send signed-out visitors to Sign in. Roles and ownership are
  enforced by the API on every request; the Admin entry is shown only when the server-reported role is `admin`.
- The API sees the browser's user agent and `X-Forwarded-For`. For per-user rate limits and the device list to show real
  addresses, set the API's `TRUST_PROXY_HOPS` to include this app.

## Pages and the API behind them

| Page | Route | API |
|---|---|---|
| Landing, Terms, Privacy | `/`, `/terms`, `/privacy` | none (static) |
| Sign in, Create account | `/sign-in`, `/create-account` | `POST /auth/login`, `POST /auth/register` |
| Forgot / reset password | `/forgot-password`, `/reset-password?token=` | `POST /auth/forgot-password` (503 handled), `POST /auth/reset-password` |
| Signed out | `/signed-out` | none |
| Onboarding (2 steps) | `/onboarding` | `PATCH /profiles/me`, `GET /connections`, connect endpoints |
| Home | `/home` | `GET /connections`, `/intelligence/overview`, `/intelligence/summary` |
| Posts (All, What's working, Needs attention) | `/posts`, `?tab=working`, `?tab=attention` | `GET /media`, `/intelligence/summary` |
| Post detail (drawer) | from Posts / Home | `GET /media/:id`, `POST /intelligence/diagnose-post`, `/analyze-video`, `/compare` |
| Insights: Overview | `/insights` | `GET /intelligence/summary`, `/intelligence/history` |
| Insights: Trends | `/insights/trends` | `GET /intelligence/trends`, `/summary`, `/history` |
| Insights: Patterns | `/insights/patterns` | `GET /intelligence/archive-audit`, `/summary` |
| Insights: Ask | `/insights/ask` | `POST /intelligence/ask`, `GET /intelligence/status` |
| Best times | `/best-times` | `GET /intelligence/timing` |
| Plan: Ideas | `/plan` | `GET /intelligence/recommendations`, `POST /recommendations/:id/plan`, `/summary` (rule-based ideas) |
| Plan: Planner | `/plan/planner` | `GET/POST/DELETE /planner`, `GET /planner/insights` |
| Connections | `/connections` (+ `?oauth=` return) | `GET /connections`, `POST …/oauth/start`, `…/connect`, `…/sync`, `/sync-all`, `GET /sync-runs/:id`, `…/disconnect` |
| Notifications | bell + `/notifications` | `GET /notifications`, `/unread-count`, `POST …/read`, `/read-all`, `POST /alerts/:id/dismiss` |
| Settings | `/settings`, `/security`, `/files`, `/privacy` | `PATCH /profiles/me`, `POST /auth/change-password`, `GET/DELETE /users/me/sessions`, `POST /auth/logout-all`, `/files*`, `DELETE /users/me` |
| Admin | `/admin`, `/users`, `/connections`, `/sync-runs`, `/audit-logs` | `/admin/*` |

## What the client can't support (and why)

- **Insights "Compare channels" and "views over time" are approximations of what the API offers.** There is no
  per-channel comparison endpoint, so the comparison uses each channel's baseline from `/intelligence/summary`. Daily
  snapshots (`/intelligence/history`) record each account's running total after an import, not views earned that day,
  so the chart is labelled "Total views across your imported posts, as recorded after each import". It has gaps on days
  without an import, and at one year with several channels it can hit the 366-row limit (the page says so).
- **`/intelligence/performers` is not used for "What's working" / "Needs attention".** It always splits posts into a top
  and bottom 40% with no minimum history, which would label posts as underperforming on a new account. The tabs use
  `topContent` / `needsImprovement` from `/intelligence/summary` instead (user-relative, at least 5 posts per channel).
- **Overview, Trends, Patterns (captions), Best times and Ideas are not channel-scoped.** Those endpoints take no
  platform filter, so they always cover every connected channel; the pages say so where it matters.
- **Labels in the All posts list are calculated in the browser** from the API's baselines using the rule the API documents
  in `classificationMethod`, because `/media` items carry no classification. If the API's rule changes, update
  `lib/performance.ts`.
- **Sorting in "All posts" covers only the posts loaded so far.** `/media` is cursor-paginated newest-first with no sort
  parameter; the page says so and offers "Show more".
- **Facebook views on ranked items.** Ranked items in `/intelligence/summary` don't carry `unavailableMetrics`, so a
  Facebook post with 0 views is shown as "Not available from Facebook", matching how the API flags it on `/media`.
- **No avatar display.** Avatars can be uploaded (Settings → Files, purpose "profile picture") but the API has no endpoint
  that links an upload to the profile, so the app shows initials.
- **Thumbnails are not optimised by Next.js.** They are short-lived signed URLs on each platform's CDN; proxying them
  would require hardcoding image hosts, so they are rendered as-is with `next/image`'s `unoptimized`.
- **"Rising topics" and trend sparklines only appear when real series exist.** Nothing is drawn for illustration.
