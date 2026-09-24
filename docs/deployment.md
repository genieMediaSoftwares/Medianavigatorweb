# Deployment & Production Architecture

## Production Target Stack
- **Frontend SPA**: Static asset distribution via Cloudflare Pages, Vercel, or AWS S3/CloudFront.
- **Backend Service**: Containerized Node.js (v20+) running Express behind an Nginx reverse proxy on Cloud Run, Render, or AWS ECS.
- **Database**: PostgreSQL (v15+) with connection pooling (e.g., PgBouncer / Cloud SQL Proxy).
- **Background Worker**: Node.js worker process reading job queues from Redis / BullMQ.
- **AI Model**: Google Gemini 3.8 Flash via `@google/genai` invoked server-side.

## Environment Configuration
Ensure `.env` provides:
- `PORT=3000`
- `NODE_ENV=production`
- `GEMINI_API_KEY=<key>`
- `DATABASE_URL=postgres://...`
- `JWT_SECRET=<32-char-random>`
