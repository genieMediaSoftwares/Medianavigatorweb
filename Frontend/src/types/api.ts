// Data contracts for the Media Navigator API (`/api/v1`, see docs/api.md). These describe the `data`
// field of the response envelope. Type definitions only: every value the app renders comes from the API.
// Dates are ISO 8601 strings.

export type Platform = 'instagram' | 'facebook' | 'youtube' | 'linkedin';

// ---- Envelope ----------------------------------------------------------

export interface PageMeta {
  limit: number;
  nextCursor: string | null;
  total?: number;
}

export interface ApiErrorDetail {
  in?: string;
  path?: string;
  message: string;
}

// ---- Auth, users & profiles ---------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Seconds until the access token expires. */
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Profile {
  fullName: string;
  organization: string | null;
  accountType: string | null;
  /** IANA zone; null until the user sets one. */
  timezone: string | null;
  avatarFileId: string | null;
  onboardingCompleted: boolean;
  /** Which notification categories are delivered. Missing on older servers: treat as all on. */
  notificationPrefs?: NotificationPrefs;
}

export interface NotificationPrefs {
  syncUpdates: boolean;
  connectionProblems: boolean;
  performanceAlerts: boolean;
}

/** GET /auth/me, GET /users/me */
export interface Me {
  user: User;
  profile: Profile | null;
}

export interface LoginResult {
  user: User;
  tokens: TokenPair;
}

export interface RegisterResult extends LoginResult {
  profile: Profile;
}

export interface ProfileUpdate {
  fullName?: string;
  organization?: string;
  accountType?: string;
  timezone?: string;
  onboardingCompleted?: boolean;
  notificationPrefs?: Partial<NotificationPrefs>;
}

export interface SessionInfo {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
}

// ---- Connections ---------------------------------------------------------

export type ConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'sync_complete'
  | 'permission_required'
  | 'connection_expired'
  | 'sync_failed';

export interface ProviderCapabilities {
  platform: Platform;
  unavailableMetrics: string[];
  unsupportedContent: string[];
  supportsOAuth: boolean;
  supportsPkce: boolean;
  incrementalInsights: boolean;
  notes: string[];
}

/** One entry per platform from GET /connections (connected or not). Never contains credentials. */
export interface Connection {
  platform: Platform;
  name: string;
  accountHandle: string;
  avatarUrl?: string;
  connected: boolean;
  /** ISO timestamp, or '' when never synced. */
  lastSyncedAt: string;
  status: ConnectionStatus;
  statusMessage?: string;
  /** How the live account was connected; 'api_key' means public data only (e.g. no YouTube watch time). */
  authMethod?: 'oauth' | 'token' | 'api_key' | null;
  primaryStrength: string;
  dataPointsCount: number;
  missingPermissions?: string[];
  accountInfo?: { id: string; name?: string; username?: string; followersCount?: number; mediaCount?: number };
  sync?: { state: string; lastSyncedAt: string | null; nextSyncAt: string | null; lastError: string | null };
  capabilities?: ProviderCapabilities;
  oauthAvailable?: boolean;
}

export type SyncRunStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';

export interface SyncRun {
  id: string;
  platform: Platform;
  type: string;
  status: SyncRunStatus;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  items: { fetched: number; created: number; updated: number; skipped: number; failed: number };
  attempts: number;
  errorKind: string | null;
  errorSummary: string | null;
}

/** Credentials for POST /connections/:platform/connect. Only the fields the platform needs are sent. */
export interface ConnectInput {
  accessToken?: string;
  /** YouTube Data API v3 key (public data). Sent with `channelQuery`. */
  apiKey?: string;
  /** Exact YouTube channel ID (UC…) or @handle, required with `apiKey`. */
  channelQuery?: string;
  accountId?: string;
  pageId?: string;
  organizationId?: string;
  username?: string;
}

export interface ConnectResult {
  connection: Connection;
  syncRun: SyncRun;
}

export interface SyncResult {
  syncRun: SyncRun;
  alreadyQueued: boolean;
}

// ---- Analytics used by the Dashboard and Planner -------------------------

export interface ContentTypePerformance {
  platform: Platform;
  contentType: string;
  count: number;
  medianEngagementRate: number;
  meanEngagementRate: number;
  medianViews: number;
}

export interface TopicPerformance {
  topic: string;
  count: number;
  recentCount: number;
  medianEngagementRate: number;
  trend: number | null;
}

/**
 * GET /intelligence/history: one per account per day, written after each sync from everything that
 * sync fetched (the account's full content list). Newest first.
 */
export interface HistorySnapshot {
  date: string;
  platform: Platform;
  contentCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  meanEngagementRate: number;
  medianEngagementRate: number;
  /** Posts that had views / an engagement rate from the platform; null on older snapshots. */
  viewsMeasured?: number | null;
  engagementMeasured?: number | null;
  followersCount: number | null;
}

// ---- Content analysis (Instagram Analysis screen) ---------------------------

export type ContentType = 'reel' | 'short' | 'video' | 'post' | 'article' | 'carousel';

