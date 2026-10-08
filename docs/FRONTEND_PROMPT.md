# Media Navigator: frontend build prompt (Next.js + TypeScript)

Copy everything below the line into your design/coding tool. It describes a simple, friendly web client built with **Next.js and TypeScript**, derived from what the backend actually supports (`docs/api.md`). There is no existing frontend in this repository: start from scratch in a new `web/` folder.

---

## 0. Role and goal

Act as a senior product designer and front-end engineer. Build the web client for **Media Navigator**, a read-only analytics product that connects a person's Instagram, Facebook, YouTube and LinkedIn accounts and tells them, in plain language, what is working in their content, what to fix, and when to post.

The people using it are creators, small brands and agencies, **not analysts**. The guiding principle is **simplicity**: a first-time user should understand every screen in five seconds, never see jargon, and always know the one next thing to do. When in doubt, show less, say it plainly, and offer a single clear action.

Product promise: *"Don't make users navigate their media. Let Media Navigator navigate it for them."* Every screen answers one of: **What happened? Why? What should I do next?**

## 1. Tech stack (required)

- **Next.js (latest stable, App Router) + React + TypeScript in `strict` mode.** No `any`; shared API types in one `types/` module.
- **Tailwind CSS** with design tokens (CSS variables) for colour, spacing, radius and type. Optionally **shadcn/ui (Radix)** for accessible primitives (dialog, drawer, tabs, dropdown, toast).
- **Recharts** for every chart (area/line, bar, simple heat-map built from a grid). Wrap each chart in an accessible container with a text summary and a data-table fallback.
- **TanStack Query** for data fetching, caching, polling and retries. **react-hook-form + zod** for forms, with zod schemas mirroring the API rules.
- **lucide-react** icons. **date-fns** for dates. **next/font** for fonts. **next/image** only for thumbnails coming from the API (configure `remotePatterns` from the API data, never hardcode).
- **Testing:** Vitest + React Testing Library for logic and components; **Playwright** for end-to-end flows. Lint with ESLint + `tsc --noEmit` in CI.
- Use **Server Components** for static pages (landing, legal) and **Client Components** only where interaction is needed. Code-split per route, use `loading.tsx` and `error.tsx` for every route segment.

## 2. Non-negotiable rules

1. **Configuration only from the environment, no fallbacks.** Required: `API_BASE_URL` (the API origin, server-side only). Validate all env variables with zod at startup (for example in `env.ts` imported by `next.config`) and **fail the build/start with a clear message if anything is missing**. No default URL, no `localhost` fallback, no hardcoded hosts or ports anywhere in the code. Document every variable in the README.
2. **No mock, seed, demo or placeholder data in the app**, including fake charts as illustrations, stock photos, fake avatars and "sample" numbers. Mocks are allowed **only inside tests**. With no data, show an honest empty state that says what to do next.
3. **No invented numbers.** Show only what the API returns. If a metric is missing (`unavailableMetrics[]`), show "Not available from <platform>", never 0.
4. **Never imply AI ran when it did not.** Read `ai.status` on every AI response: `ran` and `cached` show the interpretation; `unavailable`, `failed` and `not_needed` show measured facts only plus a short "AI explanation isn't available right now" note. Keep three layers visibly separate: **What we measured**, **What we calculated**, **What it may mean**.
5. **Never say "live" or "real-time".** Show "Updated <time ago>" and the sync state.
6. **Read-only product.** Say clearly in the UI that Media Navigator cannot post, edit or delete anything on the user's social accounts.
7. **Do not call YouTube content "Reels".** Use `contentType`; when `contentTypeBasis` is `inferred` (for example Shorts), say "estimated".
8. **Security.** Never put tokens in URLs, logs or `NEXT_PUBLIC_` variables. Provider tokens are sent once to the API and never stored in the browser. The server enforces roles and ownership; the UI must never trust a client-side role. Use the **backend-for-frontend pattern**: the browser talks only to Next.js route handlers (`/app/api/...`), which call `API_BASE_URL` server-side; keep the refresh token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie and the access token in memory or a short-lived cookie; refresh once on a 401, then sign out. This also removes the need for browser CORS.
9. **Accessibility and quality.** Keyboard-operable, visible focus, labelled inputs, text at least 14px on body copy (never below 12px), WCAG AA contrast, `prefers-reduced-motion` respected, touch targets at least 44px, responsive from 360px to wide desktop with a bottom tab bar on phones, no horizontal page scroll.
10. **Every request has four states:** loading (skeleton shaped like the content), empty, error (with a Retry button) and success. Show the API's `error.message`; for 429 say "Too many requests. Please try again in a moment."

