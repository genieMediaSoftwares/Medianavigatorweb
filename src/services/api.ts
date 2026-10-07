import {
  NormalizedMedia, PlatformConnection, KeySignal, Observation, AIInsight, Recommendation, TrendItem,
  PlannedContent, AlertItem, TimingSlot, Workspace, PerformerAnalysis, PostAIDiagnosis,
} from '../types';
import { request, requestWithMeta } from './auth';

export interface OverviewData {
  hasData?: boolean;
  message?: string;
  hero: { hasData?: boolean; heading: string; summary: string; badge: string; confidence: string };
  signals: KeySignal[];
  observations: Observation[];
  connections: PlatformConnection[];
}

export interface TimingData {
  hasData?: boolean;
  message?: string;
  title: string;
  subtitle: string;
  strongestWindow: { label: string; timeSlot: string; confidence: string; supportingText: string } | null;
  matrix: TimingSlot[];
  timezone?: string;
}

export interface IntelligenceData { title: string; insights: AIInsight[] }
export interface RecommendationsData { title: string; items: Recommendation[] }
export interface TrendsData { title: string; trends: TrendItem[] }

/** Tells the UI whether an AI interpretation actually ran. */
export interface AiMeta {
  status: 'ran' | 'cached' | 'unavailable' | 'failed' | 'not_needed';
  model: string | null;
  promptVersion: string;
  generatedAt: string | null;
  reason?: string;
}

export interface SyncRun {
  id: string;
  platform: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';
  items: { fetched: number; created: number; updated: number; skipped: number; failed: number };
  errorKind: string | null;
  errorSummary: string | null;
}

type Synced = PlatformConnection & { media: NormalizedMedia[]; mediaCount: number };

const RUN_POLL_MS = 1500;
const RUN_TIMEOUT_MS = 5 * 60_000;

async function waitForRun(runId: string): Promise<SyncRun> {
  const started = Date.now();
  for (;;) {
    const run = await request<SyncRun>(`/api/v1/connections/sync-runs/${runId}`);
    if (run.status !== 'queued' && run.status !== 'running') return run;
    if (Date.now() - started > RUN_TIMEOUT_MS) throw new Error('The sync is still running in the background. Check back in a few minutes.');
    await new Promise((r) => setTimeout(r, RUN_POLL_MS));
  }
}

async function assertRunOk(run: SyncRun) {
  if (run.status === 'failed' || run.status === 'cancelled') throw new Error(run.errorSummary || 'Sync failed');
}

/** The media feed is cursor-paginated; this walks it (bounded) so list screens get the full library. */
async function loadAllMedia(platform?: string): Promise<NormalizedMedia[]> {
  const out: NormalizedMedia[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ limit: '100' });
    if (platform && platform !== 'all') qs.set('platform', platform);
    if (cursor) qs.set('cursor', cursor);
    const { data, meta } = await requestWithMeta<NormalizedMedia[]>(`/api/v1/media?${qs}`);
    out.push(...data);
    cursor = meta?.nextCursor ?? undefined;
    if (!cursor) break;
  }
  return out;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} });

