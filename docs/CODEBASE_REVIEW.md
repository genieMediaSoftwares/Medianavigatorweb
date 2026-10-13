# Media Navigator codebase review

Reviewed 13 October 2026.

## Overview

Media Navigator has a Next.js/React frontend, an Express/TypeScript API, MongoDB storage, and a shared response type layer. The browser calls Next.js route handlers; those handlers forward requests to the API and keep access and refresh tokens in HTTP-only cookies. The API separates routes, controllers, services, repositories, and models.

This is an architecture and implementation review across the application, accompanied by the existing automated suites. It is not a line-by-line security certification or verification against live social-platform accounts.

## Application map

| Area | Implementation and review notes |
| --- | --- |
| Public website and authentication | Landing, legal pages, sign-in, signup, password reset. Shared form and brand components. |
| Application shell | Desktop sidebar, mobile navigation, channel selector, account menu, notifications, onboarding guard. |
| Home and media | Overview, cursor-paginated post feed, post detail drawers, performance comparisons. React Query manages remote data and caching. |
| Insights | Archive, performers, patterns, signals, AI questions, and video analysis. Several existing correctness issues are listed below. |
| Planning and timing | Recommendations, planned slots, posting-time heat map, timezone-aware analytics. |
| Accounts and administration | Profile/security/privacy/files, connected platforms, user management, sync runs, audit trail, system status. |
| API security | JWT verification plus current server-side session/account checks; database-backed roles; refresh-token rotation; input validation, rate limits, CORS, and security headers. |
| Integrations and sync | Meta, YouTube, and LinkedIn adapters normalize content. Credentials are encrypted; durable sync jobs use leases, retry handling, and background scheduling. |
| Analytics and AI | A deterministic statistics layer and analytics engine feed server-side Gemini interpretation. AI responses are schema-validated and input sizes are bounded. |
| Storage and operations | MongoDB repositories/models, R2 file service, optional SMTP, environment validation, deployment/runbook documentation. |

## Palette changes delivered

- White cards and panels on a pale blue application background (`#f1f8fd`).
- Light blue section backgrounds (`#eff8ff`, `#dff1ff`) and soft blue borders.
- Navy text (`#17354d`) and stronger blue actions (`#1575ad`) for legibility.
- Pale blue authentication, privacy, and archive panels replace heavy blue backgrounds.
- Buttons, tabs, mobile navigation, post headings, and brand text now use shared colour tokens.
- The Tailwind dark variant now follows the explicit theme attribute, preventing operating-system dark preferences from unexpectedly overriding light-mode components.
- Added the missing `brand-300` utility token and constrained logo artwork to its container width.
- Corrected three pre-existing JSX apostrophe lint errors in Insights.

The existing logo artwork and platform logos retain their original colours. Success, warning, and error colours remain distinct so status information stays understandable.

## Existing findings for follow-up

### High: failed AI audits are reported as successful

`web/components/insights/insights-view.tsx`, `handleAuditAll`: the catch branch sets a message saying the exhaustive audit completed and metrics were recalculated. A network or API failure therefore produces a false success message. This should display an error with a retry action; completion should require a successful response. The current operation calls the AI question endpoint, which should not be described as recalculating the database.

### Medium: the archive screen overstates completeness

The Insights screen says there is no pagination limit and that the entire catalogue has been retrieved. However, `backend/src/repositories/media.repository.ts`, `listForAnalytics`, applies `config.database.analyticsMaxItems`. The UI should distinguish the number analyzed from the total available and disclose truncation. A large catalogue can otherwise look completely analyzed when it is not.

### Medium: Insights does not use the selected channel

`InsightsView` reads `channel` from `useChannel`, but its archive, performer, signal, and pattern queries do not include that value. Selecting a channel in the shared header can leave this page showing aggregate data. Either implement platform-scoped queries and cache keys or explicitly communicate that the page covers all channels.

### Maintainability

The large Insights component combines queries, several tab views, cards, and action handlers. Splitting these into smaller modules would make behavior easier to test. Existing image optimization and configuration export lint warnings remain. Live provider integration behavior still needs separate credentialed end-to-end verification.

## Verification

- Frontend TypeScript: passed.
- Backend TypeScript: passed.
- Frontend unit tests: 30 passed across 6 files.
- Backend tests: 95 passed across 8 files, using a temporary MongoDB test database.
- Frontend lint: passed with 6 existing warnings, no errors.
- Backend production build: passed.
- Frontend production build: passed using `npm run build -- --webpack`; all 20 pages generated. The default Turbopack build encountered an environment port-binding failure after an initial restricted Google Fonts request.
- Local preview: running at http://127.0.0.1:3000. Public landing and account creation screens were visually inspected in the browser.
- Authenticated dashboard browser flows and live OAuth/provider integrations were not exercised. Shared style changes apply to their components, but passing automated tests does not establish live-service correctness.

## Preview

Run `npm run dev -- --hostname 127.0.0.1` from `web/` to restart the preview when needed. The web app requires its configured API address; sign-in, signup, and private data additionally require a reachable API/database. No authentication bypass or mock account data was added.
