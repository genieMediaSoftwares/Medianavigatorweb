# Media Navigator

> **“Don't make users navigate their media. Let Media Navigator navigate it for them.”**

Media Navigator is an AI-powered media intelligence command center that connects a business's Instagram, Facebook, YouTube, and LinkedIn accounts. It collects thousands of data points in the background, but surfaces only what actually matters:

- **What happened?**
- **Why did it happen?**
- **What should I do next?**

## Architecture
- **Backend only.** An Express + TypeScript API with versioned `/api/v1/*` endpoints, in `backend/`. This repository contains no web or mobile client; any client talks to the API described in `docs/api.md`.
- **Intelligence**: Server-side Gemini SDK (`@google/genai`) for interpretation, always separated from measured and calculated numbers.
- **Adapters**: Normalized multi-platform ingestion for Meta (Instagram and Facebook), YouTube and LinkedIn.
- **Documentation**: `docs/` (architecture, api, authentication, database, deployment, security, integrations, runbook), product docs in `docs/product/`, and the client brief in `docs/FRONTEND_PROMPT.md`.

## Project structure
```
backend/              Express + TypeScript API (its own package). See backend/README.md
  src/{config,middleware,routes,controllers,services,repositories,models,integrations,jobs,lib,validators}
  tests/              API integration tests against a real MongoDB
  scripts/            create-admin, seed-test-accounts (development only)
shared/               Response types used by the API
docs/                 architecture, api, authentication, database, deployment, security, integrations, runbook, FRONTEND_PROMPT
```

## Run locally
```bash
cd backend && npm install && npm run dev      # needs backend/.env, see backend/README.md
```

## Checks
```bash
cd backend && npm run typecheck && npm test && npm run build
```
