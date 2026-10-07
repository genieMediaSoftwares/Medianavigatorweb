# MEDIA NAVIGATOR: Ultra-Detailed System & Functionality Documentation

## AI-Powered Social Media Intelligence & Growth Platform

---

### Executive Summary & Core Objective

**Media Navigator** is an enterprise-grade AI-powered social media intelligence and growth platform that connects Instagram, YouTube, Facebook, and LinkedIn profiles. It transforms raw API metrics into structured intelligence: identifying top- and bottom-performing content, analyzing recurring patterns, pinpointing optimal publishing windows, and formulating 5-point actionable growth recommendations.

#### Core Integrity Principle: Grounded Zero-Fabrication
Media Navigator strictly enforces that **only metrics directly returned by authorized official APIs are analyzed and displayed**. When API permissions do not provide a metric, or when historical data is insufficient, the system explicitly communicates this limitation rather than fabricating synthetic statistics. Inferred explanations are transparently labeled as hypotheses distinct from verified observations.

---

## 1. System Architecture & Tech Stack

### 1.1 Full-Stack Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT SPA (Vite + Tailwind)                     │
│  Overview | Intelligence | Content | Timing | Trends | Recommendations │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP REST API (/api/v1/*)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       EXPRESS NODE.JS SERVICE                          │
│                                                                        │
│  ┌───────────────────────┐          ┌────────────────────────────────┐ │
│  │      DataStore        │ ◄──────► │     Gemini 3.8 Flash Engine    │ │
│  │ (State & Aggregator)  │          │  (Ask Media Navigator / Audits)│ │
│  └───────────▲───────────┘          └────────────────────────────────┘ │
│              │                                                         │
│  ┌───────────┴───────────────────────────────────────────────────────┐ │
│  │                   Platform Integration Clients                     │ │
│  │   InstagramClient  |  YouTubeClient  | FacebookClient | LinkedIn  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Official REST & Graph APIs
┌──────────────────────────────────▼─────────────────────────────────────┐
│            Official Social Media Provider Graph & REST APIs            │
│       graph.instagram.com | graph.facebook.com | googleapis.com        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 18 SPA with Vite, Tailwind CSS, Lucide icons, responsive design with zero external bloat.
- **Backend**: Node.js / Express running unified with Vite middleware on port 3000 (`server.ts`).
- **AI Engine**: Gemini 3.8 Flash (`@google/genai` TypeScript SDK) evaluating context strictly against real channel records.
- **State & Data Store**: In-memory persistent data store (`dataStore.ts`) providing normalization, aggregation, rate calculations, and intelligence filtering.

---

## 2. Platform Integrations & Authentication

### 2.1 Instagram Integration
- **Client**: `InstagramClient` extending `MetaClient` (`/backend/src/integrations/meta/instagram/instagramClient.ts`).
- **Authentication Strategies**:
  1. **Direct Instagram User Token**: Queries `https://graph.instagram.com/me` and `me/media`.
  2. **Instagram Graph API via Facebook Page**: Queries `https://graph.facebook.com/v21.0/me/accounts` to resolve the linked `instagram_business_account`.
  3. **Direct Instagram Account ID / Handle**: Resolves node info directly via `/{instagram_account_id}`.
- **Normalized Media Metrics Extracted**:
  - `views`: Extracted from Reel `plays`, video `video_views`, or impressions.
  - `reach`: Unique accounts reached via `/{media_id}/insights?metric=reach`.
  - `impressions`: Total content displays via `/{media_id}/insights?metric=impressions`.
  - `likes`: Verified `like_count`.
  - `comments`: Verified `comments_count`.
  - `shares`: Bookmarked count via `saved` insight metric.
  - `engagementRate`: Verified as `((likes + comments) / (reach || impressions || views)) * 100`.

### 2.2 YouTube Integration
- **Client**: `YouTubeClient` (`/backend/src/integrations/youtube/youtubeClient.ts`).
- **Authentication & Discovery**:
  - Accepts YouTube Data API Key or OAuth Bearer Token.
  - Supports automatic channel resolution via username, handle (`@handle`), channel title, or 24-character channel ID.
  - Resolves uploads playlist (`uploadsPlaylistId`) from `channels?part=snippet,contentDetails,statistics`.
- **Metrics Extracted**:
  - Verified `viewCount`, `likeCount`, `commentCount`, publishing timestamps, and video thumbnails.
  - Subscriber counts and lifetime view aggregates.

### 2.3 Facebook Integration
- **Client**: `FacebookClient` (`/backend/src/integrations/meta/facebook/facebookClient.ts`).
- **Authentication**:
  - Meta User Access Token with `pages_show_list` and `pages_read_engagement`.
  - Resolves managed Pages and extracts published page feed items, reach, post impressions, and reaction tallies.

### 2.4 LinkedIn Integration
- **Client**: `LinkedInClient` & `LinkedInAuth` (`/backend/src/integrations/linkedin/*`).
- **Authentication**:
  - LinkedIn OAuth 2.0 Bearer Token or Organization URN (`urn:li:organization:...`).
  - Fetches organization UGC shares and organizational statistics.

---

## 3. Top Performer Analysis (Section 4 Specification)

The Top Performer Analysis identifies the best-performing posts, Reels, and videos relative to the profile's historical baseline.

### 3.1 Selection & Calculation Logic
1. Computes the profile's **median and average engagement rate and view count** across all synchronized media.
2. Sorts content by engagement rate and interaction velocity.
3. Calculates `baselineComparison`:
   $$\text{Baseline Variance \%} = \frac{\text{Engagement Rate} - \text{Profile Average}}{\text{Profile Average}} \times 100$$
   *(Example: `+184% vs profile average (2.8%)`)*.

### 3.2 Output Structure per Performer
- **Content Metadata**: Title, caption, content format (`Reel`, `Video`, `Carousel`, `Post`), platform, published timestamp.
- **Direct Verified Metrics**: Plays/Views, Accounts Reached, Likes, Comments, Bookmarks/Shares, Engagement Rate.
- **Possible Contributing Factors (Inferred Hypotheses)**:
  - Visual opening pacing (e.g. "Fast-paced visual opening within first 3 seconds captured organic browse feed retention").
  - Interaction density (e.g. "High comment density (520 comments) triggered algorithmic discussion weighting").
  - Broad distribution velocity.
- **Recommended Pattern to Replicate**:
  - Specific actionable directive (e.g. "Replicate the opening narrative conflict and immediate visual payoff of this asset in your next release").
- **Uncertainty & Evidence Notice**:
  - Transparent statement: *"Direct metrics (views, reach, likes, comments) are verified by the API. Contributing factors are data-inferred patterns based on relative baseline variance."*

---

## 4. Bottom Performer Analysis (Section 5 Specification)

The Bottom Performer Analysis identifies content that performed significantly below the account's historical baseline to diagnose root causes without unjustified blame.

### 4.1 Selection & Calculation Logic
1. Filters media whose engagement rate is below the profile's historical average.
2. Identifies specific metric weaknesses (e.g., lower view retention, lack of comments, low reach).
3. Computes the negative baseline variance (e.g. `-58% below profile average`).

### 4.2 Output Structure per Underperforming Asset
- **Content Metadata**: Title, caption, format, platform, and published timestamp.
- **Direct Verified Metrics**: Verified view volume, likes, comments, and engagement rate.
- **Diagnostic Factors (Possible Explanations)**:
  - "Opening 3–5 seconds or visual cover lacked immediate curiosity or emotional tension."
  - "Caption presentation did not invite active dialogue or question responses."
  - "Initial release velocity fell below platform distribution threshold."
- **Improvement Recommendations**:
  - "Update the opening hook line and lead with the most surprising outcome before concluding the topic lacks demand."
- **Suggested Alternative Approach**:
  - "Repackage this topic into a fast-paced 30-second Reel or high-contrast 5-slide carousel with bold headline overlays."
- **Uncertainty Disclosure**:
  - *"Weaker performance may be influenced by external platform distribution fluctuations or timing. Do not discard the subject without testing an alternative hook."*

---

## 5. AI-Powered Content Improvement Recommendations (Section 6 Specification)

The recommendation engine converts raw performance data into practical next moves across 3 strategic modes: `CREATE`, `TEST`, and `REPURPOSE`.

### 5.1 The 5-Point Diagnostic Framework
Every recommendation generated by Media Navigator adheres to this 5-point structure:

| Element | Description | Example |
| :--- | :--- | :--- |
| **1. Identified Problem** | Specific bottleneck in audience retention or format usage | Audience interest peaked on this topic but no direct follow-up content was scheduled. |
| **2. Supporting Pattern** | Historical metric data demonstrating the pattern | Historical engagement rate of 7.2% exceeds channel baseline (2.8%) by 2.6x. |
| **3. Recommended Improvement** | Practical strategic action | Draft a part-2 deep dive exploring the most requested question in recent comments. |
| **4. Suggested Implementation** | Exact tactical step, hook, or visual direction | Script opening hook in first 2 seconds: *"In my last post, you asked about [X]—here is exactly what happened."* |
| **5. Expected Measurement** | Objective criteria to monitor success | Track whether part-2 achieves within 85% of part-1 engagement rate and viewer retention. |

---

## 6. AI Trends & Content Opportunity Engine (Section 7 Specification)

The Trends Engine identifies niche-specific opportunities and classifies every suggestion according to its evidentiary grounding.

### 6.1 Verification Classification
1. **Verified External Signal**: Grounded in platform-wide industry documentation and broad verified trends.
2. **Inferred from Profile Data**: Calculated mathematically from week-over-week velocity shifts across your connected assets.
3. **AI-Generated Content Concept**: Niche-specific conceptual hypothesis designed to fill strategic gaps.

### 6.2 Structured Opportunity Format
Each opportunity item contains:
- **Trend Name & Category**: Topic, Format, or Audience Behavior.
- **Velocity Indicator**: e.g., `+38%`, `Rising`, `Stable`, or `Losing momentum`.
- **Reason for Relevance**: Why this trend matches the user's specific audience and channel history.
- **Recommended Platform & Format**: e.g., Instagram Reel, YouTube Short, LinkedIn Carousel.
- **Content Concept**: 2-3 sentence scenario detailing the video or post structure.
- **Suggested Opening Hook**: Word-for-word opening sentence to maximize 3-second retention.
- **Target Audience Relevance**: Demographic appeal explanation.
- **Caption Direction**: Prompting questions and bookmark calls-to-action.
- **Recommended Next Action**: 1-click transition to Content Planner.

---

## 7. Best Posting Time Recommendations & Heatmap Matrix (Section 8 Specification)

### 7.1 Calculation Algorithm
- Analyzes all synchronized media items with valid timestamps.
- Maps timestamps into a 28-cell matrix across 7 Days (`Mon`–`Sun`) and 4 Time-of-Day buckets:
  - **Morning**: 6:00 AM – 11:59 AM
  - **Afternoon**: 12:00 PM – 4:59 PM
  - **Evening**: 5:00 PM – 9:59 PM
  - **Night**: 10:00 PM – 5:59 AM
- Computes the average engagement rate of assets published in each cell and normalizes scores from 0 to 100 relative to the peak slot.

### 7.2 Mandatory Insufficient Data Fallback
If fewer than 3 historical posts are available, the system suppresses speculative advice and displays the exact specification notice:
> **"Not enough historical data is available to generate a reliable posting-time recommendation. Continue publishing and syncing data to improve this analysis."**

### 7.3 Data-Informed Notice
When data is sufficient, the matrix displays the mandatory disclaimer:
> **"Posting-time recommendations are data-informed suggestions derived from your historical performance, not guaranteed algorithmic results."**

---

## 8. Content Pattern Analysis (Section 9 Specification)

The Content Pattern Engine groups all synchronized assets by format and identifies:
- **Format Hierarchy**: Average engagement rate and average views for Reels vs Videos vs Carousels vs Posts.
- **Volume & Consistency**: Total published asset count per format.
- **Algorithmic Weighting**: Impact of comments, saves, and shares on reach distribution.

---

## 9. Standard AI Insight Structure (Section 13 Specification)

Every insight presented in the Executive Signal Stream adheres to a 6-part standardized model:
1. **Title**: Concise identification of the observed phenomenon.
2. **Observation**: What the platform's data directly indicates.
3. **Supporting Data**: Exact verified numbers, comparisons, and multiples over channel baseline.
4. **Possible Explanation**: Potential causal factors, explicitly marked as hypotheses.
5. **Recommendation**: Practical action the user can immediately implement.
6. **Expected Measurement**: Specific metric or milestone to monitor.

---

## 10. Interactive "Ask Media Navigator" Executive Assistant

- Powered by **Gemini 3.8 Flash** via `@google/genai`.
- **Integrity Guardrail**: Queries are evaluated strictly against real channel records injected dynamically into system prompt instructions.
- If no accounts are connected or no assets exist, queries return a protective boundary notice stating that insights cannot be formulated without verified data.
- Returns structured responses: `answer`, `observedSignal`, `suggestedAction`, and verification source.

---

## 11. Content Planner & Scheduling System

- Allows creators to transition recommendations directly into a weekly visual calendar.
- Tracks content status: `draft`, `scheduled`, `published`.
- Preserves the recommendation rationale (`recommendationReason`) alongside scheduled time slots.

---

## 12. Complete REST API Reference Guide

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces` | Retrieve active workspace profile and preferences |
| `GET` | `/api/v1/connections` | List all platform connections and authentication statuses |
| `POST` | `/api/v1/connections/:platform/connect` | Connect a platform using direct access tokens or API keys |
| `POST` | `/api/v1/connections/:platform/sync` | Re-synchronize metrics from official platform APIs |
| `POST` | `/api/v1/connections/:platform/disconnect`| Disconnect platform and purge stored credentials |
| `POST` | `/api/v1/youtube/fetch-channel` | Auto-discover YouTube channel by handle or query |
| `GET` | `/api/v1/analytics/overview` | Fetch unified KPIs, Key Signals, and Observations |
| `GET` | `/api/v1/media` | Fetch normalized media feed (supports `?platform=` filter) |
| `GET` | `/api/v1/media/:id` | Fetch detailed performance metrics for a specific asset |
| `GET` | `/api/v1/timing` | Retrieve 28-cell timing matrix and best window recommendations |
| `GET` | `/api/v1/intelligence/signals` | Fetch standard 6-part AI insights stream |
| `GET` | `/api/v1/intelligence/performers` | Fetch Top Performers & Bottom Performers diagnostics |
| `GET` | `/api/v1/intelligence/patterns` | Fetch Content Format Pattern aggregations |
| `POST` | `/api/v1/intelligence/ask` | Submit executive natural language question to Gemini AI |
| `POST` | `/api/v1/intelligence/analyze-item` | Deep-dive single asset diagnostic analysis |
| `GET` | `/api/v1/recommendations` | Fetch 5-part content improvement recommendations |
| `POST` | `/api/v1/recommendations/:id/plan` | Convert recommendation into scheduled calendar content |
| `GET` | `/api/v1/trends` | Fetch niche trends and categorized content opportunities |
| `GET` | `/api/v1/planner` | Fetch scheduled calendar content entries |
| `POST` | `/api/v1/planner` | Add new content entry to the planner |
| `DELETE`| `/api/v1/planner/:id` | Remove content entry from the planner |
| `GET` | `/api/v1/alerts` | Fetch real-time system alerts (e.g. token expiration) |
| `POST` | `/api/v1/alerts/:id/read` | Mark alert as read |

---

*Documentation verified for Media Navigator v2.0 Production Release.*
