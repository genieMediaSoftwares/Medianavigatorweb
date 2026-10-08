/** Shared API types, inferred from the response schemas so the types and the runtime checks can never drift apart. */
import type { z } from 'zod';
import type * as s from '@/lib/api/schemas';

export type Platform = z.infer<typeof s.platformSchema>;
export type PageMeta = z.infer<typeof s.pageMetaSchema>;

export type User = z.infer<typeof s.userSchema>;
export type Profile = z.infer<typeof s.profileSchema>;
export type Me = z.infer<typeof s.meSchema>;
export type Session = z.infer<typeof s.sessionSchema>;

export type Capabilities = z.infer<typeof s.capabilitiesSchema>;
export type ConnectionStatus = z.infer<typeof s.connectionStatusSchema>;
export type Connection = z.infer<typeof s.connectionSchema>;
export type SyncRunStatus = z.infer<typeof s.syncRunStatusSchema>;
export type SyncRun = z.infer<typeof s.syncRunSchema>;

export type Media = z.infer<typeof s.mediaSchema>;

export type Classification = z.infer<typeof s.classificationSchema>;
export type Baseline = z.infer<typeof s.baselineSchema>;
export type RankedItem = z.infer<typeof s.rankedItemSchema>;
export type Summary = z.infer<typeof s.summarySchema>;
export type HistoryRow = z.infer<typeof s.historyRowSchema>;
export type KeySignal = z.infer<typeof s.keySignalSchema>;
export type Overview = z.infer<typeof s.overviewSchema>;
export type TimingSlot = z.infer<typeof s.timingSlotSchema>;
export type Timing = z.infer<typeof s.timingSchema>;
export type Trend = z.infer<typeof s.trendSchema>;
export type Recommendation = z.infer<typeof s.recommendationSchema>;
export type FormatPattern = z.infer<typeof s.formatPatternSchema>;
export type Archive = z.infer<typeof s.archiveSchema>;
export type ServiceStatus = z.infer<typeof s.statusSchema>;
export type AiMeta = z.infer<typeof s.aiMetaSchema>;
export type AiStatus = AiMeta['status'];
export type AskResult = z.infer<typeof s.askResultSchema>;
export type Diagnosis = z.infer<typeof s.diagnosisSchema>;
export type VideoAnalysis = z.infer<typeof s.videoAnalysisSchema>;
export type Comparison = z.infer<typeof s.compareSchema>;

export type Weekday = z.infer<typeof s.weekdaySchema>;
export type PlannedItem = z.infer<typeof s.plannedItemSchema>;
export type PlannerInsights = z.infer<typeof s.plannerInsightsSchema>;

export type Notification = z.infer<typeof s.notificationSchema>;
export type StoredFile = z.infer<typeof s.fileSchema>;
export type FileAccess = z.infer<typeof s.fileAccessSchema>;

export type AdminSystem = z.infer<typeof s.adminSystemSchema>;
export type AdminAccount = z.infer<typeof s.adminAccountSchema>;
export type AuditEntry = z.infer<typeof s.auditEntrySchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
