/**
 * Shapes returned by the Media Navigator API (`docs/api.md`). The browser only ever sees these through the
 * Next.js proxy in `app/api/v1/[...path]/route.ts`; tokens never appear in any of them.
 */

export type Platform = 'instagram' | 'facebook' | 'youtube' | 'linkedin';
export const PLATFORMS: readonly Platform[] = ['instagram', 'youtube', 'facebook', 'linkedin'] as const;

export type ContentType = 'reel' | 'short' | 'video' | 'post' | 'article' | 'carousel';

// ── Envelope ──────────────────────────────────────────────────────────────
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

// ── Auth & profile ────────────────────────────────────────────────────────
export type Role = 'user' | 'admin';
export interface User {
  id: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string | null;
}
export interface Profile {
  fullName: string;
  organization: string | null;
  accountType: string | null;
  timezone: string | null;
  avatarFileId: string | null;
  onboardingCompleted: boolean;
}
export interface MeResponse {
  user: User;
  profile: Profile | null;
}
export interface SessionInfo {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
}

export const ACCOUNT_TYPES = ['Creator', 'Personal brand', 'Business', 'E-commerce', 'Marketing agency', 'Other'] as const;

// ── Connections ───────────────────────────────────────────────────────────
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

export interface Connection {
  platform: Platform;
  name: string;
  accountHandle: string;
  connected: boolean;
  lastSyncedAt: string;
  status: ConnectionStatus;
  statusMessage?: string;
  primaryStrength: string;
  dataPointsCount: number;
  missingPermissions: string[];
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
export interface ConnectResult {
  connection: Connection;
  syncRun: SyncRun;
}
export interface SyncResult {
  syncRun: SyncRun;
  alreadyQueued: boolean;
}

/** Credentials for the "advanced" token form. Only the fields the platform needs are sent. */
export interface ConnectInput {
  accessToken?: string;
  apiKey?: string;
  accountId?: string;
  pageId?: string;
  channelId?: string;
  channelQuery?: string;
  organizationId?: string;
  username?: string;
}

// ── Media ─────────────────────────────────────────────────────────────────
export type PerformanceTier = 'Strong' | 'Above average' | 'Average' | 'Emerging' | 'Declining';

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
  /** Metrics the platform did not provide for this post (show "Not available", never 0). */
  unavailableMetrics: string[];
  /** Metrics missing for this one post (for example hidden like counts). */
  missingMetrics?: string[];
  contentTypeBasis: 'provider' | 'inferred';
}

// ── Intelligence ──────────────────────────────────────────────────────────
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
export interface PeriodStats {
  from: string;
  to: string;
  count: number;
  medianEngagementRate: number;
  meanEngagementRate: number;
  medianViews: number;
  totalViews: number;
}
export interface SlimPost {
  id: string;
  platform: Platform;
  contentType: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  classification: PostClass;
  vsMedianEngagementPct: number | null;
}
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
export interface Summary {
  calcVersion: number;
  scope: string;
  platformsIncluded: Platform[];
  platformsConnectedWithoutData: Platform[];
  dataPeriod: { days: number; current: PeriodStats; previous: PeriodStats };
  periodComparison: { engagementRateMedianChangePct: number | null; viewsMedianChangePct: number | null; comparable: boolean };
  baselines: Partial<Record<Platform, Baseline>>;
  classificationMethod: string;
  contentTypePerformance: ContentTypePerformance[];
  topicPerformance: TopicPerformance[];
  trendingTopics: TopicPerformance[];
  topContent: SlimPost[];
  needsImprovement: SlimPost[];
  insufficientHistory: Platform[];
  timezone: string;
  dataVersion: string;
  lastSyncedAt: string | null;
  contentIdeas: { generatedBy: string; items: Array<{ source: string; idea: string; basedOn: string }> };
}

export interface HistoryPoint {
  date: string;
  platform?: Platform;
  [key: string]: unknown;
}

export interface TimingSlot {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  score: number;
  sampleCount: number;
}
export interface Timing {
  hasData?: boolean;
  message?: string;
  title: string;
  subtitle: string;
  strongestWindow: { label: string; timeSlot: string; confidence: string; supportingText: string } | null;
  matrix: TimingSlot[];
  timezone?: string;
}

export interface KeySignal {
  id: string;
  category: string;
  icon: string;
  title: string;
  description: string;
  actionText: string;
  actionTarget: string;
}
export interface Observation {
  id: string;
  icon: string;
  title: string;
  explanation: string;
  details: { trend: string; impact: string; observedSignal: string };
}
export interface Overview {
  hasData?: boolean;
  message?: string;
  hero: { hasData?: boolean; heading: string; summary: string; badge: string; confidence: string };
  signals: KeySignal[];
  observations: Observation[];
  connections: Connection[];
}

export interface AiInsight {
  id: string;
  category: string;
  icon: string;
  title: string;
  description: string;
  whyItMatters: string;
  confidence: 'High' | 'Medium' | string;
  detectedAt: string;
  recommendedAction?: string;
  observation?: string;
  supportingData?: string;
  possibleReason?: string;
  measurement?: string;
}
export interface SignalsResponse {
  title: string;
  insights: AiInsight[];
}

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

export interface PatternRow {
  format: string;
  count: number;
  avgEngagement: number;
  avgViews: number;
}

export interface Recommendation {
  id: string;
  type: 'CREATE' | 'TEST' | 'REPURPOSE';
  title: string;
  reason: string;
  supportingSignal: string;
  actionText: string;
  status: 'pending' | 'planned' | 'dismissed';
  suggestedSlot?: { day: string; time: string; format: string };
  identifiedProblem?: string;
  supportingPattern?: string;
  recommendedImprovement?: string;
  suggestedImplementation?: string;
  expectedMeasurement?: string;
}
export interface RecommendationsResponse {
  title: string;
  items: Recommendation[];
}

