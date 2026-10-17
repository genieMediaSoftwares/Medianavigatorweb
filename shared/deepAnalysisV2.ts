export const DEEP_CATEGORIES = ['performance_diagnosis', 'hook_intelligence', 'timeline_analysis', 'storytelling_and_pacing', 'visual_quality', 'audio_and_speech', 'audience_psychology', 'caption_and_discovery', 'cta_and_conversion', 'competitor_and_trend_context', 'mistakes_and_opportunities', 'next_content_strategy'] as const;
export type DeepCategory = typeof DEEP_CATEGORIES[number];
export type DeepStatus = 'strong' | 'good' | 'needs_attention' | 'insufficient_evidence';
export type TimelineStatus = DeepStatus | 'review';
export type ClaimType = 'measured' | 'observed' | 'calculated' | 'inferred' | 'unavailable';
export type Confidence = 'high' | 'medium' | 'low';
export interface DeepSource {
  id: string; source: 'video_frame' | 'audio' | 'image' | 'document' | 'on_screen_text' | 'caption' | 'title' | 'comment' | 'metric';
  assetId: string | null; startSeconds: number | null; endSeconds: number | null; slideNumber: number | null; pageNumber: number | null;
  quote: string | null; description: string; claimType: ClaimType; confidence: Confidence;
}
export interface PriorityFinding {
  id: string; category: DeepCategory; title: string; status: DeepStatus; explanation: string; finding: string;
  evidence: DeepSource[]; likelyImpact: string; recommendedAction: string; confidence: Confidence; claimType: ClaimType; priority: number;
}
export interface DeepAction {
  id: string; kind: 'repeat' | 'change' | 'idea'; title: string; why: string; what: string; example: string | null; evidenceIds: string[];
}
export interface AudienceFinding {
  id: string; section: 'response' | 'questions' | 'motivations' | 'signals' | 'demand'; title: string; text: string;
  label: 'measured' | 'observed_in_comments' | 'ai_interpretation'; evidence: DeepSource[]; confidence: Confidence;
}
export interface DeepAnalysisV2 {
  postId: string; accountId: string; platform: 'instagram' | 'facebook' | 'youtube' | 'linkedin'; mediaType: string;
  post: { title: string; caption: string; publishedAt: string }; goal: string;
  analysisStatus: 'complete' | 'partial'; analysisVersion: string; generatedAt: string;
  coverage: { accessibleDurationSeconds: number | null; analyzedDurationSeconds: number; isComplete: boolean; accessibleAssets: number; analyzedAssets: number; limitations: string[]; method: string };
  overview: { summary: string; strongestQuality: string | null; mainOpportunity: string | null; keyTakeaway: string; timeline: { assetId: string; label: string; startSeconds: number | null; endSeconds: number | null; slideNumber: number | null; status: TimelineStatus; evidenceIds: string[] }[]; priorityFindings: PriorityFinding[] };
  audience: { availability: 'available' | 'unavailable'; findings: AudienceFinding[]; limitations: string[]; sampledComments: number; collectedAt: string };
  nextMove: { actions: DeepAction[] };
  processing: { model: string; promptVersion: string; validatedAt: string; categoryEngine: readonly DeepCategory[]; sources: DeepSource[] };
}
export interface DeepAnalysisState {
  postId: string; jobId: string; status: 'queued' | 'processing' | 'complete' | 'partial' | 'failed' | 'cancelled';
  progress: { stage: string; processed: number; total: number }; report: DeepAnalysisV2 | null; error: string | null;
}
