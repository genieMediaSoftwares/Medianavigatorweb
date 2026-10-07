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
api/                  Vercel serverless entry points (re-export the Express app)
backend/src/
  server.ts           Local/prod entry: Vite dev middleware or static serving + listen
  app.ts              Express app: middleware + /api/v1 routes
  config/             Environment config
  middleware/         Path normalization, CORS
  routes/             One router per API area (connections, media, intelligence, ...)
  services/           dataStore, ai/geminiService
  integrations/       Meta, YouTube, LinkedIn clients
  lib/                Shared helpers (response format)
shared/               Types shared by frontend and backend
src/
  app/                layout (Sidebar, TopBar, ...) and providers (Media/Admin context)
  features/           One folder per product area (auth, overview, intelligence, admin, ...)
  components/         Shared UI (common, modals)
  services/           API client and analytics engine
  styles/             Global CSS
docs/                 Architecture, API, integrations, product docs
```

## Build & Run
```bash
npm run lint    # type-check
npm run build   # vite build + bundle server to dist/server.cjs
npm start       # run the production bundle
```
Local runtime data (`data/`, `backend/data/`) is git-ignored because it may contain access tokens.
