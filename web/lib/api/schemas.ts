/**
 * Response schemas for the Media Navigator API (docs/api.md). Every response is parsed with these at the boundary, so
 * a contract change shows up as a clear error instead of a silently wrong screen. Unknown fields are dropped.
 */
import { z } from 'zod';

export const PLATFORMS = ['instagram', 'facebook', 'youtube', 'linkedin'] as const;
export const platformSchema = z.enum(PLATFORMS);

const nullableString = z.string().nullable();
const isoDate = z.string();

// ---------- envelope ----------
export const pageMetaSchema = z.object({
  limit: z.number(),
  nextCursor: z.string().nullish(),
  total: z.number().optional(),
});

export const errorBodySchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});

// ---------- users ----------
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['user', 'admin']),
  status: z.string(),
  createdAt: isoDate,
  lastLoginAt: isoDate.nullable(),
});

export const profileSchema = z.object({
  fullName: z.string(),
  organization: nullableString,
  accountType: nullableString,
  timezone: nullableString,
  avatarFileId: nullableString,
  onboardingCompleted: z.boolean(),
});

export const meSchema = z.object({ user: userSchema, profile: profileSchema.nullable() });
export const signInResultSchema = z.object({ user: userSchema, profile: profileSchema.nullable().optional() });
export const profileUpdateResultSchema = z.object({ profile: profileSchema.nullable() });

export const sessionSchema = z.object({
  id: z.string(),
  current: z.boolean(),
  userAgent: nullableString,
  ip: nullableString,
  lastUsedAt: isoDate.nullish(),
  createdAt: isoDate,
});
export const sessionsSchema = z.object({ sessions: z.array(sessionSchema) });

// ---------- connections ----------
export const capabilitiesSchema = z.object({
  platform: platformSchema,
  unavailableMetrics: z.array(z.string()),
  unsupportedContent: z.array(z.string()),
  supportsOAuth: z.boolean(),
  supportsPkce: z.boolean(),
  incrementalInsights: z.boolean(),
  notes: z.array(z.string()),
});

export const connectionStatusSchema = z.enum([
  'not_connected', 'connecting', 'connected', 'syncing', 'sync_complete', 'permission_required', 'connection_expired', 'sync_failed',
]);

export const connectionSchema = z.object({
  platform: platformSchema,
  name: z.string(),
  accountHandle: z.string(),
  avatarUrl: z.string().nullish(),
  connected: z.boolean(),
  lastSyncedAt: z.string(),
  status: connectionStatusSchema,
  statusMessage: z.string().nullish(),
  dataPointsCount: z.number(),
  missingPermissions: z.array(z.string()).nullish(),
  accountInfo: z.object({
    id: z.string(),
    name: z.string().nullish(),
    username: z.string().nullish(),
    followersCount: z.number().nullish(),
    mediaCount: z.number().nullish(),
  }).nullish(),
  sync: z.object({ state: z.string(), lastSyncedAt: nullableString, nextSyncAt: nullableString, lastError: nullableString }),
  capabilities: capabilitiesSchema,
  oauthAvailable: z.boolean().optional(),
});
export const connectionsSchema = z.array(connectionSchema);

export const SYNC_RUN_STATUSES = ['queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled'] as const;
export const syncRunStatusSchema = z.enum(SYNC_RUN_STATUSES);
export const syncRunSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  type: z.string(),
  status: syncRunStatusSchema,
  queuedAt: isoDate,
  startedAt: isoDate.nullable(),
  completedAt: isoDate.nullable(),
  durationMs: z.number().nullable(),
  items: z.object({ fetched: z.number(), created: z.number(), updated: z.number(), skipped: z.number(), failed: z.number() }),
  attempts: z.number(),
  errorKind: nullableString,
  errorSummary: nullableString,
});
export const connectResultSchema = z.object({ connection: connectionSchema.omit({ oauthAvailable: true }), syncRun: syncRunSchema });
export const syncResultSchema = z.object({ syncRun: syncRunSchema, alreadyQueued: z.boolean() });
export const syncAllResultSchema = z.object({ syncRuns: z.array(syncRunSchema) });
export const oauthStartSchema = z.object({ authorizeUrl: z.url() });

