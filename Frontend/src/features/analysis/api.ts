import { apiPage, apiRequest, Page } from '@/lib/api/client';
import type { ContentAnalysis, ContentAnalysisType, MediaItem, PerformerSort, PerformersResponse, Platform, Summary } from '@/types/api';
import type { CreativeReport } from './creative-report';
import type { DeepReport } from './deep-report';
import type { DeepAnalysisState } from '../../../../shared/deepAnalysisV2';

export const startDeepAnalysisV2 = (postId: string, reanalyze = false, goal?: string) => apiRequest<DeepAnalysisState>('/intelligence/deep-report-v2', { method: 'POST', auth: true, json: { postId, reanalyze, ...(goal ? { goal } : {}) } });
export const pollDeepAnalysisV2 = (jobId: string) => apiRequest<DeepAnalysisState>(`/intelligence/deep-report-v2/${jobId}`, { auth: true });
export const refreshDeepAudience = (jobId: string) => apiRequest<DeepAnalysisState>(`/intelligence/deep-report-v2/${jobId}/audience`, { method: 'POST', auth: true });
export const cancelDeepAnalysisV2 = (jobId: string) => apiRequest<DeepAnalysisState>(`/intelligence/deep-report-v2/${jobId}/cancel`, { method: 'POST', auth: true });
export const savedDeepActions = (jobId: string) => apiRequest<string[]>(`/intelligence/deep-report-v2/${jobId}/saved-actions`, { auth: true });
export const saveDeepAction = (jobId: string, actionId: string, saved: boolean) => apiRequest(`/intelligence/deep-report-v2/${jobId}/actions/${actionId}`, { method: saved ? 'POST' : 'DELETE', auth: true });

/** Twelve-section creative review of actual media; no metrics or ranking input. */
export function fetchDeepReport(mediaId: string, reanalyze = false): Promise<DeepReport> {
  return apiRequest<DeepReport>('/intelligence/deep-report', { method: 'POST', auth: true, json: { mediaId, ...(reanalyze ? { reanalyze: true } : {}) } });
}

/** App-only seven-part report; neither performance metrics nor ranking are sent to the AI. */
export function fetchCreativeReport(mediaId: string, type: 'why_top' | 'why_bottom', reanalyze = false): Promise<CreativeReport> {
  return apiRequest<CreativeReport>('/intelligence/creative-report', { method: 'POST', auth: true, json: { mediaId, type, ...(reanalyze ? { reanalyze: true } : {}) } });
}

// The same endpoints the web client uses (web/lib/api/endpoints.ts). Rankings, baselines and AI text
// all come from the server; nothing is calculated here.

/** Synced posts for one platform (or every connected one when omitted), newest first, following the server's cursor. */
export function fetchMediaPage(platform?: Platform, cursor?: string | null): Promise<Page<MediaItem>> {
  return apiPage<MediaItem>('/media', { platform, limit: 24, cursor: cursor ?? undefined });
}

export function fetchMediaItem(id: string): Promise<MediaItem> {
  return apiRequest<MediaItem>(`/media/${encodeURIComponent(id)}`, { auth: true });
}

/** Best and weakest posts of one platform, ranked by `sortBy` and compared with that account's typical post. */
export function fetchPerformers(sortBy: PerformerSort, platform?: Platform): Promise<PerformersResponse> {
  return apiRequest<PerformersResponse>('/intelligence/performers', { auth: true, query: { sortBy, platform } });
}

/** The platform's baseline and whether it has enough history (web uses the 1-year summary). */
export function fetchSummary(platform: Platform): Promise<Summary> {
  return apiRequest<Summary>('/intelligence/summary', { auth: true, query: { platform, days: 365 } });
}

/**
 * Six-point analysis of one post over its real media. The server returns the saved result while it is
 * still valid and only generates a new one when the post's data changed, it is stale, or `reanalyze` is set.
 */
export function fetchContentAnalysis(mediaId: string, type: ContentAnalysisType, opts: { reanalyze?: boolean; rank?: string } = {}): Promise<ContentAnalysis> {
  return apiRequest<ContentAnalysis>('/intelligence/content-analysis', {
    method: 'POST',
    auth: true,
    json: { mediaId, type, ...(opts.reanalyze ? { reanalyze: true } : {}), ...(opts.rank ? { rank: opts.rank } : {}) },
  });
}

