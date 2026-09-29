# Product Requirements Document (PRD)

## Project Name: Media Navigator
### Document Version: 2.4.0
### Status: Approved & Implemented
### Target Environment: Node.js + Express + React (Vite SPA) + Gemini 3.8 Flash

---

## 1. Executive Summary & Product Vision

### 1.1 Product Vision
**Media Navigator** is an enterprise-grade social media intelligence, performance diagnostics, and strategic growth command center. It replaces speculative social media guesswork with **statistically grounded, verified intelligence** derived directly from official platform APIs across **Instagram, YouTube, Facebook, and LinkedIn**.

### 1.2 Core Integrity Principle: Grounded Zero-Fabrication
Media Navigator operates on an unwavering principle: **Never fabricate synthetic statistics or hallucinate algorithms**.
- All metrics (views, reach, plays, likes, comments, watch time, durations, timestamps) come strictly from live, authorized API responses.
- When an account is not connected, or when a platform API does not supply a metric, the system explicitly displays transparent empty states or limitation notices rather than generating mock placeholders.
- Causal explanations are rigorously delineated: **Measured Facts** (what happened in the numbers) vs. **Hypotheses & Explanations** (why it may have occurred) vs. **Prescriptive Actions** (what to do next).

### 1.3 Target Audience & Personas
1. **Solo Creators & Influencers**: Need clear clarity on which video format (Shorts vs. Long-form vs. Reels) actually converts attention into followers without drowning in raw dashboards.
2. **Social Media Managers & Content Directors**: Manage multi-platform distribution and require historical baseline comparisons to justify editorial decisions and scheduling cadences.
3. **Growth Marketing & Performance Agencies**: Conduct comprehensive content archive audits, diagnose why specific campaigns failed or exploded, and deliver white-labeled executive reports to clients.
4. **Brand Strategists & CMOs**: Require high-level cross-platform velocity insights, library-wide pattern audits, and prioritized 5-point action recommendations.

---

## 2. User Journeys & End-to-End Workflows

```
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│  Landing Page   │ ────► │  Sign-In / Onboarding  │ ────► │  Platform Connection   │
│ & Value Prop    │       │  Profile & Brand Setup │       │  (YouTube / Instagram) │
└─────────────────┘       └────────────────────────┘       └───────────┬────────────┘
                                                                       │
                                  ┌────────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             MEDIA NAVIGATOR APP                                  │
│                                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │   Overview Dashboard    │  │  Content Intelligence   │  │  Timing Engine   │  │
│  │ Real-time Signals & KPIs│  │ Full Archive Catalog    │  │ Day/Hour Matrix  │  │
│  └─────────────────────────┘  └─────────────────────────┘  └──────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │  Intelligence Stream    │  │  AI Recommendations     │  │ Executive Report │  │
│  │ Top/Bottom & Diagnostics│  │ 5-Point Structured Recs │  │ PDF/Print Export │  │
│  └─────────────────────────┘  └─────────────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 First-Time User Experience (FTUE)
1. **Landing Page**: Explores interactive features, anti-hallucination manifesto, platform integrations, and security guarantees.
2. **Registration / Demo Workspace Sign-In**: Creates account with name, email, brand profile, primary niche, and social objectives.
3. **Channel Connection**: Directly connects official accounts via YouTube Data API Key or Instagram Access Token / Meta Graph Key with zero manual configuration files.
4. **Instant Archive Ingestion**: System connects directly to the platform endpoints, parses published media, extracts metrics, computes baseline multiples, and populates the command center.

### 2.2 Routine Creator Workflow
1. Creator opens **Overview** to review recent engagement velocity and key signals ("What's working", "Best time", "New opportunity").
2. Drills into **Intelligence Stream** to inspect top performers and run **AI Post Diagnosis** on an underperforming asset to understand whether the drop was hook-related or format-related.
3. Reviews **Timing Intelligence** to see exact historical days and hours when audience interactions peaked.
4. Checks **Recommendations**, clicks "Plan in schedule" on a prioritized recommendation to instantly book it into the **Content Planner**.
5. Generates and exports an **Executive Intelligence Report** for brand sponsors or agency stakeholders.

---

## 3. Detailed Functional Modules & Requirements

### Module 1: Platform Ingestion & Authorization
- **FR-1.1 YouTube Integration**:
  - Direct connection using Google YouTube Data API Key or OAuth 2.0 Bearer token.
  - Automatic channel resolution by `@handle`, username, channel URL, or 24-character `UC` channel ID.
  - Auto-discovery mode: If channel handle is omitted, system directly queries Google's live YouTube Data API v3 (`/videos?chart=mostPopular`) to ingest active video assets and discover channel context.
  - Ingestion of full uploads playlist (`UU...`), video metadata, statistics (`viewCount`, `likeCount`, `commentCount`), duration parsing (`PT#M#S` to seconds), and categorization into Shorts (`<= 60s`) vs. Long-form Video (`> 60s`).
