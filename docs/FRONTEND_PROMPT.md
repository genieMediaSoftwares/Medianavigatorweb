# Media Navigator: frontend build prompt

Copy everything below the line into your design/coding tool. It describes every page the product needs, derived from what the backend actually supports (`docs/api.md`). Nothing in it depends on an existing frontend: there is none in this repository.

---

## 0. Role and goal

Act as a senior product designer and front-end engineer. Build the complete web client for **Media Navigator**, a read-only analytics product that connects a person's Instagram, Facebook, YouTube and LinkedIn accounts and tells them, in plain language, what is working in their content, what to fix, and when to post. Design for creators, small brands and agencies who are not analysts.

Product promise: *"Don't make users navigate their media. Let Media Navigator navigate it for them."* Every screen answers one of: **What happened? Why? What should I do next?**

## 1. Non-negotiable rules

1. **Configuration only from environment.** One required value: the API base URL (for example `VITE_API_BASE_URL`). If it is missing, fail at startup with a clear message. **No default URL, no localhost fallback, no hardcoded hosts.**
2. **No mock, seed, demo or placeholder data anywhere**, including illustrations that look like real charts, stock photos, fake avatars and "sample" numbers. Where there is no data, show an honest empty state that says what to do next.
3. **No invented numbers.** Show only what the API returns. If a metric is missing (`unavailableMetrics[]`), show "Not available from <platform>", never 0.
4. **Never imply AI ran when it did not.** Read `ai.status` on every AI response: `ran` and `cached` show interpretation; `unavailable`, `failed` and `not_needed` show measured facts only plus a short "AI interpretation is unavailable" note. Always label the three layers separately: **Measured**, **Calculated**, **Interpretation**.
5. **Never call data "live" or "real-time".** Show "Last synced <time ago>" and the sync status instead.
6. **Read-only product.** Make clear in the UI that Media Navigator cannot post, edit or delete anything on the user's social accounts.
7. **Do not call YouTube content "Reels".** Use the `contentType` and `contentTypeBasis` from the API; when `contentTypeBasis` is `inferred` (for example Shorts), say so.
8. **Security:** keep access and refresh tokens out of URLs and logs; never store provider tokens in the browser (they are sent once to the API and never returned); never trust the client for role or user id, because the server enforces both. Send `Authorization: Bearer <accessToken>`; on a 401 refresh once with the refresh token, then sign out.
9. **Accessibility and quality:** keyboard-operable, visible focus, labelled inputs, text at least 12px, WCAG AA contrast, reduced-motion respected, responsive from 360px to wide desktop with a bottom tab bar on phones. No horizontal page scroll.
10. Handle every request with **loading (skeleton), empty, error (with retry) and success** states. Surface the API's `error.message`; for 429 say "Too many requests, try again shortly".

## 2. Visual direction

Warm, editorial, calm. Cream canvas (`#FAF7F2`), warm near-black ink (`#1F1611`), a single orange brand colour (buttons and links `#D4560C`, highlights `#F26A1B`, tints from `#FFF4EC`), generous spacing, rounded cards with a hairline border and soft shadow, a serif display face (for example Newsreader) for headlines and a clean sans (for example Plus Jakarta Sans) for UI. Use colour only to carry meaning: green for good, amber for caution, red for problems, orange for brand and action. Use platform logos in their real brand colours. Charts must have text alternatives and not rely on colour alone. Define everything as design tokens and support a dark theme if time allows.

## 3. API contract (summary)

