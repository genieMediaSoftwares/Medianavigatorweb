# Media Navigator System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  React 19 + Vite + Tailwind CSS (Strict Custom Warm Palette)   │
│  Minimal, Progressive Disclosure, Intelligence-First UI         │
└────────────────┬────────────────────────────────┬───────────────┘
                 │ (REST API /api/v1/*)           │
                 ▼                                ▼
┌─────────────────────────────────┐  ┌────────────────────────────┐
│      Express 4 API Server       │  │   Gemini 3.8 Intelligence  │
│  - Authentication & Workspaces  │◄─┤   Engine (Server-Side SDK) │
│  - Data Aggregation Layer       │  │   - Pattern Explanations   │
│  - Job Dispatcher & Webhooks    │  │   - Action Recommendations │
└────────────────┬────────────────┘  └────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Unified Adapter Engine                        │
│   InstagramAdapter | FacebookAdapter | YouTubeAdapter | LinkedIn│
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Normalized Media Repository                   │
│   - PostgreSQL Schema / In-Memory Store with Multi-Tenant Keys  │
│   - Background Sync Pipeline & Token Encryption                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Tenets
1. **Intelligence in the Foreground, Complexity in the Background**: Thousands of raw data points are ingested, but the frontend strictly exposes 3–5 actionable insights.
2. **Fact vs. Inference Distinction**: Observed facts (e.g. "Engagement increased 24%") are strictly distinguished from inferred explanations (e.g. "The shorter format may have contributed to retention").
3. **Multi-Tenant Workspaces**: Every media asset, sync job, and insight belongs to an isolated `workspaceId`.