- **FR-1.2 Instagram Integration**:
  - Connection via Instagram User Access Token, Meta Graph API Key (`EAAB...`, `IGAA...`, `IGQ...`), or Instagram Data API Key.
  - Direct endpoint resolution via `graph.instagram.com/me` and `graph.facebook.com/v21.0/me/accounts`.
  - Multi-tier ingestion covering Reels, Carousels, and Feed Posts with verified `views`, `reach`, `impressions`, `like_count`, `comments_count`, and `saved` counts.
  - Resilient dual-endpoint insights handling (`graph.instagram.com/v21.0/{mediaId}/insights` and `graph.facebook.com/v21.0/{mediaId}/insights`).
- **FR-1.3 Facebook Page Integration**:
  - Integration with Meta Page Insights API to retrieve published page updates, video views, and viral shares.
- **FR-1.4 LinkedIn Integration**:
  - Connection to LinkedIn Community Management API for company page UGC posts, impressions, and engagement.
- **FR-1.5 Vault & Security**:
  - Credentials securely stored in server-side in-memory vault; never leaked or returned in client API payloads.

### Module 2: Grounded Media Normalization Engine
- **FR-2.1 Universal Normalized Schema**:
  - Standardizes all heterogeneous platform media into a single canonical `NormalizedMedia` record (`id`, `platform`, `contentType`, `title`, `caption`, `views`, `reach`, `engagementRate`, `likes`, `comments`, `shares`, `publishedAt`, `durationSeconds`, `explanation`).
- **FR-2.2 Strict Engagement Rate Calculations**:
  - Universal formula: `((likes + comments) / (reach > 0 ? reach : views)) * 100`.
- **FR-2.3 Performance Tier Classification**:
  - Dynamically classifies every piece of content into `Strong`, `Above average`, `Average`, or `Declining` based on account baseline engagement and raw velocity.

### Module 3: Executive Overview & Command Center
- **FR-3.1 Hero Signal Banner**:
  - Displays aggregate count of verified analyzed assets, primary format winner, and total interactions.
  - Displays "Awaiting synchronization" and clean empty state when no accounts are connected.
- **FR-3.2 Real-time Key Signals (Section 2 Spec)**:
  - 3 dynamic cards: "What's working" (highest converting asset), "Best time" (strongest historical window), "New opportunity" (underperforming format optimization).
- **FR-3.3 Platform Channels Status Grid**:
  - Interactive 4-card matrix displaying integration status, account handle, analyzed asset counts, and "Connect" / "Manage" controls.
- **FR-3.4 Observations Stream**:
  - Platform-by-platform baseline cards summarizing audience interaction density and total logged views.

### Module 4: Intelligence Stream & Deep Diagnostics
- **FR-4.1 Top & Bottom Performer Analysis (Sections 4 & 5 Spec)**:
  - Rank top 5 and bottom 5 performers sorted by Views, Likes, Comments, or Engagement Rate.
  - Compute `baselineComparison`: Exact percentage and multiplier (`X.Xx`) above or below historical channel median.
  - Formulate structured explanations: **Observed Fact**, **Possible Reason**, and **What to Repeat / Avoid**.
- **FR-4.2 AI Post Diagnosis Modal**:
  - Interactive deep-dive modal evaluating specific post metrics against library averages.
  - Diagnoses opening hook retention, thumbnail clarity, caption pacing, and algorithmic distribution status.

### Module 5: Archive Audit & Content Pattern Analysis
- **FR-5.1 Comprehensive Catalog Audit**:
  - Aggregates total posts, Reels, and videos across complete account history.
  - Computes library-wide average engagement rate, total impressions, and interaction distribution.
- **FR-5.2 Content Pattern Analysis (Section 9 Spec)**:
  - Format Resonancy: Evaluates average engagement rate and view count per format (Shorts vs. Videos vs. Reels vs. Carousels).
  - Question Hook Delta: Compares performance of titles/captions containing explicit interrogative hooks (`?`) versus declarative statements.
  - Pacing & Caption Length Analysis: Correlates character count with audience comment velocity.

### Module 6: Ask Media Navigator (AI Grounded Q&A)
- **FR-6.1 Conversational Creator Copilot**:
  - Powered by Gemini 3.8 Flash (`@google/genai` SDK).
  - Answers natural language questions (e.g. *"Why did my last 3 Reels drop in views?"*, *"Should I focus on Shorts or long-form videos?"*).
  - Context strictly injected with the verified archive audit, top 5 assets, bottom 5 assets, and format performance tables.
  - Anti-hallucination guardrail: AI is forbidden from claiming proprietary algorithm secrets or inventing metrics.