Base: `<API_BASE>/api/v1`. Envelope: success `{ success: true, data, meta? }`, error `{ success: false, error: { code, message, details? } }`. Lists are cursor-paginated with `?limit=&cursor=` and `meta.nextCursor`. Unknown request fields are rejected (422). Full reference: `docs/api.md`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register {email,password,fullName,organization?,accountType?}`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `GET /auth/me`, `/auth/change-password`, `/auth/forgot-password` (503 if email is not configured), `/auth/reset-password {token,newPassword}` |
| Profile | `GET /users/me`, `PATCH /profiles/me {fullName?,organization?,accountType?,timezone?,onboardingCompleted?}`, `GET /users/me/sessions`, `DELETE /users/me/sessions/:id`, `DELETE /users/me {password}` |
| Connections | `GET /connections`, `POST /connections/:platform/oauth/start` → `{authorizeUrl}`, `POST /connections/:platform/connect` (token form), `POST /connections/:platform/sync`, `POST /connections/sync-all`, `GET /connections/sync-runs/:id` (poll), `POST /connections/:platform/disconnect`, `GET /connections/:platform/capabilities`. OAuth returns the user to `<web app>/connections?oauth=connected\|denied\|failed&platform=…` |
| Media | `GET /media?platform=&limit=&cursor=`, `GET /media/:id` |
| Intelligence | `GET /intelligence/summary?platform=&days=`, `/history`, `/overview`, `/timing`, `/signals`, `/performers?sortBy=`, `/patterns`, `/recommendations`, `/trends`, `/status`; `POST /intelligence/ask`, `/analyze-item`, `/diagnose-post`, `/analyze-video`, `/compare` |
| Planner | `GET/POST /planner`, `DELETE /planner/:id`, `GET /planner/insights`, `POST /recommendations/:id/plan` |
| Notifications | `GET /notifications`, `/notifications/unread-count`, `POST /notifications/:id/read`, `/notifications/read-all`; `GET /alerts`, `POST /alerts/:id/dismiss` |
| Files | `POST /files` (multipart), `GET /files`, `GET /files/:id` (presigned URL), `DELETE /files/:id`. Returns 503 when storage is not configured |
| Admin | `GET /admin/system`, `/admin/users`, `/admin/users/:id`, `PATCH /admin/users/:id/role`, `/admin/users/:id/status`, `GET /admin/connections`, `POST /admin/connections/:id/sync`, `GET /admin/sync-runs`, `GET /admin/audit-logs` |

`platform ∈ instagram | facebook | youtube | linkedin`. Connection statuses: `not_connected`, `syncing`, `sync_complete`, `sync_failed`, `permission_required`, `connection_expired`. Sync run statuses: `queued`, `running`, `succeeded`, `partial`, `failed`, `cancelled`.

## 4. Application shell

- **Public routes:** Landing, Sign in, Create account, Forgot password, Reset password, Terms, Privacy.
- **Signed-in shell:** left sidebar (collapsible; becomes a drawer plus bottom tab bar on phones) grouped as:
  - **Home:** Overview
  - **Performance:** Analytics, Content library, What's working, Needs attention, Platform comparison
  - **Insights:** AI insights, Trends, Patterns, Best times
  - **Plan:** Recommendations, Content planner, Reports
  - **Workspace:** Connections, Alerts, Settings
  - **Admin console** link, shown **only** when `user.role === 'admin'`.
- **Top bar:** page title and one-line subtitle, platform filter (All plus only the connected platforms), "Sync" button with progress, notification bell with unread count, and the account menu (name, email, sign out).
- **Account card** at the bottom of the sidebar. A global confirm dialog pattern for destructive actions.

## 5. Pages

For each page: purpose, content, states, API. Build every one.

### 5.1 Landing (public)
Honest marketing page: hero with promise and two calls to action (Get started, Sign in), the four supported platforms, "How it works" in three steps (connect, we compare each post with your own history, you get clear next steps), feature highlights (judged against your own history, best posting times, plain-language insights, planner, read-only and private), privacy section (read-only access, encrypted tokens, deletion), FAQ, footer with Terms and Privacy. **No fake dashboards or invented statistics.**

### 5.2 Sign in
Email, password with show/hide, "Forgot password?", error messages that do not reveal whether the email exists, lockout message on 429, link to Create account. API: `POST /auth/login`.

### 5.3 Create account
Full name, email, password with live rule checklist (min 8 characters), optional organization and account type (Creator, Personal brand, Business, E-commerce, Marketing agency, Other), required consent checkbox linking to Terms and Privacy. 409 shows "An account with this email already exists". API: `POST /auth/register`.

### 5.4 Forgot and reset password
Forgot: email field, neutral confirmation message; if the API returns 503, say email delivery is not set up and to contact support. Reset: token from the link, new password, success then Sign in. API: `/auth/forgot-password`, `/auth/reset-password`.

### 5.5 Onboarding (first sign-in)
Two steps with a progress indicator. (1) Profile: organization, account type, **time zone** (detect from the browser, let the user change it, required; it controls "morning/evening" in best times). (2) Connect the first account (cards for the four platforms; skippable). Finish sets `onboardingCompleted`. API: `PATCH /profiles/me`, `GET /connections`.

### 5.6 Overview (home)
- **No connection:** a welcome card and the four platform tiles with Connect buttons.
- **Connected but syncing / no posts yet:** a clear progress state.
- **With data:** a hero sentence generated by the API ("We analyzed N posts across M channels…"), key stat cards (posts, views, engagement with period change), "Signals" cards (top format, trend, timing) each with title, evidence and a link to the relevant page, an "Observations" list, a short list of top posts and posts needing attention, and a "Next best actions" strip linking to Recommendations and Planner. Show last synced time per channel. API: `/intelligence/overview`, `/intelligence/summary`, `/connections`.

### 5.7 Analytics
Period selector (7 / 30 / 90 / 365 days) and platform filter. Cards and charts for views, engagement rate, likes, comments, posts published, each with change versus the previous period; a time-series chart from daily snapshots; performance by content type and by topic (bar lists with sample sizes); explain that the baseline is the user's **median**, and label every statistic as median or average. Show "not enough data" instead of a chart when history is too thin. API: `/intelligence/summary`, `/intelligence/history`.

### 5.8 Content library
Searchable, filterable, sortable grid/list of all posts: search, platform, format, sort (newest, most views, highest engagement, most likes, most comments), "Show more" pagination. Each card: thumbnail (or a neutral icon if none), platform and format badge, title/caption snippet, date, views, likes, comments, engagement rate, a performance tag (Top / Typical / Below usual / Not enough data) and actions **Details** and **Analyze**. Details opens a drawer with the metrics, an unavailable-metrics note and the three-layer analysis. API: `GET /media`, `/intelligence/summary` (for tags), `POST /intelligence/analyze-item`, `/diagnose-post`.

### 5.9 What's working / Needs attention (two views of one component)
Ranked lists of the user's best and weakest posts relative to their **own** history, each with "why" evidence (measured numbers and the comparison with the median) and a recommended next step. Needs attention must be constructive and never shame; require a minimum amount of history before classifying. API: `/intelligence/performers?sortBy=`, `/intelligence/summary`.

### 5.10 Post analysis (drawer or page from any post)
Tabs: **Overview** (measured facts), **Why it worked / What to improve** (calculated comparisons plus interpretation), **Deep analysis** (for video: honest qualitative notes on hook and caption, plus an "Unavailable" list such as retention and audience, never invented scores), **Compare** (pick a second post for a deterministic side-by-side). Show the AI status banner and the three labelled layers. API: `/intelligence/diagnose-post`, `/analyze-item`, `/analyze-video`, `/compare`.

### 5.11 Platform comparison
Side-by-side cards for **connected platforms only**: posts, median engagement, best format, best time, follower count. Never show a disconnected platform's numbers. API: `/intelligence/summary` per platform, `/connections`.

### 5.12 AI insights and "Ask"
A list of AI-written insight cards (each with status badge, evidence and confidence) and an **Ask Media Navigator** box for free-text questions with a clear answer, "what we observed", "suggested action", and the `ai` status. Rate-limit friendly (disable while loading, handle 429). Hide or explain when AI is unavailable. API: `/intelligence/status`, `/intelligence/ask`, `/intelligence/signals`.

### 5.13 Trends and Patterns
Trends: rising and falling topics/formats over time with the period compared. Patterns: repeatable patterns found in the user's posts (format, length, question hooks, topics) each with a lift versus baseline and sample size; hide patterns with too few samples. API: `/intelligence/trends`, `/intelligence/patterns`.

### 5.14 Best times
Heat-map grid (days by morning/afternoon/evening/night) of average engagement in the **user's time zone**, a highlighted "strongest window" card with confidence (solid evidence vs early signal), hover/focus details with sample size, and a "Plan a post" action. Empty state: need at least 3 posts. Cells with no posts are clearly "no data". API: `/intelligence/timing`.

### 5.15 Recommendations
Numbered cards: type (make more of this / reuse it / run an experiment), title, **Why**, **What to do**, **How you'll know**, optional suggested slot and format, and **Add to planner** (if no slot exists, let the user pick day and time; show 422 "not enough history" nicely). API: `/intelligence/recommendations`, `POST /recommendations/:id/plan`.

### 5.16 Content planner
A weekly view (Mon to Sun) and a list, with the user's planned items, "recommended windows" from the API and an Add item form (day, time, platform, format, title). Delete with confirmation. State plainly that the planner is for the user's own scheduling: **Media Navigator does not publish** to the platforms. API: `GET/POST/DELETE /planner`, `/planner/insights`.

### 5.17 Reports
A printable, server-computed performance report for a chosen period and platform (summary, top posts, posts needing attention, best times), with a Print / Save as PDF button. No fake share links. API: `/intelligence/summary`, `/intelligence/timing`.

### 5.18 Connections
One card per platform: logo, name, status badge, handle, posts imported, followers, last synced, sync error or "needs permission" message. Actions: **Connect** (one-click OAuth when `oauthAvailable`, otherwise the token form as an "advanced" option with the permissions explained), **Sync now**, **Reconnect** (expired or permission required), **Manage / Disconnect** (confirmation explaining that stored credentials are deleted and history is kept). A **Sync all** button. Poll `GET /connections/sync-runs/:id` while syncing and show state, counts and any partial-result warning. Handle the `?oauth=` return banner. A short "How access works" panel. API: `/connections*`.

### 5.19 Alerts and notifications
Bell drawer (latest, mark read, mark all read) plus a full Alerts page listing notifications with severity, type, date, evidence and a dismiss action. API: `/notifications*`, `/alerts*`.

### 5.20 Settings
Tabs: **Profile** (name, organization, account type, time zone with a note about its effect), **Security** (change password, list of signed-in devices with last used and "Sign out" per device, "Sign out everywhere"), **Data and privacy** (what is stored, delete account with password re-entry and a typed confirmation), **Files** (upload, list, open via presigned link, delete; show an informative message if the API returns 503). API: `/profiles/me`, `/auth/change-password`, `/users/me/sessions`, `/auth/logout-all`, `DELETE /users/me`, `/files*`.

### 5.21 Terms and Privacy
Plain-language pages describing exactly what the product does: read-only access, what is stored, encrypted tokens, which data is sent to the AI provider, deletion rights. Leave the operator name and contact as clearly marked fields for the owner to fill; do not invent legal entities.

### 5.22 Admin console (admin role only)
Separate layout with a back-to-app link. Tabs: **System** (database status, uptime, counts, integrations configured: AI, email, storage, sync worker, scheduler, OAuth per platform), **Users** (search by email, paginate, make/remove admin, disable/enable; you cannot change yourself), **Connected accounts** (status, last sync, last error, "Sync" action; never show tokens), **Sync runs** (status, durations, item counts, errors), **Audit log** (action, actor, target, request id). Every action explains that it is recorded. API: `/admin/*`.

### 5.23 System pages
404 page, "You've been signed out" screen, offline/API-unreachable banner (message: "We couldn't reach Media Navigator. Check the connection and that the API address is configured."), and a generic error boundary with a reload button.

## 6. Cross-cutting behaviour

- **Session:** store tokens in a way you can justify, refresh once on 401, sign out and return to Sign in if refresh fails.
- **Routing:** URLs for every page above; deep links survive a reload; guard private routes; guard admin routes with the server-verified role.
- **Loading:** skeletons shaped like the final content; never block the shell.
- **Forms:** inline validation that mirrors the API rules, disable submit while pending, show server errors next to the field when `error.details` names it.
- **Empty states** always include what is missing and the single next action (for example "Connect an account", "Sync", "Publish a few more posts").
- **Copy:** plain, specific and non-judgemental; no jargon such as "KPI", "delta" or "heuristic"; never overpromise ("guaranteed", "viral").
- **Performance:** code-split by route, paginate lists, debounce search, do not refetch on every keystroke.
- **Testing:** unit-test formatting and state logic, and add end-to-end tests for sign-up, connect (mock only in tests), sync polling, post analysis with AI unavailable, and admin gating.

## 7. Deliverables

1. The full client implementing every page above with the states listed.
2. A short README: required environment variable(s), how to run, and how it maps to the API.
3. A list of any API behaviour you could not support and why, rather than faking it.