// ---------- media ----------
export const mediaSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  contentType: z.string(),
  title: z.string(),
  caption: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  mediaUrl: z.string().nullish(),
  publishedAt: isoDate,
  durationSeconds: z.number().nullish(),
  views: z.number(),
  reach: z.number(),
  engagementRate: z.number(),
  shares: z.number(),
  watchTimeMinutes: z.number().nullish(),
  likes: z.number(),
  comments: z.number(),
  unavailableMetrics: z.array(z.string()),
  contentTypeBasis: z.string(),
});
export const mediaListSchema = z.array(mediaSchema);

// ---------- intelligence ----------
export const classificationSchema = z.enum(['TOP', 'TYPICAL', 'LOW', 'INSUFFICIENT_DATA']);

export const baselineSchema = z.object({
  sampleSize: z.number(),
  medianEngagementRate: z.number(),
  p25EngagementRate: z.number(),
  p75EngagementRate: z.number(),
  medianViews: z.number(),
  p25Views: z.number(),
  p75Views: z.number(),
});

const periodStatsSchema = z.object({
  from: isoDate, to: isoDate, count: z.number(), medianEngagementRate: z.number(), meanEngagementRate: z.number(), medianViews: z.number(), totalViews: z.number(),
});

export const rankedItemSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  contentType: z.string(),
  title: z.string(),
  publishedAt: isoDate,
  views: z.number(),
  likes: z.number(),
  comments: z.number(),
  shares: z.number(),
  engagementRate: z.number(),
  classification: classificationSchema,
  vsMedianEngagementPct: z.number().nullable(),
});

const topicSchema = z.object({ topic: z.string(), count: z.number(), recentCount: z.number(), medianEngagementRate: z.number(), trend: z.number().nullable() });

export const summarySchema = z.object({
  scope: z.string(),
  platformsIncluded: z.array(platformSchema),
  platformsConnectedWithoutData: z.array(platformSchema),
  dataPeriod: z.object({ days: z.number(), current: periodStatsSchema, previous: periodStatsSchema }),
  periodComparison: z.object({
    engagementRateMedianChangePct: z.number().nullable(),
    viewsMedianChangePct: z.number().nullable(),
    comparable: z.boolean(),
  }),
  baselines: z.record(z.string(), baselineSchema),
  classificationMethod: z.string(),
  contentTypePerformance: z.array(z.object({
    platform: z.string(), contentType: z.string(), count: z.number(), medianEngagementRate: z.number(), meanEngagementRate: z.number(), medianViews: z.number(),
  })),
  topicPerformance: z.array(topicSchema),
  trendingTopics: z.array(topicSchema),
  topContent: z.array(rankedItemSchema),
  needsImprovement: z.array(rankedItemSchema),
  insufficientHistory: z.array(z.string()),
  timezone: z.string(),
  lastSyncedAt: isoDate.nullable(),
  contentIdeas: z.object({
    generatedBy: z.string(),
    items: z.array(z.object({ source: z.string(), idea: z.string(), basedOn: z.string() })),
  }),
});

export const historyRowSchema = z.object({
  platform: platformSchema,
  connectedAccountId: z.string(),
  date: z.string(),
  contentCount: z.number(),
  totalViews: z.number(),
  totalLikes: z.number(),
  totalComments: z.number(),
  totalShares: z.number(),
  meanEngagementRate: z.number(),
  medianEngagementRate: z.number(),
  followersCount: z.number().nullish(),
});
export const historySchema = z.array(historyRowSchema);

export const keySignalSchema = z.object({
  id: z.string(), category: z.string(), title: z.string(), description: z.string(), actionText: z.string(), actionTarget: z.string(),
});
export const overviewSchema = z.object({
  hasData: z.boolean(),
  message: z.string().optional(),
  hero: z.object({ hasData: z.boolean(), heading: z.string(), summary: z.string(), badge: z.string() }),
  signals: z.array(keySignalSchema),
});

export const timingSlotSchema = z.object({
  day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  timeOfDay: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']),
  score: z.number(),
  sampleCount: z.number(),
});
export const timingSchema = z.object({
  hasData: z.boolean(),
  message: z.string().optional(),
  strongestWindow: z.object({ label: z.string(), timeSlot: z.string(), confidence: z.enum(['High', 'Low']), supportingText: z.string() }).nullable(),
  matrix: z.array(timingSlotSchema),
  timezone: z.string(),
});