### Module 7: Timing Intelligence Engine
- **FR-7.1 7x4 Day-and-Hour Matrix (Section 10 Spec)**:
  - Evaluates historical publication timestamps across Monday–Sunday and 4 dayparts (Morning, Afternoon, Evening, Night).
  - Normalizes scores from 0 to 100 based on verified average engagement rate per slot.
  - Displays sample post count per cell to maintain statistical transparency.
- **FR-7.2 Optimal Momentum Recommendation**:
  - Pinpoints the single highest-performing historical window and generates specific scheduling advice.

### Module 8: AI-Powered Trends & Velocity Engine
- **FR-8.1 Audience Behaviour & Momentum (Section 7 Spec)**:
  - Analyzes Engagement Velocity by splitting historical media into recent half vs. earlier half to detect upward momentum (`Rising`) or fatigue (`Losing momentum`).
  - Format Momentum tracking indicating which format delivers the highest algorithmic lift over channel baseline.
  - Question Hook Delta trend identifying comment-driving caption frameworks.

### Module 9: 5-Point Strategic Recommendation Engine
- **FR-9.1 Structured 5-Point Architecture (Section 6 Spec)**:
  Every recommendation enforces a strict 5-element format:
  1. **Identified Problem**: Why this gap requires intervention.
  2. **Supporting Pattern**: The statistical data point from the archive backing the claim.
  3. **Recommended Improvement**: High-impact editorial or production adjustment.
  4. **Suggested Implementation**: Word-for-word opening script hook or production directive.
  5. **Expected Measurement**: Metric and threshold to determine success after release.
- **FR-9.2 1-Click Planning**:
  - "Plan in schedule" action directly commits the recommendation into the Content Planner.

### Module 10: Content Planner & Scheduler
- **FR-10.1 Multi-Day Editorial Calendar**:
  - Interactive grid organized by day of week and scheduled time slots.
  - Supports adding custom planned concepts or auto-populating from AI recommendations.
  - Status management: `scheduled`, `draft`, `published`.

### Module 11: Cross-Platform Performance Matrix
- **FR-11.1 Side-by-Side Comparative Matrix**:
  - Compares reach, velocity, and engagement across Instagram, YouTube, Facebook, and LinkedIn.
  - Identifies platform synergy and cross-repurposing opportunities (e.g. converting high-watch YouTube Shorts into Instagram Reels).

### Module 12: Executive Intelligence Reporting
- **FR-12.1 Dynamic Executive Report Generation**:
  - Dynamically computes total reach, verified views, audience growth rate, and key findings from active media assets.
  - Formats report into a printable, presentation-ready executive document card with executive summary, highlights, and top asset spotlight.

### Module 13: Real-Time Alerts & Notification Drawer
- **FR-13.1 Event-Driven Notifications**:
  - Triggers notifications on ingestion completion, connection expiration, and new report readiness.
- **FR-13.2 Performance Spike Alerts**:
  - Automated alert trigger when any post exceeds 2.0x channel average engagement rate.

### Module 14: Settings & Data Governance
- **FR-14.1 Workspace & Brand Profile Controls**:
  - Configure brand name, target demographic, primary social goal, and content niche.
- **FR-14.2 AI Reasoning Settings**:
  - Strict measured-data grounding toggle, confidence thresholds, and read-only OAuth guarantees.

---

## 4. Non-Functional Requirements (NFR)

| Area | Requirement |
| :--- | :--- |
| **Response Latency** | REST API endpoints must respond within `< 100ms` for cached/in-memory data; external platform sync within `< 3500ms`. |
| **Security & OAuth** | Read-only scopes strictly enforced. No write, post, or delete access requested or implemented. In-memory credentials vault with zero frontend exposure. |
| **Data Integrity** | Zero synthetic or mock data fallbacks in live mode. Clear empty states with onboarding instructions when accounts are not connected. |
| **Concurrency & Paging** | Recursive pagination fetching up to 2,000 items per platform with chunked parallel batching to avoid API rate limiting. |
| **UI Responsiveness** | Fully fluid across desktop (`1440px`), tablet (`768px`), and mobile viewports (`375px`) with zero horizontal overflow. |
| **Code Quality** | 100% strict TypeScript types, zero `any` in public contracts, clean Vite compilation with zero lint warnings. |

---

## 5. Success Metrics & Key Performance Indicators (KPIs)
1. **Zero-Hallucination Rate**: 100% of reported view, like, and comment numbers match the exact JSON responses from Google and Meta APIs.
2. **Time to First Insight**: A creator connecting a YouTube Data API Key or Instagram Access Token sees verified analytics in `< 5 seconds`.
3. **Actionability Ratio**: Every insight produced provides an exact script or editorial hook rather than generic advice.
4. **Planning Conversion**: At least 30% of reviewed recommendations converted into scheduled content items via the 1-click planner.
