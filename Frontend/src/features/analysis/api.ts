import { apiPage, apiRequest, Page } from '@/lib/api/client';
import type { ContentAnalysis, ContentAnalysisType, MediaItem, PerformerSort, PerformersResponse, Platform, Summary } from '@/types/api';

// The same endpoints the web client uses (web/lib/api/endpoints.ts). Rankings, baselines and AI text
// all come from the server; nothing is calculated here.

/** Synced posts for one platform, newest first, following the server's cursor. */
export function fetchMediaPage(platform: Platform, cursor?: string | null): Promise<Page<MediaItem>> {
  return apiPage<MediaItem>('/media', { platform, limit: 24, cursor: cursor ?? undefined });
}

export function fetchMediaItem(id: string): Promise<MediaItem> {
  return apiRequest<MediaItem>(`/media/${encodeURIComponent(id)}`, { auth: true });
}

/** Best and weakest posts, ranked by `sortBy` against the account's average. */
export function fetchPerformers(sortBy: PerformerSort): Promise<PerformersResponse> {
  return apiRequest<PerformersResponse>('/intelligence/performers', { auth: true, query: { sortBy } });
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

