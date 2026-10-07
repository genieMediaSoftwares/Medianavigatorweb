# Media Navigator

> **“Don't make users navigate their media. Let Media Navigator navigate it for them.”**

Media Navigator is an AI-powered media intelligence command center that connects a business's Instagram, Facebook, YouTube, and LinkedIn accounts. It collects thousands of data points in the background, but surfaces only what actually matters:

- **What happened?**
- **Why did it happen?**
- **What should I do next?**

## Color Palette (Strict Custom Identity)
- **Primary Button**: `bg-[#8B2626] hover:bg-[#721E1E] text-white`
- **Accent Badge**: `bg-[#EF6905]/10 text-[#EF6905] border border-[#EF6905]/20`
- **Success / Active**: `bg-[#486C2F]/10 text-[#486C2F]`
- **Card Background**: `bg-[#FAF6E8] border border-[#E8DEB7]`
- **Main Heading Text**: `text-[#2A1A18]`
- **Muted Body Text**: `text-[#6A5652]`

## Architecture
- **Frontend**: React 19, Tailwind CSS v4, Lucide icons, Motion layout transitions.
- **Backend**: Express API server with versioned `/api/v1/*` endpoints.
- **Intelligence**: Server-side Gemini 3.8 Flash SDK (`@google/genai`) for pattern explanation and conversational media Q&A.
- **Adapters**: Normalized multi-platform ingestion engine for Meta (Instagram & Facebook), YouTube, and LinkedIn.
- **Documentation**: Comprehensive platform API notes in `docs/integrations/`, engineering designs in `docs/`, product docs in `docs/product/`.

## Local Development
```bash
npm install
npm run dev
```
Dev server starts at `http://localhost:3000`.

## Project Structure
```
backend/              Express + TypeScript API (its own package). See backend/README.md
  src/{config,middleware,routes,controllers,services,repositories,models,integrations,jobs,lib,validators}
  tests/              API integration tests against a real MongoDB
shared/               Types shared by the web client and the API
src/                  React web app (Vite)
  app/                layout and providers
  features/           one folder per product area (auth, overview, intelligence, admin, ...)
  components/         shared UI
  services/           API client (auth + data); no provider calls from the browser
docs/                 architecture, api, authentication, database, deployment, security, integrations, runbook
```

## Run locally
```bash
# API (needs backend/.env, see backend/README.md)
cd backend && npm install && npm run dev

# Web app (separate terminal)
npm install
VITE_API_BASE_URL=http://localhost:<SERVER_PORT> npm run dev
```
The web client reads `VITE_API_BASE_URL` (empty = same origin). For a same-origin dev setup set `VITE_DEV_API_PROXY` to forward `/api` to the API.

## Checks
```bash
npm run lint && npm run build          # web
npm --prefix backend run typecheck && npm --prefix backend test && npm --prefix backend run build   # API
```