export const api = {
  getWorkspace: () => request<Workspace>('/api/v1/workspaces'),
  getOverview: () => request<OverviewData>('/api/v1/analytics/overview'),
  getConnections: () => request<PlatformConnection[]>('/api/v1/connections'),

  /** Validates the credentials server-side, queues the first sync, and resolves when that sync has finished. */
  connectPlatform: async (platform: string, credentials: Record<string, unknown>): Promise<Synced> => {
    const { syncRun } = await post<{ syncRun: SyncRun }>(`/api/v1/connections/${platform}/connect`, credentials);
    const run = await waitForRun(syncRun.id);
    await assertRunOk(run);
    const [connections, media] = await Promise.all([api.getConnections(), loadAllMedia(platform)]);
    const conn = connections.find((c) => c.platform === platform)!;
    return { ...conn, media, mediaCount: media.length };
  },

  /** Starts the OAuth consent flow; the browser is sent to the provider and returns to the web app afterwards. */
  startOAuth: async (platform: string) => {
    const { authorizeUrl } = await post<{ authorizeUrl: string }>(`/api/v1/connections/${platform}/oauth/start`);
    window.location.assign(authorizeUrl);
  },

  syncConnection: async (platform: string): Promise<Synced> => {
    const { syncRun } = await post<{ syncRun: SyncRun }>(`/api/v1/connections/${platform}/sync`);
    const run = await waitForRun(syncRun.id);
    await assertRunOk(run);
    const [connections, media] = await Promise.all([api.getConnections(), loadAllMedia(platform)]);
    const conn = connections.find((c) => c.platform === platform)!;
    return { ...conn, media, mediaCount: media.length };
  },

  syncAllConnections: async (): Promise<{ mediaCount: number; connections: PlatformConnection[]; media: NormalizedMedia[] }> => {
    const { syncRuns } = await post<{ syncRuns: SyncRun[] }>('/api/v1/connections/sync-all');
    await Promise.all(syncRuns.map((r) => waitForRun(r.id)));
    const [connections, media] = await Promise.all([api.getConnections(), loadAllMedia()]);
    return { mediaCount: media.length, connections, media };
  },

  disconnectPlatform: (platform: string) => post<PlatformConnection>(`/api/v1/connections/${platform}/disconnect`),
  toggleConnection: (platform: string) => api.disconnectPlatform(platform),

  fetchYouTubeChannel: (params: { apiKey?: string; accessToken?: string; channelQuery?: string; channelId?: string }) =>
    post<{ id: string; title: string; description: string; customUrl?: string; thumbnailUrl?: string; subscriberCount?: number; videoCount?: number; viewCount?: number; uploadsPlaylistId?: string }>('/api/v1/youtube/fetch-channel', params),

  getMedia: (platform?: string) => loadAllMedia(platform),
  getMediaById: (id: string) => request<NormalizedMedia>(`/api/v1/media/${encodeURIComponent(id)}`),

  getTiming: () => request<TimingData>('/api/v1/timing'),
  getIntelligence: () => request<IntelligenceData>('/api/v1/intelligence/signals'),
  getPerformers: (sortBy: string = 'views') => request<{ top: PerformerAnalysis[]; bottom: PerformerAnalysis[] }>(`/api/v1/intelligence/performers?sortBy=${encodeURIComponent(sortBy)}`),
  getContentPatterns: () => request<any[]>('/api/v1/intelligence/patterns'),
  getArchiveAudit: () => request<any>('/api/v1/intelligence/archive-audit'),
  getSummary: (opts: { platform?: string; days?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.platform) qs.set('platform', opts.platform);
    if (opts.days) qs.set('days', String(opts.days));
    return request<any>(`/api/v1/intelligence/summary?${qs}`);
  },

  /** Every AI response carries `ai.status`; when it is not "ran"/"cached" the text is measured facts only. */
  askAI: (question: string) =>
    post<{ answer: string; observedSignal: string; suggestedAction: string; source: string; ai: AiMeta }>('/api/v1/intelligence/ask', { question }),

  analyzeItemAI: (mediaId: string) =>
    post<{ observedFact: string; possibleReason: string; actionableRecommendations: string[]; confidence: 'High' | 'Medium'; answeredBy: string; ai: AiMeta }>('/api/v1/intelligence/analyze-item', { mediaId }),

  diagnosePostAI: (mediaId: string, _mediaItem?: NormalizedMedia, forcedStatus?: 'working' | 'underperforming' | 'average') =>
    post<PostAIDiagnosis & { ai?: AiMeta; limitations?: string[] }>('/api/v1/intelligence/diagnose-post', { mediaId, forcedStatus }),

  analyzeVideoAI: (mediaId: string) =>
    post<{ hookAssessment: string | null; captionAssessment: string | null; recommendations: string[]; testedAlternativeHook: string | null; unavailable: string[]; limitations: string[]; ai: AiMeta }>('/api/v1/intelligence/analyze-video', { mediaId }),

  getRecommendations: () => request<RecommendationsData>('/api/v1/recommendations'),
  planRecommendation: (id: string, slot?: { day?: string; time?: string }) => post<PlannedContent>(`/api/v1/recommendations/${encodeURIComponent(id)}/plan`, slot),
  getTrends: () => request<TrendsData>('/api/v1/trends'),

  getPlanner: () => request<PlannedContent[]>('/api/v1/planner'),
  getPlannerInsights: () => request<any>('/api/v1/planner/insights'),
  addPlannerItem: (item: Omit<PlannedContent, 'id'>) =>
    post<PlannedContent>('/api/v1/planner', { day: item.day, time: item.time, platform: item.platform, contentType: item.contentType, title: item.title }),
  deletePlannerItem: (id: string) => request<{ id: string }>(`/api/v1/planner/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getAlerts: () => request<AlertItem[]>('/api/v1/alerts'),
  dismissAlert: (id: string) => post<AlertItem>(`/api/v1/alerts/${encodeURIComponent(id)}/dismiss`),
};
