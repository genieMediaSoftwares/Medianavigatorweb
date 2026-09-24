export type PlatformType = 'instagram' | 'facebook' | 'youtube' | 'linkedin';

export type PerformanceTier = 'Strong' | 'Above average' | 'Average' | 'Emerging' | 'Declining';

export interface NormalizedMedia {
  id: string;
  workspaceId: string;
  platform: PlatformType;
  platformContentId: string;
  contentType: 'reel' | 'short' | 'video' | 'post' | 'article' | 'carousel';
  title: string;
  caption: string;
  thumbnailUrl: string;
  mediaUrl?: string;
  publishedAt: string;
  durationSeconds?: number;
  // Primary meaningful signal
  primarySignal: {
    label: string;
    value: string;
    status: PerformanceTier;
  };
  // Key metrics (sparse, only meaningful ones)
  views: number;
  reach: number;
  engagementRate: number; // percentage
  shares: number;
  watchTimeMinutes?: number;
  likes: number;
  comments: number;
  // Explanations
  explanation: {
    observedFact: string;
    possibleReason: string;
    whatToRepeat: string[];
    whatToImprove?: string[];
  };
  isDemo?: boolean;
}

export type ConnectionStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'sync_complete'
  | 'permission_required'
  | 'connection_expired'
  | 'sync_failed';

export interface PlatformConnection {
  platform: PlatformType;
  name: string;
  accountHandle: string;
  avatarUrl?: string;
  connected: boolean;
  lastSyncedAt: string;
  status: ConnectionStatus;
  statusMessage?: string;
  primaryStrength: string;
  dataPointsCount: number;
  permissions?: string[];
  missingPermissions?: string[];
  accountInfo?: {
    id: string;
    name?: string;
    username?: string;
    followersCount?: number;
    mediaCount?: number;
  };
}

export interface KeySignal {
  id: string;
  category: "What's working" | 'Best time' | 'New opportunity';
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
  details: {
    trend: string;
    impact: string;
    observedSignal: string;
  };
}

export interface AIInsight {
  id: string;
  category: 'Pattern detected' | 'Timing signal' | 'Growth signal' | 'Opportunity';
  icon: string;
  title: string;
  description: string;
  whyItMatters: string;
  confidence: 'High' | 'Medium';
  detectedAt: string;
  recommendedAction?: string;
  // Section 13 Specification Fields
  observation?: string;
  supportingData?: string;
  possibleReason?: string;
  measurement?: string;
}

export interface PerformerAnalysis {
  id: string;
  mediaId: string;
  title: string;
  caption?: string;
  platform: PlatformType;
  contentType: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  baselineComparison: string; // e.g. "+184% vs average" or "-45% vs baseline"
  isTopPerformer: boolean;
  possibleFactors: string[];
  patternToReplicateOrImprove: string;
  alternativeApproach?: string;
  uncertaintyNote?: string;
  publishedAt: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
}

export interface Recommendation {
  id: string;
  type: 'CREATE' | 'TEST' | 'REPURPOSE';
  title: string;
  reason: string;
  supportingSignal: string;
  actionText: string;
  status: 'pending' | 'planned' | 'dismissed';
  suggestedSlot?: {
    day: string;
    time: string;
    format: string;
  };
  // Section 6 Specification Fields
  identifiedProblem?: string;
  supportingPattern?: string;
  recommendedImprovement?: string;
  suggestedImplementation?: string;
  expectedMeasurement?: string;
}

export interface TrendItem {
  id: string;
  name: string;
  category: 'Topics' | 'Formats' | 'Audience behaviour';
  status: 'Rising' | 'Stable' | 'Losing momentum';
  explanation: string;
  changeRate: string;
  // Section 7 Specification Fields
  reasonForRelevance?: string;
  recommendedPlatform?: PlatformType;
  suggestedFormat?: string;
  contentConcept?: string;
  suggestedHook?: string;
  targetAudienceRelevance?: string;
  captionDirection?: string;
  recommendedNextAction?: string;
  trendType?: 'Verified external trend' | 'Inferred from profile data' | 'AI-generated content concept';
}

export interface PlannedContent {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time: string;
  platform: PlatformType;
  contentType: string;
  title: string;
  isRecommended?: boolean;
  recommendationReason?: string;
  status: 'scheduled' | 'draft' | 'published';
}

export interface AlertItem {
  id: string;
  type: 'Performance spike' | 'Engagement change' | 'New pattern';
  icon: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'info';
  timestamp: string;
  investigationNotes: string;
  read: boolean;
}

export interface TimingSlot {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  score: number; // 0 to 100
  sampleCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  plan: 'Growth' | 'Enterprise';
  demoMode: boolean;
}

export interface PostAIDiagnosis {
  mediaId: string;
  status: 'working' | 'underperforming' | 'average';
  statusBadge: string;
  headline: string;
  executiveSummary: string;
  baselineComparison: string;
  whyWorking?: {
    hookEffectiveness: string;
    retentionDrivers: string;
    audienceInteractionTriggers: string;
    algorithmDistributionSignal: string;
  };
  whyNotWorking?: {
    dropoffDiagnosis: string;
    hookFriction: string;
    valuePropositionGap: string;
    formattingMismatch: string;
  };
  metricBreakdown: {
    viewsAnalysis: string;
    engagementHealth: string;
    commentVelocity: string;
    shareabilityAnalysis: string;
  };
  suggestedHookAlternative: string;
  recommendedFormatAndTiming: string;
  actionableChecklist: string[];
  source: 'Gemini 3.8 Flash' | 'Media Intelligence Engine';
}