export const trendSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  status: z.enum(['Rising', 'Stable', 'Losing momentum']),
  explanation: z.string(),
  changeRate: z.string(),
  reasonForRelevance: z.string().optional(),
  recommendedNextAction: z.string().optional(),
});
export const trendsSchema = z.object({ trends: z.array(trendSchema) });

export const recommendationSchema = z.object({
  id: z.string(),
  type: z.enum(['CREATE', 'TEST', 'REPURPOSE']),
  title: z.string(),
  reason: z.string(),
  supportingSignal: z.string(),
  status: z.string(),
  suggestedSlot: z.object({ day: z.string(), time: z.string(), format: z.string() }).optional(),
  recommendedImprovement: z.string().optional(),
  suggestedImplementation: z.string().optional(),
  expectedMeasurement: z.string().optional(),
});
export const recommendationsSchema = z.object({ items: z.array(recommendationSchema) });

export const formatPatternSchema = z.object({ format: z.string(), count: z.number(), avgEngagement: z.number(), avgViews: z.number() });
export const patternsSchema = z.array(formatPatternSchema);

export const archiveSchema = z.object({
  hasData: z.boolean(),
  totalAnalyzed: z.number(),
  avgEngagementRate: z.number(),
  captionAnalysis: z.object({
    questionHook: z.object({
      countWithQuestion: z.number(), avgEngagementWithQuestion: z.number(), countWithoutQuestion: z.number(), avgEngagementWithoutQuestion: z.number(),
    }),
    captionLength: z.object({ shortCount: z.number(), shortAvgEngagement: z.number(), longCount: z.number(), longAvgEngagement: z.number() }),
  }),
});

export const statusSchema = z.object({
  ai: z.object({ available: z.boolean(), model: z.string().nullable(), promptVersion: z.string() }),
  storage: z.object({ available: z.boolean() }),
  email: z.object({ available: z.boolean() }),
  providers: z.array(z.object({ platform: platformSchema, oauthAvailable: z.boolean(), capabilities: capabilitiesSchema })),
});

export const AI_STATUSES = ['ran', 'cached', 'unavailable', 'failed', 'not_needed'] as const;
export const aiMetaSchema = z.object({
  status: z.enum(AI_STATUSES),
  model: z.string().nullable(),
  promptVersion: z.string(),
  generatedAt: z.string().nullable(),
  reason: z.string().optional(),
});

export const askResultSchema = z.object({
  answer: z.string(), observedSignal: z.string(), suggestedAction: z.string(), source: z.string(), ai: aiMetaSchema,
});

export const itemCalculatedSchema = z.object({
  classification: classificationSchema,
  comparedAgainst: z.string(),
  accountMedianEngagementPct: z.number(),
  engagementVsMedianPct: z.number().nullable(),
  accountMedianViews: z.number(),
  viewsVsMedianPct: z.number().nullable(),
});

export const diagnosisSchema = z.object({
  mediaId: z.string(),
  status: z.enum(['working', 'underperforming', 'average']),
  statusBadge: z.string(),
  headline: z.string(),
  executiveSummary: z.string(),
  baselineComparison: z.string(),
  topSuccessDrivers: z.array(z.string()).optional(),
  bottomImprovementPoints: z.array(z.string()).optional(),
  metricBreakdown: z.object({ viewsAnalysis: z.string(), engagementHealth: z.string(), commentVelocity: z.string(), shareabilityAnalysis: z.string() }),
  suggestedHookAlternative: z.string(),
  recommendedFormatAndTiming: z.string(),
  actionableChecklist: z.array(z.string()),
  source: z.string(),
  ai: aiMetaSchema,
  limitations: z.array(z.string()),
  calculated: itemCalculatedSchema,
});

export const videoAnalysisSchema = z.object({
  mediaId: z.string(),
  classification: classificationSchema,
  measured: z.object({ durationSeconds: z.number().nullable(), views: z.number(), engagementRatePct: z.number(), watchTimeMinutes: z.number().nullable() }),
  hookAssessment: z.string().nullable(),
  captionAssessment: z.string().nullable(),
  recommendations: z.array(z.string()),
  testedAlternativeHook: z.string().nullable(),
  unavailable: z.array(z.string()),
  limitations: z.array(z.string()),
  ai: aiMetaSchema,
});