## 3. Make it simple (UX principles)

- **One job per screen** and **one primary button per screen.**
- **Plain language.** Write like a helpful friend: "Your best time to post is Tuesday evening", not "Engagement delta by temporal bucket". Banned words: KPI, delta, heuristic, cohort, baseline (say "your usual"), median (say "typical"), anomaly, funnel. Show the precise statistic name only in a small "How is this calculated?" help popover.
- **Few numbers, big and clear**, with a one-sentence meaning next to each. Prefer words and icons over dense tables. Use progressive disclosure: summary first, "Show details" for evidence.
- **Colour carries meaning, with a label too** (never colour alone): green "Doing well", amber "Could be better", grey "Not enough data yet".
- **Always say what to do next** (a single clear button) and **never dead-end**. Every empty state has an action.
- **Gentle onboarding:** a 2-step setup (your time zone, connect one account), skippable, with a friendly progress bar. Use inline hints and tooltips instead of manuals.
- **Forgiving forms:** inline validation as the user types, clear messages ("Add an @ to your email"), password show/hide, autofill and correct `autocomplete` attributes, Enter submits.
- **Confirm only destructive actions** (disconnect, delete) and explain the consequence in one sentence.
- **Consistent patterns:** one card style, one button set, one badge set, one empty-state component, one confirm dialog, one toast style. Fast, with optimistic UI where safe.
- **Navigation is small:** at most 7 items (section 5). Anything else lives inside a page as a tab.

## 4. Visual direction

Warm, calm and friendly. Cream canvas (`#FAF7F2`), warm near-black ink (`#1F1611`), a single orange brand colour (buttons and links `#D4560C`, highlight `#F26A1B`, tint `#FFF4EC`), generous spacing, rounded cards (16px) with a hairline border and soft shadow, a serif display face for headlines (Newsreader) and a clean sans for UI (Plus Jakarta Sans), loaded with `next/font`. Platform logos in their real brand colours. Define everything as tokens; support light and dark themes (`prefers-color-scheme` plus a toggle). Charts use a restrained palette with direct labels and an accessible description. Smooth, subtle motion only.

## 5. Information architecture (simplified)

**Public:** Landing, Sign in, Create account, Forgot password, Reset password, Terms, Privacy.

**Signed-in sidebar (phones: bottom tab bar with the first four plus "More"):**

