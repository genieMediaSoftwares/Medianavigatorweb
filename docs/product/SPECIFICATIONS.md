# Technical Specifications Document

## Project: Media Navigator
### Document Version: 2.4.0
### Scope: Complete Codebase & Feature Architecture

---

## 1. System Architecture & Tech Stack

### 1.1 Architecture Topology
Media Navigator is architected as a high-performance full-stack web application hosted in a single unified Node.js environment:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT LAYER                           │
│  React 18 SPA (Vite + Tailwind CSS + Lucide Icons + TypeScript)       │
│                                                                        │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │   MediaContext   │  │   Pages (14 Views) │  │  Modals & Drawers  │  │
│  │ (Global State)   │  │ Overview, Intel... │  │ Connect, Diagnosis │  │
│  └────────▲─────────┘  └─────────▲──────────┘  └─────────▲──────────┘  │
│           │                      │                       │             │
│           └──────────────────────┴───────────────────────┘             │
│                                  │ HTTP API Client (fetchJson)         │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ /api/v1/*
┌──────────────────────────────────▼─────────────────────────────────────┐
│                        BACKEND SERVER LAYER                            │
│  Express.js Application (server.ts) mounted on Port 3000              │
│                                                                        │
│  ┌───────────────────────┐          ┌────────────────────────────────┐ │
│  │      DataStore        │ ◄──────► │      Gemini 3.8 Flash SDK      │ │
│  │ In-Memory Aggregator  │          │   (@google/genai TypeScript)   │ │
│  └───────────▲───────────┘          └────────────────────────────────┘ │
│              │                                                         │
│  ┌───────────┴───────────────────────────────────────────────────────┐ │
│  │                    Integration Adapter Layer                       │ │
│  │   InstagramClient  │  YouTubeClient  │ FacebookClient │ LinkedIn   │ │
│  └───────────▲──────────────────▲───────────────▲──────────────▲─────┘ │
└──────────────┼──────────────────┼───────────────┼──────────────┼───────┘
               │                  │               │              │
┌──────────────▼──────────────────▼───────────────▼──────────────▼───────┐
│                    THIRD-PARTY PLATFORM APIs                           │
│  • Google YouTube Data API v3 (googleapis.com/youtube/v3)              │
│  • Meta Graph API v21.0/v22.0 (graph.facebook.com & graph.instagram)  │
│  • LinkedIn REST Community APIs (api.linkedin.com/v2)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Directory & Version Matrix
- **Runtime**: Node.js v20+ / tsx
- **Backend Framework**: Express 4.19+
- **Frontend Framework**: React 18.3+, React DOM
- **Bundler & Dev Server**: Vite 5.4+ with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS 4 with `@tailwindcss/vite`
- **Type System**: Strict TypeScript 5.5+
- **AI Engine**: Google Gen AI SDK (`@google/genai` v0.1.1) running `gemini-3.8-flash`
- **Icons**: Lucide React (`lucide-react`)
- **HTTP Client**: Native Web Fetch API with custom resilient JSON wrappers

---

## 2. Directory Layout & File Organization

```
/
├── .env.example                               # Environment template (GEMINI_API_KEY)
├── index.html                                 # HTML5 entrypoint with meta tags
├── metadata.json                              # AI Studio applet capabilities
├── package.json                               # Dependencies & npm scripts
├── server.ts                                  # Unified Express server & API routes
├── tsconfig.json                              # Strict TypeScript configuration
├── vite.config.ts                             # Vite configuration with Tailwind plugin
│
├── shared/
│   └── types.ts                               # Universal TypeScript data contracts
│
├── backend/
│   └── src/
│       ├── integrations/
│       │   ├── youtube/
│       │   │   ├── youtubeClient.ts           # Main YouTube coordinator
│       │   │   ├── youtubeAuth.ts             # API Key & OAuth validation
│       │   │   ├── dataApi.ts                 # YouTube Data API v3 client
│       │   │   └── analyticsApi.ts            # YouTube Analytics API client
│       │   ├── meta/
│       │   │   ├── metaClient.ts              # Base Meta HTTP fetcher
│       │   │   ├── metaAuth.ts                # Token inspector & permission parser
│       │   │   ├── instagram/
│       │   │   │   └── instagramClient.ts     # Instagram Graph API & Insights
│       │   │   └── facebook/
│       │   │       └── facebookClient.ts      # Facebook Pages & Post Insights
│       │   └── linkedin/
│       │       ├── linkedinAuth.ts            # LinkedIn OAuth token parser
│       │       └── linkedinClient.ts          # LinkedIn UGC feed client
│       └── services/
│           ├── dataStore.ts                   # In-memory store, metrics & algorithms
│           └── geminiService.ts               # Gemini 3.8 Flash AI prompts & reasoning
│
├── src/
│   ├── main.tsx                               # React root mounting
│   ├── App.tsx                                # Root routing & layout container
│   ├── types.ts                               # Frontend UI state and component types
│   ├── context/
│   │   └── MediaContext.tsx                   # Central React context & state store
│   ├── services/
│   │   └── api.ts                             # Typed API client for /api/v1/*
│   ├── components/
│   │   ├── common/
│   │   │   ├── BrandLogo.tsx                  # Media Navigator dynamic logo
│   │   │   ├── EmptyState.tsx                 # Zero-data transparent empty states
│   │   │   ├── LoadingOverlay.tsx             # Transition and loading spinner
│   │   │   └── PlatformLogos.tsx              # SVG logos (IG, YT, FB, LI)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                    # Desktop navigation sidebar
│   │   │   ├── TopBar.tsx                     # Header bar with workspace switcher
│   │   │   ├── MobileNav.tsx                  # Mobile bottom navigation bar
│   │   │   └── NotificationsDrawer.tsx        # Slide-over real-time alert panel
│   │   └── modals/
│   │       ├── PlatformConnectModal.tsx       # Live credential input & sync modal
│   │       ├── PostAIDiagnosisModal.tsx       # AI post diagnosis deep dive
│   │       ├── ContentDetailModal.tsx         # Media asset details inspection
│   │       └── SyncProgressModal.tsx          # Real-time multi-step ingestion modal
│   └── pages/
│       ├── Overview.tsx                       # Hero, signals, platform status grid
│       ├── ContentIntelligence.tsx            # Complete searchable media feed
│       ├── Intelligence.tsx                   # Top/bottom performers & archive audit
│       ├── Recommendations.tsx                # 5-point actionable growth engine
│       ├── TimingIntelligence.tsx             # 7x4 day/hour heatmap matrix
│       ├── Trends.tsx                         # Velocity curves & format momentum
│       ├── ContentPlanner.tsx                 # Scheduled calendar & 1-click plan
│       ├── CrossPlatform.tsx                  # Side-by-side platform comparison
│       ├── Reports.tsx                        # Executive report generation & print
│       ├── Connections.tsx                    # Integrations hub & channel manager
│       ├── Alerts.tsx                         # Critical performance alerts
│       ├── Settings.tsx                       # Workspace, brand context & privacy
│       ├── Landing.tsx                        # Public landing page & manifesto
│       ├── SignIn.tsx                         # User authentication & instant demo
│       ├── CreateAccount.tsx                  # User registration
│       └── Onboarding.tsx                     # 3-step brand profile wizard
```

---

## 3. Data Contracts & Canonical Schemas (`shared/types.ts`)

### 3.1 Normalized Media (`NormalizedMedia`)
```typescript
export interface NormalizedMedia {
  id: string;                          // Unique internal ID (e.g. 'yt_v123', 'ig_m456')
  workspaceId: string;                 // Workspace namespace ('ws_live')
  platform: PlatformType;              // 'instagram' | 'youtube' | 'facebook' | 'linkedin'
  platformContentId: string;           // Native platform ID
  contentType: 'post' | 'reel' | 'carousel' | 'video' | 'short';
  title: string;                       // Asset title or truncated caption headline
  caption: string;                     // Full original caption text
  thumbnailUrl: string;                // High-resolution image/thumbnail URL
  mediaUrl?: string;                   // Direct link to live post/video
  publishedAt: string;                 // ISO 8601 UTC timestamp
  durationSeconds?: number;            // Video runtime in seconds (crucial for Shorts classification)
  primarySignal: {
    label: string;                     // e.g. 'Short Plays', 'Verified Views'
    value: string;                     // Formatted string (e.g. '142,500')
    status: PerformanceTier;           // 'Strong' | 'Above average' | 'Average' | 'Declining'
  };
  views: number;                       // Total verified views or plays
  reach: number;                       // Total unique audience reached
  engagementRate: number;              // Percentage with 2 decimal places (e.g. 4.85)
  shares: number;                      // Total shares or saves
  likes: number;                       // Total like reactions
  comments: number;                    // Total verified comments
  explanation?: {
    observedFact: string;              // Measured numerical reality
    possibleReason: string;            // Causal editorial hypothesis
    whatToRepeat: string[];            // Actionable takeaways
  };
  isDemo: boolean;                     // Strict flag: false for all real API data
}
```

### 3.2 Platform Connection Record (`PlatformConnection`)
```typescript
export interface PlatformConnection {
  platform: PlatformType;              // 'instagram' | 'youtube' | 'facebook' | 'linkedin'
  name: string;                        // 'Instagram', 'YouTube', etc.
  accountHandle: string;               // e.g. '@mkbhd', 'Not connected'
  connected: boolean;                  // Boolean connection state
  lastSyncedAt: string;                // Timestamp of last successful ingestion
  status: 'connected' | 'not_connected' | 'syncing' | 'sync_complete' | 'sync_failed' | 'permission_required' | 'connection_expired';
  statusMessage?: string;              // Descriptive status or error message
  primaryStrength: string;             // Architectural capability description
  dataPointsCount: number;             // Count of verified assets synchronized
  avatarUrl?: string;                  // Profile picture URL
  accountInfo?: {
    id: string;
    username?: string;
    name?: string;
    followersCount?: number;
    mediaCount?: number;
  };
  missingPermissions?: string[];       // Unfulfilled OAuth scopes if any
}
```

### 3.3 Top & Bottom Performer Analysis (`PerformerAnalysis`)
```typescript
export interface PerformerAnalysis {
  media: NormalizedMedia;
  rank: number;                        // 1 to 5
  type: 'top' | 'bottom';
  headline: string;                    // Executive title
  baselineComparison: {
    medianEngagementRate: number;      // Channel median engagement rate
    assetEngagementRate: number;       // This asset's engagement rate
    ratioToMedian: number;             // e.g. 2.4 (meaning 2.4x channel baseline)
    differencePercent: number;         // e.g. +140.0%
    metricEvaluated: string;           // 'views' | 'likes' | 'comments' | 'engagement'
  };
  observedFact: string;                // Uncontestable measured fact
  possibleReason: string;              // Inferred structural explanation
  whatToRepeat: string[];              // Actionable elements to replicate or eliminate
  diagnostics: {
    hookPacingScore: number;           // 0 to 100
    formatAlignment: string;           // Evaluation of length vs. topic
    audienceRetentionHypothesis: string;
  };
}
```

### 3.4 5-Point Strategic Recommendation (`Recommendation`)
```typescript
export interface Recommendation {
  id: string;
  type: 'CREATE' | 'REPURPOSE' | 'TEST' | 'OPTIMIZE';
  title: string;
  reason: string;
  supportingSignal: string;
  actionText: string;
  status: 'pending' | 'applied';
  suggestedSlot?: {
    day: string;
    time: string;
    format: string;
  };
  // 5-Point Framework
  identifiedProblem: string;           // Point 1: Why current performance stalled
  supportingPattern: string;           // Point 2: Supporting historical metric
  recommendedImprovement: string;      // Point 3: Tactical editorial change
  suggestedImplementation: string;     // Point 4: Exact opening script hook
  expectedMeasurement: string;         // Point 5: Metric to evaluate success
}
```

---

## 4. Backend Engine Architecture

### 4.1 Server Entrypoint (`server.ts`)
- Configures JSON body parsing with Express.
- Mounts REST API routes under `/api/v1/*`.
- Configures Vite in middleware mode during development:
  ```typescript
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  ```
- In production, serves static build output from `/dist` with single-page application fallback.

### 4.2 In-Memory State & DataStore (`dataStore.ts`)
The `DataStore` class acts as the single source of truth for all synchronized platform data, performing real-time normalization, caching, ranking, and audit calculations:

#### Core DataStore Methods & Algorithms:
1. `connectAndSyncPlatform(platform, credentials)`:
   - Validates incoming keys/tokens via corresponding platform auth client.
   - Updates status to `syncing` and triggers platform client `sync()` or `fetchMedia()`.
   - Replaces platform-specific assets in `this.media` with newly verified items.
   - Computes real-time alerts via `generateRealAlerts()`.
2. `getComprehensiveArchiveAnalysis()`:
   - Evaluates the complete library of synchronized items.
   - Computes format breakdowns (`formats` array with `count`, `percentageOfLibrary`, `avgEngagement`, `avgViews`, `avgLikes`, `avgComments`).
   - Computes Question Hook Delta: Splits archive into items containing `?` vs. without `?` to measure engagement lift.
   - Computes Length & Pacing analysis: Classifies duration into short (`<=60s`), medium (`61-300s`), and long (`>300s`).
3. `getTopPerformers(sortBy)` / `getBottomPerformers(sortBy)`:
   - Sorts items by selected metric: `views`, `likes`, `comments`, or `engagement`.
   - Computes channel median baseline and derives `ratioToMedian = assetValue / channelMedian`.
   - Assigns structured `observedFact`, `possibleReason`, and `whatToRepeat`.
4. `computeTimingMatrix()`:
   - Groups published items into 28 buckets (7 days x 4 dayparts: Morning [6-12], Afternoon [12-17], Evening [17-22], Night [22-6]).
   - Computes average engagement rate per slot and normalizes scores from 0 to 100 relative to the maximum slot.

### 4.3 YouTube Integration Adapter (`backend/src/integrations/youtube/*`)
- **`youtubeAuth.ts`**:
  - `validate()`: Validates OAuth Bearer token via `https://www.googleapis.com/oauth2/v3/tokeninfo` or validates Google Data API Key via test query to `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=Ks-_Mh1QhMc`.
- **`dataApi.ts`**:
  - `getChannel()`:
    - If `mine=true` OAuth token is provided: queries `/channels?part=snippet,statistics,contentDetails&mine=true`.
    - If channel handle/query is provided: parses handle (`@...`), username (`forUsername`), or direct channel ID (`UC...`), and queries `/channels`.
    - If handle is omitted with an API key: queries `/videos?chart=mostPopular` to auto-discover active creator channel and avoid failed connections.
  - `getVideos()`:
    - Resolves uploads playlist (`UU...` replacing `UC...`).
    - Recursively fetches all playlist items in chunks of 50 up to 2,000 videos.
    - If playlist is `chart_popular`, queries `/videos?chart=mostPopular` directly from Google.
    - Chunks video IDs and fetches `/videos?part=snippet,statistics,contentDetails` to extract exact view, like, and comment counts.
    - Parses ISO 8601 duration (`PT#M#S`): items `<= 60s` flagged as `short`, `> 60s` as `video`.

### 4.4 Meta & Instagram Integration Adapter (`backend/src/integrations/meta/*`)
- **`metaAuth.ts`**:
  - Tests tokens against `graph.facebook.com/v20.0/me`, `graph.instagram.com/me`, and `graph.facebook.com/v20.0/me/accounts`.
  - Parses granted scopes: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`.
- **`instagramClient.ts`**:
  - `resolveAccount()`: Resolves linked Instagram Business or Creator accounts.
  - `fetchMedia()`:
    - Multi-strategy retrieval querying:
      1. Business discovery via authorized linked account.
      2. Direct page media via `graph.facebook.com/{id}/media`.
      3. Creator account media via `graph.instagram.com/v21.0/me/media`.
    - Requests full media fields: `id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children`.
    - `fetchItemInsights()`: Resilient insight extractor querying `graph.facebook.com` and `graph.instagram.com` for `views`, `plays`, `reach`, `impressions`, `saved`, and `shares`.
    - Realistic baseline derivation when insights permissions are restricted: uses industry benchmarks (Reels ~28x interactions, Carousels ~24x interactions).

### 4.5 Gemini AI Intelligence Engine (`geminiService.ts`)
- Initialized with `@google/genai` TypeScript SDK:
  ```typescript
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  ```
- **`askMediaNavigator(question, contextSummary)`**:
  - Injects complete archive audit, top 5 assets, bottom 5 assets, and format performance statistics into system instruction.
  - Uses model `gemini-3.8-flash` with structured JSON output schema returning `answer`, `observedSignal`, `suggestedAction`, and `source`.
- **`deepDiagnosePostAI(media, baseline)`**:
  - Compares individual post metrics against library averages to generate 5-dimension diagnosis:
    1. Overall diagnosis & score (0-100)
    2. Hook diagnosis (opening 3-second evaluation)
    3. Content pacing & retention analysis
    4. Algorithmic distribution breakdown
    5. Actionable prescriptive takeaways

---

## 5. Complete REST API Specification

| Endpoint | Method | Purpose | Request Body / Query Params | Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/workspaces` | GET | Retrieve workspace metadata | None | `{ success: true, data: Workspace }` |
| `/api/v1/connections` | GET | Retrieve all platform connection records | None | `{ success: true, data: PlatformConnection[] }` |
| `/api/v1/connections/:platform/connect` | POST | Connect platform with real credentials | `{ apiKey?, accessToken?, accountId?, channelId? }` | `{ success: true, data: PlatformConnection, message: string }` |
| `/api/v1/connections/:platform/sync` | POST | Re-synchronize platform using saved vault | None | `{ success: true, data: PlatformConnection, message: string }` |
| `/api/v1/connections/:platform/disconnect`| POST | Disconnect and clear platform media | None | `{ success: true, data: PlatformConnection }` |
| `/api/v1/youtube/fetch-channel` | POST | Pre-fetch YouTube channel metadata | `{ apiKey?, accessToken?, channelQuery? }` | `{ success: true, data: YouTubeChannelDetails }` |
| `/api/v1/analytics/overview` | GET | Executive overview signals & KPIs | None | `{ success: true, data: OverviewData }` |
| `/api/v1/media` | GET | Retrieve normalized media catalog | `?platform=all\|youtube\|instagram...` | `{ success: true, data: NormalizedMedia[] }` |
| `/api/v1/media/:id` | GET | Retrieve single normalized media asset | `id` in path | `{ success: true, data: NormalizedMedia }` |
| `/api/v1/timing` | GET | Retrieve 7x4 day/hour timing heatmap | None | `{ success: true, data: TimingData }` |
| `/api/v1/intelligence/signals` | GET | Retrieve AI insight stream | None | `{ success: true, data: { title: string, insights: AIInsight[] } }` |
| `/api/v1/intelligence/performers` | GET | Retrieve top 5 and bottom 5 performers | `?sortBy=views\|likes\|comments\|engagement` | `{ success: true, data: { top: PerformerAnalysis[], bottom: PerformerAnalysis[] } }` |
| `/api/v1/intelligence/patterns` | GET | Retrieve format performance patterns | None | `{ success: true, data: ContentPattern[] }` |
| `/api/v1/intelligence/archive-audit` | GET | Complete catalog audit statistics | None | `{ success: true, data: ArchiveAudit }` |
| `/api/v1/intelligence/ask` | POST | Ask natural language question to Gemini | `{ question: string }` | `{ success: true, data: { answer, observedSignal, suggestedAction, source } }` |
| `/api/v1/intelligence/diagnose-post` | POST | Deep AI diagnosis for single post | `{ mediaId: string }` | `{ success: true, data: PostAIDiagnosis }` |
| `/api/v1/recommendations` | GET | Retrieve 5-point strategic recommendations | None | `{ success: true, data: { title: string, items: Recommendation[] } }` |
| `/api/v1/recommendations/:id/plan` | POST | Commit recommendation to planner | `id` in path | `{ success: true, data: PlannedContent }` |
| `/api/v1/trends` | GET | Retrieve velocity and format trends | None | `{ success: true, data: { title: string, trends: TrendItem[] } }` |
| `/api/v1/planner` | GET | Retrieve scheduled editorial items | None | `{ success: true, data: PlannedContent[] }` |
| `/api/v1/planner` | POST | Add scheduled editorial item | `{ day, time, platform, contentType, title }` | `{ success: true, data: PlannedContent }` |
| `/api/v1/planner/:id` | DELETE| Remove scheduled editorial item | `id` in path | `{ success: true, data: { id: string } }` |
| `/api/v1/alerts` | GET | Retrieve active system & performance alerts | None | `{ success: true, data: AlertItem[] }` |
| `/api/v1/alerts/:id/dismiss` | POST | Mark alert as dismissed | `id` in path | `{ success: true, data: AlertItem }` |

---

## 6. Frontend Architecture & Screen-by-Screen Specification

### 6.1 State Management (`MediaContext.tsx`)
The React context provides centralized reactive state across the application:
- `currentTab`: Active page view (`'overview' | 'content' | 'intelligence' | 'recommendations' | 'timing' | 'trends' | 'planner' | 'cross_platform' | 'reports' | 'connections' | 'alerts' | 'settings'`).
- `selectedPlatform`: Platform filter (`'all' | 'instagram' | 'youtube' | 'facebook' | 'linkedin'`).
- `connections`: Reactive list of connection statuses synchronized with the backend.
- `reports`: Dynamic executive briefs calculated on-the-fly from active media assets.
- `notifications`: Real-time system and ingestion notifications with unread badge counter.

### 6.2 Screen-by-Screen Feature Matrix

#### 1. Overview (`src/pages/Overview.tsx`)
- **Hero Banner**: High-level library summary; displays verified asset count and interaction total.
- **Platform Grid**: 4-card interactive status bar with live logos, API version badges, asset tallies, and direct modal triggers.
- **Key Signals**: 3 dynamic cards highlighting top asset, strongest timing window, and format optimization gap.
- **Observations Stream**: Platform baseline cards summarizing audience interaction density.

#### 2. Content Intelligence (`src/pages/ContentIntelligence.tsx`)
- **Search & Filter**: Real-time text search across titles and captions.
- **Multi-Criteria Sorting**: Sort by Views, Likes, Comments, Engagement Rate, or Published Date.
- **Asset Cards**: Thumbnail preview, platform badge, format badge, duration indicator, verified views, engagement percentage, and "AI Diagnose" button.

#### 3. Intelligence & Archive Audit (`src/pages/Intelligence.tsx`)
- **Sub-Tabs**:
  1. *Archive Audit*: Complete catalog breakdown, format percentage bars, question hook delta comparison, and duration distribution.
  2. *Top Performers*: 5 ranked winners with exact baseline comparison multiples and "What to repeat".
  3. *Bottom Performers*: 5 ranked underperformers with diagnostic hypotheses and "What to avoid".
  4. *Format Patterns*: Comparative format engagement rates and average view velocity.
  5. *AI Insights*: Stream of high-confidence strategic observations.
- **Ask Media Navigator**: Natural language search box triggering grounded Gemini 3.8 Flash analysis.

#### 4. Recommendations (`src/pages/Recommendations.tsx`)
- **5-Point Cards**: Filterable by CREATE, REPURPOSE, TEST, and OPTIMIZE.
- **Structured Fields**: Identified Problem, Supporting Pattern, Recommended Improvement, Suggested Implementation (script hook), and Expected Measurement.
- **1-Click Plan Button**: Adds item directly to the Content Planner with suggested day and time.

#### 5. Timing Intelligence (`src/pages/TimingIntelligence.tsx`)
- **7x4 Day & Hour Heatmap**: Interactive grid showing Morning, Afternoon, Evening, and Night across all 7 days.
- **Score & Sample Count**: Tooltip shows exact percentage score and sample post count backing each cell.
- **Optimal Momentum Box**: High-confidence summary of the single best publishing window.

#### 6. Trends & Opportunity Engine (`src/pages/Trends.tsx`)
- **Velocity Tracker**: Measures engagement velocity between recent half of releases and earlier half.
- **Format Resonancy**: Tracks which content format is gaining algorithmic momentum.
- **Interrogative Caption Hooks**: Monitors engagement lift generated by caption questions.

#### 7. Content Planner (`src/pages/ContentPlanner.tsx`)
- **Editorial Calendar Grid**: Visual schedule organized by day of week.
- **Planner Item Cards**: Displays target platform logo, scheduled time, format badge, and title.
- **Modal Creator**: Add custom planned items with day, time, format, and platform selectors.

#### 8. Cross-Platform Comparison (`src/pages/CrossPlatform.tsx`)
- **4-Platform Card Matrix**: Direct comparison of connected channels with reach, views, and engagement rates.
- **Comparative Analysis Table**: Side-by-side metric matrix identifying cross-posting opportunities.

#### 9. Executive Reports (`src/pages/Reports.tsx`)
- **Dynamic Report Generator**: Computes total reach, verified views, average engagement, and growth rate for selected period.
- **Printable Document Card**: Clean, high-contrast executive report layout with executive summary, verified highlights, and top performer spotlight.
- **Export Action**: Browser print/PDF export trigger.

#### 10. Connections Manager (`src/pages/Connections.tsx`)
- **Integrations Cards**: Dedicated cards for Instagram, YouTube, Facebook, and LinkedIn.
- **Direct Connect Trigger**: Opens `PlatformConnectModal` directly for instant API key or token authorization.
- **Sync & Disconnect Controls**: Trigger live archive re-synchronization or remove stored credentials.

#### 11. Alerts Center (`src/pages/Alerts.tsx`)
- **Alert Stream**: Real-time event log tracking performance spikes (`> 2.0x` baseline), token expirations, and ingestion events.
- **Dismiss Action**: Mark individual alerts as read.

#### 12. Settings & Brand Context (`src/pages/Settings.tsx`)
- **Brand Profile Controls**: Set brand name, content niche, target audience, and primary social goal.
- **AI Reasoning Preferences**: Toggle strict measured-data grounding and configure pattern confidence thresholds.
- **Data & Privacy**: Data export in JSON format and read-only permission guarantees.

---

## 7. Security, Privacy & Integrity Guarantees

1. **Read-Only Scopes**: Media Navigator strictly requests read-only OAuth scopes (`youtube.readonly`, `instagram_basic`, `pages_read_engagement`). The application contains zero mutations, publish endpoints, or delete capabilities on user social channels.
2. **Credential Vault**: Tokens and API keys are stored in private server-side memory (`credentialsVault`) and are never included in API responses sent to the client.
3. **Client-Side Google OAuth**: In compliance with AI Studio runtime requirements, Google Workspace and YouTube OAuth flows operate client-side without server-side redirect secrets.
4. **Anti-Slop & Zero-Hallucination**: The AI engine is strictly instructed to refuse algorithmic speculation and ground every response in measured numbers.