const compareRowSchema = z.object({
  id: z.string(), platform: platformSchema, contentType: z.string(), title: z.string(), publishedAt: isoDate,
  views: z.number(), likes: z.number(), comments: z.number(), shares: z.number(), engagementRatePct: z.number(), durationSeconds: z.number().nullable(),
});
const deltaSchema = z.object({ a: z.number(), b: z.number(), differencePct: z.number().nullable() });
export const compareSchema = z.object({
  a: compareRowSchema,
  b: compareRowSchema,
  comparison: z.object({ views: deltaSchema, likes: deltaSchema, comments: deltaSchema, engagementRatePct: deltaSchema }),
  note: z.string().nullable(),
});

// ---------- planner ----------
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const weekdaySchema = z.enum(WEEKDAYS);
export const plannedItemSchema = z.object({
  id: z.string(),
  day: weekdaySchema,
  time: z.string(),
  platform: platformSchema,
  contentType: z.string().nullish(),
  title: z.string(),
  isRecommended: z.boolean().nullish(),
  recommendationReason: z.string().nullish(),
  status: z.string(),
});
export const plannerSchema = z.array(plannedItemSchema);
export const plannerInsightsSchema = z.object({
  timezone: z.string(),
  hasEnoughData: z.boolean(),
  bestWindows: z.array(z.object({
    day: z.string(), timeOfDay: z.string(), timeSlot: z.string(), meanEngagementRate: z.number(), sampleCount: z.number(), timezone: z.string(),
  })),
  contentGaps: z.array(z.object({ platform: platformSchema, daysSinceLastPost: z.number().nullable() })),
  basedOn: z.object({ posts: z.number() }),
});

// ---------- notifications ----------
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.enum(['info', 'medium', 'high']),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).nullable(),
  read: z.boolean(),
  readAt: isoDate.nullable(),
  createdAt: isoDate,
});
export const notificationsSchema = z.array(notificationSchema);
export const unreadCountSchema = z.object({ unread: z.number() });

// ---------- files ----------
export const fileSchema = z.object({ id: z.string(), name: z.string(), mimeType: z.string(), size: z.number(), purpose: z.string(), createdAt: isoDate });
export const filesSchema = z.array(fileSchema);
export const fileAccessSchema = fileSchema.extend({ url: z.url(), expiresInSeconds: z.number() });

// ---------- admin ----------
export const adminSystemSchema = z.object({
  app: z.object({ environment: z.string(), uptimeSeconds: z.number(), node: z.string() }),
  database: z.object({ status: z.string() }),
  counts: z.object({ users: z.number(), activeSessions: z.number(), contentItems: z.number(), aiCacheEntries: z.number() }),
  connectedAccountsByStatus: z.record(z.string(), z.number()),
  syncRunsByStatus: z.record(z.string(), z.number()),
  storage: z.object({ configured: z.boolean(), files: z.number(), bytes: z.number() }),
  features: z.object({
    ai: z.object({ configured: z.boolean(), model: z.string().nullable() }),
    email: z.object({ configured: z.boolean() }),
    syncWorker: z.boolean(),
    syncScheduler: z.boolean(),
    oauth: z.record(z.string(), z.boolean()),
  }),
});
export const adminUsersSchema = z.array(userSchema);
export const adminAccountSchema = z.object({
  id: z.string(), userId: z.string(), platform: platformSchema, handle: z.string(), status: z.string(), active: z.boolean(),
  lastSyncedAt: isoDate.nullable(), nextSyncAt: isoDate.nullable(), lastSyncError: nullableString, dataPointsCount: z.number(), createdAt: isoDate,
});
export const adminAccountsSchema = z.array(adminAccountSchema);
export const adminSyncRunsSchema = z.array(syncRunSchema);
export const auditEntrySchema = z.object({
  id: z.string(), actorId: nullableString, action: z.string(), targetType: nullableString, targetId: nullableString, requestId: nullableString, createdAt: isoDate,
});
export const auditLogSchema = z.array(auditEntrySchema);