export interface TrendItem {
  id: string;
  name: string;
  category: string;
  status: 'Rising' | 'Stable' | 'Losing momentum' | string;
  explanation: string;
  changeRate: string;
  reasonForRelevance?: string;
  recommendedPlatform?: Platform;
  suggestedFormat?: string;
  contentConcept?: string;
  suggestedHook?: string;
  targetAudienceRelevance?: string;
  captionDirection?: string;
  recommendedNextAction?: string;
  trendType?: string;
}
export interface TrendsResponse {
  title: string;
  trends: TrendItem[];
}

export type AiStatus = 'ran' | 'cached' | 'unavailable' | 'failed' | 'not_needed';
export interface AiMeta {
  status: AiStatus;
  model: string | null;
  promptVersion: string;
  generatedAt: string | null;
  reason?: string;
}
export interface MeasuredPost {
  platform: Platform;
  contentType: string;
  publishedAt: string;
  title: string;
  caption: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRatePct: number;
  durationSeconds: number | null;
  unavailableMetrics: string[];
}
export interface CalculatedPost {
  classification: PostClass;
  comparedAgainst: string;
  accountMedianEngagementPct: number;
  accountP25EngagementPct: number;
  accountP75EngagementPct: number;
  engagementVsMedianPct: number;
  accountMedianViews: number;
  viewsVsMedianPct: number;
}
export interface AnalyzeItemResult {
  observedFact: string;
  possibleReason: string;
  actionableRecommendations: string[];
  confidence: string;
  answeredBy: string;
  measured: MeasuredPost;
  calculated: CalculatedPost;
  ai: AiMeta;
}
export interface DiagnosePostResult {
  mediaId: string;
  status: 'working' | 'underperforming' | 'average';
  statusBadge: string;
  headline: string;
  executiveSummary: string;
  baselineComparison: string;
  topSuccessDrivers: string[];
  bottomImprovementPoints: string[];
  metricBreakdown: { viewsAnalysis: string; engagementHealth: string; commentVelocity: string; shareabilityAnalysis: string };
  suggestedHookAlternative: string;
  recommendedFormatAndTiming: string;
  actionableChecklist: string[];
  source: string;
  measured: MeasuredPost;
  calculated: CalculatedPost;
  ai: AiMeta;
  limitations: string[];
}
export interface AskResult {
  answer: string;
  observedSignal: string;
  suggestedAction: string;
  source: string;
  ai: AiMeta;
  measured: unknown;
}
export interface CompareResult {
  a: ComparePost;
  b: ComparePost;
  comparison: Record<'views' | 'likes' | 'comments' | 'engagementRatePct', { a: number; b: number; differencePct: number }>;
  note: string;
  generatedBy: string;
}
export interface ComparePost {
  id: string;
  platform: Platform;
  contentType: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRatePct: number;
  durationSeconds: number | null;
}
/** Video analysis is qualitative only and lists what cannot be seen. Fields beyond `ai` are optional text. */
export interface VideoAnalysisResult {
  ai?: AiMeta;
  unavailable?: string[];
  [key: string]: unknown;
}

export interface IntelligenceStatus {
  ai: { available: boolean; model: string | null; promptVersion: string };
  storage: { available: boolean };
  email: { available: boolean };
  providers: Array<{ platform: Platform; oauthAvailable: boolean; capabilities: ProviderCapabilities }>;
}

// ── Planner ───────────────────────────────────────────────────────────────
export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export const WEEKDAYS: readonly Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export interface PlannedItem {
  id: string;
  day: Weekday;
  time: string;
  platform: Platform;
  contentType: string;
  title: string;
  isRecommended?: boolean;
  recommendationReason?: string;
  status: 'scheduled' | 'draft' | 'published';
}
export interface PlannerInsights {
  timezone: string;
  hasEnoughData: boolean;
  bestWindows: Array<{ day: string; timeOfDay: string; timeSlot: string; meanEngagementRate: number; sampleCount: number; timezone: string }>;
  recommendedFormats: ContentTypePerformance[];
  topTopics: TopicPerformance[];
  contentGaps: Array<Record<string, unknown>>;
  basedOn: { posts: number; platforms: Platform[]; method: string };
}

// ── Notifications ─────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  type?: string;
  icon?: string;
  title: string;
  description?: string;
  body?: string;
  severity: 'high' | 'medium' | 'info' | string;
  timestamp?: string;
  createdAt?: string;
  investigationNotes?: string;
  read: boolean;
}

// ── Files ─────────────────────────────────────────────────────────────────
export interface FileItem {
  id: string;
  filename?: string;
  originalName?: string;
  mimeType: string;
  size: number;
  purpose: string;
  createdAt: string;
  url?: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────
export interface AdminSystem {
  app: { environment: string; uptimeSeconds: number; node: string };
  database: { status: string };
  counts: { users: number; activeSessions: number; contentItems: number; aiCacheEntries: number };
  connectedAccountsByStatus: Record<string, number>;
  syncRunsByStatus: Record<string, number>;
  storage: { configured: boolean; files: number; bytes: number };
  features: {
    ai: { configured: boolean; model: string | null };
    email: { configured: boolean };
    syncWorker: boolean;
    syncScheduler: boolean;
    oauth: Record<string, boolean>;
  };
}
export interface AdminConnection {
  id: string;
  userId: string;
  platform: Platform;
  handle: string;
  status: string;
  active: boolean;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  lastSyncError: string | null;
  dataPointsCount: number;
}
export interface AdminAuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  requestId: string | null;
  createdAt: string;
}