1. **Home**
2. **Posts** (tabs: All, What's working, Needs attention)
3. **Insights** (tabs: Overview, Trends, Patterns, Ask)
4. **Best times**
5. **Plan** (tabs: Ideas, Planner)
6. **Connections**
7. **Settings**

Plus an **Admin** entry visible only when the server says `role === 'admin'`. The top bar holds: page title, an "All channels / one channel" picker (only connected channels), a **Sync** button with progress, a **notification bell** with unread count (this replaces a separate Alerts page), and the account menu. Reports and platform comparison live inside Insights as sections ("Compare channels", "Print report").

## 6. API contract (summary)

Base: `<API_BASE_URL>/api/v1`. Envelope: success `{ success: true, data, meta? }`, error `{ success: false, error: { code, message, details? } }`. Lists are cursor-paginated with `?limit=&cursor=` and `meta.nextCursor`. Unknown request fields are rejected (422). Full reference: `docs/api.md`. Model these as TypeScript types and parse responses with zod at the boundary.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register {email,password,fullName,organization?,accountType?}`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `GET /auth/me`, `/auth/change-password`, `/auth/forgot-password` (503 if email isn't configured), `/auth/reset-password {token,newPassword}` |
| Profile | `GET /users/me`, `PATCH /profiles/me {fullName?,organization?,accountType?,timezone?,onboardingCompleted?}`, `GET /users/me/sessions`, `DELETE /users/me/sessions/:id`, `DELETE /users/me {password}` |
| Connections | `GET /connections`, `POST /connections/:platform/oauth/start` → `{authorizeUrl}`, `POST /connections/:platform/connect` (token form), `POST /connections/:platform/sync`, `POST /connections/sync-all`, `GET /connections/sync-runs/:id` (poll), `POST /connections/:platform/disconnect`, `GET /connections/:platform/capabilities`. OAuth returns the user to `<web app>/connections?oauth=connected\|denied\|failed&platform=…` |
| Media | `GET /media?platform=&limit=&cursor=`, `GET /media/:id` |
| Intelligence | `GET /intelligence/summary?platform=&days=`, `/history`, `/overview`, `/timing`, `/signals`, `/performers?sortBy=`, `/patterns`, `/recommendations`, `/trends`, `/status`; `POST /intelligence/ask`, `/analyze-item`, `/diagnose-post`, `/analyze-video`, `/compare` |
| Planner | `GET/POST /planner`, `DELETE /planner/:id`, `GET /planner/insights`, `POST /recommendations/:id/plan` |
| Notifications | `GET /notifications`, `/notifications/unread-count`, `POST /notifications/:id/read`, `/notifications/read-all`; `GET /alerts`, `POST /alerts/:id/dismiss` |
| Files | `POST /files` (multipart), `GET /files`, `GET /files/:id` (presigned URL), `DELETE /files/:id`. Returns 503 when storage isn't configured |
| Admin | `GET /admin/system`, `/admin/users`, `/admin/users/:id`, `PATCH /admin/users/:id/role`, `/admin/users/:id/status`, `GET /admin/connections`, `POST /admin/connections/:id/sync`, `GET /admin/sync-runs`, `GET /admin/audit-logs` |

`platform ∈ instagram | facebook | youtube | linkedin`. Connection statuses: `not_connected`, `syncing`, `sync_complete`, `sync_failed`, `permission_required`, `connection_expired`. Sync run statuses: `queued`, `running`, `succeeded`, `partial`, `failed`, `cancelled`.

## 7. Pages

Build every page below with all four states (loading, empty, error, success). For each: purpose, content, API.

### 7.1 Landing (public)
Hero with the promise and two buttons (**Get started**, **Sign in**), the four platform logos, "How it works" in three steps (connect, we compare each post with your own results, you get clear next steps), four feature cards (judged against your own history, best times to post, plain-language insights, a simple planner), a privacy section (read-only, encrypted, deletable), a short FAQ, footer with Terms and Privacy. **No fake dashboards or invented statistics.**

### 7.2 Sign in
Email, password (show/hide), "Forgot password?", link to Create account. Errors never reveal whether an email exists; show a friendly lockout message on 429. API: `POST /auth/login`.

### 7.3 Create account
Name, email, password with a live checklist (at least 8 characters), optional organization and "I am a…" (Creator, Personal brand, Business, E-commerce, Marketing agency, Other), required consent checkbox linking to Terms and Privacy. 409 → "An account with this email already exists. Try signing in." API: `POST /auth/register`.

### 7.4 Forgot and reset password
Forgot: one email field and a neutral confirmation. If the API returns 503, say email isn't set up yet and to contact support. Reset: token from the link, new password, then Sign in. API: `/auth/forgot-password`, `/auth/reset-password`.

### 7.5 Onboarding (first sign-in, 2 steps)
(1) Time zone (detected from the browser, editable, required) and optional organization/account type. (2) "Connect your first account" with four big tiles; skippable. Finishing sets `onboardingCompleted`. API: `PATCH /profiles/me`, `GET /connections`.

### 7.6 Home
- **No account connected:** a warm welcome and four platform tiles with a Connect button.
- **Syncing / no posts yet:** a friendly progress state ("We're importing your posts. This can take a few minutes.").
- **With data:** one headline sentence from the API ("We looked at N posts across M channels"), three big stat cards (posts, views, engagement with "up/down from last period"), up to three **Signals** (each a sentence, a one-line reason, a link), "Your best post this month" and "A post to look at" cards, and a single **Next best action** button. Show "Updated <time ago>" per channel. API: `/intelligence/overview`, `/intelligence/summary`, `/connections`.

### 7.7 Posts
Tabs: **All**, **What's working**, **Needs attention**. Search, channel and format filters, simple sort ("Newest", "Most views", "Best engagement"), and "Show more". A friendly card per post: thumbnail (neutral icon if none), channel and format badge, title/caption snippet, date, views, likes, comments, and a labelled tag (**Doing well**, **Typical**, **Could be better**, **Not enough data yet**). Clicking opens the **Post detail** drawer (7.8). On the two ranked tabs show **why** in one sentence plus the numbers behind it; Needs attention must be constructive, never shaming, and require enough history before classifying. API: `GET /media`, `/intelligence/summary`, `/intelligence/performers?sortBy=`.

### 7.8 Post detail (drawer)
Header with thumbnail, title, channel, date. Three clearly separated blocks: **What we measured** (metrics; "Not available from <platform>" for missing ones), **What we calculated** (how it compares with the user's usual posts, with a simple bar), **What it may mean** (interpretation + 2–3 suggested actions, with the AI status banner). Buttons: **Explain this post**, **Compare with another post**, and for video **Deep look** (honest notes on hook and caption, plus an "We can't see" list for retention and audience, never invented scores). API: `/intelligence/diagnose-post`, `/analyze-item`, `/analyze-video`, `/compare`.

### 7.9 Insights
Tabs:
- **Overview:** period picker (7 / 30 / 90 / 365 days) and channel filter; stat cards with change vs the previous period; an **area chart** of views over time (Recharts, from daily snapshots); a **bar chart** by format and by topic with counts; a "Compare channels" section (connected channels only, never disconnected ones); a **Print report** button that prints a clean report view. Say "typical" (median) vs "average" explicitly in the help popover. Show "Not enough data yet" instead of a chart when history is thin.
- **Trends:** what is rising and falling, in plain sentences with small sparklines.
- **Patterns:** repeatable patterns (format, caption length, question hooks, topics) each with "X% better/worse than your usual" and how many posts it's based on; hide those with too few posts.
- **Ask:** a text box "Ask about your content" with example questions as chips; the answer is shown as "What we saw", "What to try", with the AI status. Disable while loading; handle 429; explain if AI isn't available.
API: `/intelligence/summary`, `/history`, `/trends`, `/patterns`, `/signals`, `/status`, `POST /intelligence/ask`.

### 7.10 Best times
A calm **heat-map** (days × Morning / Afternoon / Evening / Night) in the user's time zone, a highlighted **"Your best time to post"** card with a confidence label ("Solid evidence" / "Early signal"), hover/focus details with the number of posts, and a **Plan a post** button. Empty state: needs at least 3 posts. Cells with no posts read "No posts yet". API: `/intelligence/timing`.

### 7.11 Plan
Tabs:
- **Ideas:** numbered cards: type (Do more of this / Reuse it / Try an experiment), title, **Why**, **What to do**, **How you'll know**, optional suggested day/time, and **Add to planner** (if no slot, let the user pick day and time; show 422 "We need a little more history first" nicely).
- **Planner:** a simple week view plus list with "good times to post" hints, an **Add** form (day, time, channel, format, title), delete with confirmation. Say plainly: **Media Navigator doesn't publish for you. This planner is for your own scheduling.**
API: `/intelligence/recommendations`, `POST /recommendations/:id/plan`, `GET/POST/DELETE /planner`, `/planner/insights`.

### 7.12 Connections
A card per platform: logo, name, a status badge in words ("Connected", "Importing…", "Needs permission", "Reconnect needed", "Not connected"), handle, posts, followers, "Updated <time ago>", and a plain-language message if something is wrong. Actions: **Connect** (one click OAuth when `oauthAvailable`; otherwise a token form under "Advanced" with the permissions explained), **Sync now**, **Reconnect**, **Disconnect** (explain: "We'll delete the saved access. Your past results stay."). **Sync all**. While syncing, poll `GET /connections/sync-runs/:id` and show progress, counts and any "partial result" warning. Handle the `?oauth=` return banner. A short "How access works: read-only, encrypted" panel. API: `/connections*`.

### 7.13 Notifications
Bell dropdown (latest, mark read, mark all read) and a "See all" page listing notifications with a friendly title, severity, date, one-line evidence and a Dismiss action. API: `/notifications*`, `/alerts*`.

### 7.14 Settings
Tabs: **Profile** (name, organization, "I am a…", time zone with a note on what it affects), **Security** (change password, signed-in devices with "Sign out" each, "Sign out everywhere"), **Files** (upload, list, open, delete; friendly message on 503), **Privacy** (what we store in plain words, **Delete my account** with password and typed confirmation). API: `/profiles/me`, `/auth/change-password`, `/users/me/sessions`, `/auth/logout-all`, `DELETE /users/me`, `/files*`.

### 7.15 Terms and Privacy
Plain-language pages describing exactly what the product does: read-only access, what is stored, encrypted tokens, what is sent to the AI provider, deletion rights. Leave operator name and contact as clearly marked fields for the owner to fill; do not invent legal entities.

### 7.16 Admin console (admin only; the server enforces it)
Separate layout with "Back to app". Tabs: **System** (database status, uptime, counts, which integrations are set up), **Users** (search by email, paginate, make/remove admin, disable/enable; no self-changes), **Connected accounts** (status, last sync, last error, **Sync** action; never any tokens), **Sync runs** (status, duration, counts, errors), **Audit log** (action, actor, target, request id). Note that every action is recorded. API: `/admin/*`.

### 7.17 System pages
`not-found.tsx` (friendly 404), `error.tsx` and `global-error.tsx` with a reload button, a "You've been signed out" screen, and an API-unreachable banner: "We couldn't reach Media Navigator. Check your connection, and that the API address is configured."

## 8. Cross-cutting behaviour

- **Routing:** App Router with a URL for every page and tab (`/home`, `/posts?tab=working`, `/insights/trends`, `/best-times`, `/plan/planner`, `/connections`, `/settings/security`, `/admin/users` …). Deep links survive reloads. Guard private routes in `middleware.ts` and admin routes by the server-verified role.
- **Data fetching:** TanStack Query with sensible stale times, retry with backoff only on network/5xx (never on 401/403/422), polling for sync runs that stops when the run finishes, request ids passed through for support.
- **Formatting:** one `format` module for numbers (compact), percentages, dates and "time ago", all locale-aware and time-zone-aware using the user's saved time zone.
- **Empty states** always say what's missing and give the single next action.
- **Copy:** plain, specific, kind and non-judgemental; never overpromise ("guaranteed", "go viral").
- **Performance:** route code-splitting, lazy-load charts, paginate lists, debounce search, avoid refetching on every keystroke, good Core Web Vitals.
- **Quality gates:** ESLint, `tsc --noEmit`, Vitest, and Playwright in CI. End-to-end tests for: sign-up and onboarding, connecting an account and sync polling, post detail with AI unavailable, planner add/delete, admin gating. Mocks only in tests.

## 9. Project structure (suggested)

```
web/
  app/                    App Router: (public) landing, auth, legal; (app) home, posts, insights, best-times, plan, connections, settings; (admin)
  app/api/                BFF route handlers that call API_BASE_URL (auth cookies live here)
  components/             ui/ (button, card, badge, empty-state, confirm, toast), charts/, posts/, layout/
  lib/                    api client, zod schemas, format, auth, query keys
  types/                  API types shared across the app
  env.ts                  zod-validated environment (fails fast, no defaults)
  tests/                  vitest + playwright
```

## 10. Deliverables

1. The complete Next.js + TypeScript client in `web/`, implementing every page above with all states.
2. A short README: the required environment variable(s), how to run, build and test, and how each page maps to the API.
3. A list of any API behaviour you could not support and why, rather than faking it.