/** GET /media, GET /media/:id */
export interface MediaItem {
  id: string;
  platform: Platform;
  platformContentId: string;
  contentType: ContentType;
  title: string;
  caption: string;
  /** Empty string when the platform gave no image. */
  thumbnailUrl: string;
  mediaUrl?: string;
  publishedAt: string;
  durationSeconds?: number;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  watchTimeMinutes?: number;
  /** Metrics the platform does not provide (render "Not available", never 0). */
  unavailableMetrics: string[];
  /** Metrics missing for this one post (for example hidden like counts). */
  missingMetrics?: string[];
  contentTypeBasis: 'provider' | 'inferred';
}

export type PostClass = 'TOP' | 'TYPICAL' | 'LOW' | 'INSUFFICIENT_DATA' | string;

export interface Baseline {
  sampleSize: number;
  medianEngagementRate: number;
  p25EngagementRate: number;
  p75EngagementRate: number;
  medianViews: number;
  p25Views: number;
  p75Views: number;
}

/** GET /intelligence/summary (only the fields this app reads). */
export interface Summary {
  platformsIncluded: Platform[];
  baselines: Partial<Record<Platform, Baseline>>;
  insufficientHistory: Platform[];
}

/** GET /intelligence/performers: posts ranked against the account's own average. */
export interface Performer {
  id: string;
  mediaId: string;
  title: string;
  caption?: string;
  platform: Platform;
  contentType: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  baselineComparison: string;
  isTopPerformer: boolean;
  possibleFactors: string[];
  patternToReplicateOrImprove: string;
  alternativeApproach?: string;
  uncertaintyNote?: string;
  publishedAt: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
}

export interface PerformersResponse {
  top: Performer[];
  bottom: Performer[];
}

export type PerformerSort = 'views' | 'engagement' | 'likes' | 'comments';

export interface AiMeta {
  status: 'ran' | 'cached' | 'unavailable' | 'failed' | 'not_needed';
  model: string | null;
  promptVersion: string;
  generatedAt: string | null;
  reason?: string;
}

export interface CalculatedPost {
  classification: PostClass;
  comparedAgainst: string;
  accountMedianEngagementPct: number;
  accountP25EngagementPct: number;
  accountP75EngagementPct: number;
  /** null when there is no comparable median. */
  engagementVsMedianPct: number | null;
  accountMedianViews: number;
  viewsVsMedianPct: number | null;
}

/** POST /intelligence/diagnose-post */
export interface DiagnosePostResult {
  mediaId: string;
  status: 'working' | 'underperforming' | 'average';
  headline: string;
  executiveSummary: string;
  baselineComparison: string;
  topSuccessDrivers: string[];
  bottomImprovementPoints: string[];
  metricBreakdown: { viewsAnalysis: string; engagementHealth: string; commentVelocity: string; shareabilityAnalysis: string };
  suggestedHookAlternative: string;
  recommendedFormatAndTiming: string;
  actionableChecklist: string[];
  measured: { engagementRatePct: number };
  calculated: CalculatedPost;
  ai: AiMeta;
  limitations: string[];
}

/** POST /intelligence/analyze-item: works for any post (photos, carousels and videos). */
export interface AnalyzeItemResult {
  observedFact: string;
  /** AI interpretation, or a sentence saying AI is not available. */
  possibleReason: string;
  actionableRecommendations: string[];
  confidence: string;
  answeredBy: string;
  calculated: CalculatedPost;
  ai: AiMeta;
}

/** POST /intelligence/analyze-video: qualitative only; lists what cannot be seen. */
export interface VideoAnalysisResult {
  ai?: AiMeta;
  unavailable?: string[];
  [key: string]: unknown;
}

// ---- Six-point content analysis (POST /intelligence/content-analysis) -------

export type ContentAnalysisType = 'deep' | 'why_top' | 'why_bottom';

export interface AnalysisMetric {
  key: string;
  label: string;
  /** null when the platform did not provide it (never shown as 0). */
  value: number | null;
  unit: 'count' | 'percent' | 'seconds';
  available: boolean;
  source: 'instagram_live' | 'synced' | 'derived';
  note?: string;
}

export interface AnalysisPoint {
  number: number;
  title: string;
  observations: string[];
  evidence: { source: 'video_frame' | 'audio' | 'on_screen_text' | 'image' | 'caption' | 'metric' | 'comparison'; timestamp?: string | null; description: string }[];
  metricKeys: string[];
  interpretation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ContentAnalysis {
  mediaId: string;
  analysisType: ContentAnalysisType;
  analysisVersion: string;
  result: {
    summary: string;
    points: AnalysisPoint[];
    limitations: string[];
    recommendations: string[];
    confidence: { level: 'high' | 'medium' | 'low'; reason: string };
    /** What the AI actually analysed. */
    evidence: {
      visual: 'full_video' | 'youtube_video' | 'image' | 'carousel' | 'thumbnail' | 'none';
      videos: number;
      images: number;
      /** Timestamped moments the analysis cites from the video. */
      momentsCited: number;
      /** The cited moments span the beginning, middle and end of the video. */
      coversTimeline: boolean;
      durationSeconds: number | null;
      audio: 'speech' | 'music' | 'speech_and_music' | 'sound_effects' | 'silent' | 'not_applicable';
      metricsAvailable: number;
      caption: boolean;
    };
  };
  metrics: { collectedAt: string; items: AnalysisMetric[] };
  comparison: {
    basis: string;
    sampleSize: number;
    sameType: boolean;
    ageDays: number;
    early: boolean;
    caveats: string[];
    rows: { key: string; label: string; post: number | null; median: number | null; differencePct: number | null }[];
  };
  /** What the AI actually received: full_video, youtube_video, image, carousel or thumbnail. */
  mediaBasis: string;
  model: string | null;
  analyzedAt: string;
  fromCache: boolean;
  stale: boolean;
  refreshError?: string;
}

// ---- Planner ---------------------------------------------------------------

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface PlannedItem {
  id: string;
  day: Weekday;
  time: string;
  platform: Platform;
  contentType: string;
  title: string;
  isRecommended?: boolean;
  recommendationReason?: string;
  /** Plans are reminders: Media Navigator never publishes to a platform. */
  status: 'planned' | 'draft' | 'published';
}

export interface NewPlannedItem {
  day: Weekday;
  time: string;
  platform: Platform;
  contentType?: string;
  title: string;
}

/** GET /planner/insights */
export interface PlannerInsights {
  timezone: string;
  hasEnoughData: boolean;
  bestWindows: { day: string; timeOfDay: string; timeSlot: string; meanEngagementRate: number; sampleCount: number; timezone: string }[];
  recommendedFormats: ContentTypePerformance[];
  topTopics: TopicPerformance[];
  basedOn: { posts: number; platforms: Platform[]; method: string };
}

/** One platform's connected account, or every connected account combined. */
export type AccountScope = Platform | 'all';
export type PlannerScope = AccountScope;
export type PlannerMetricKey = 'engagementRate' | 'reach' | 'views';
export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'insufficient';
export type TimeWindowKey = 'morning' | 'afternoon' | 'evening' | 'night';
export type PlannerRange = 30 | 60 | 90;

export interface PlannerSlot {
  day: Weekday;
  window: TimeWindowKey;
  posts: number;
  /** 0–100, where 50 is the account's typical post. null when no posts. */
  score: number | null;
  mean: number | null;
  median: number | null;
  liftPct: number | null;
  shareAboveTypical: number | null;
  pValue: number | null;
  evidence: EvidenceLevel;
  /** Relative heat level among populated slots. */
  level: 0 | 1 | 2 | 3 | 4 | null;
}

export interface BestTimeRecommendation {
  day: Weekday;
  window: TimeWindowKey;
  windowLabel: string;
  timeRange: string;
  narrowRange: string | null;
  narrowStartTime: string | null;
  posts: number;
  score: number;
  mean: number | null;
  median: number | null;
  liftPct: number | null;
  shareAboveTypical: number;
  pValue: number;
  evidence: Exclude<EvidenceLevel, 'insufficient'>;
  preliminary: boolean;
}

/** GET /planner/best-times */
export interface BestTimes {
  platform: PlannerScope;
  days: PlannerRange;
  range: { from: string; to: string };
  timezone: string;
  timezoneSource: 'profile' | 'default';
  accounts: { platform: Platform; name: string; connected: boolean; status: ConnectionStatus; handle: string | null; lastSyncedAt: string | null; syncState: string }[];
  scope: { platform: Platform; handle: string }[];
  state: 'ready' | 'not_connected';
  metric: PlannerMetricKey;
  metrics: { key: PlannerMetricKey; label: string; unit: '%' | 'count'; description: string; measuredPosts?: number }[];
  contentTypes: { type: string; count: number }[];
  contentType: string;
  /** Posts published per week in the selected range (all formats in the current filter). */
  postsPerWeek?: number;
  windows: { key: TimeWindowKey; label: string; range: string }[];
  notes: string[];
  method: { summary: string; thresholds: { minTotalPosts: number; minSlotPosts: number }; maturityHours: Record<Platform, number> };
  analysis: null | {
    eligiblePosts: number;
    aggregate: boolean;
    excluded: { unmeasured: number; tooRecent: number };
    baseline: { mean: number | null; median: number | null };
    slots: PlannerSlot[];
    /** Local hour 0–23, all days combined; score smoothed over neighbouring hours (50 = typical). */
    hours: { hour: number; posts: number; score: number | null }[];
    bestHours: null | { range: string; startTime: string; startHour: number; posts: number; score: number };
    formats: { type: string; posts: number; median: number | null; liftPct: number | null }[];
    pattern: { mostUsed: null | { day: Weekday; window: TimeWindowKey; posts: number; score: number }; slotsUsed: number; untestedSlots: number };
    adjustment: { period: boolean; format: boolean; peerWindowDays: number };
    recommendation: BestTimeRecommendation | null;
    evidence: EvidenceLevel;
    noRecommendationReason: 'not_enough_posts' | 'no_repeated_slot' | 'no_slot_above_typical' | null;
  };
}

// ---- Notifications ------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type?: string;
  title: string;
  description?: string;
  body?: string;
  severity: string;
  timestamp?: string;
  createdAt?: string;
  read: boolean;
}
