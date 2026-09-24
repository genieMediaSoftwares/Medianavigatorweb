import { 
  NormalizedMedia, 
  PlatformConnection, 
  KeySignal, 
  Observation, 
  AIInsight, 
  Recommendation, 
  TrendItem, 
  PlannedContent, 
  AlertItem, 
  TimingSlot, 
  Workspace,
  PerformerAnalysis,
  PostAIDiagnosis
} from '../types';

export interface OverviewData {
  hasData?: boolean;
  message?: string;
  hero: {
    hasData?: boolean;
    heading: string;
    summary: string;
    badge: string;
    confidence: string;
  };
  signals: KeySignal[];
  observations: Observation[];
  connections: PlatformConnection[];
}

export interface TimingData {
  hasData?: boolean;
  message?: string;
  title: string;
  subtitle: string;
  strongestWindow: {
    label: string;
    timeSlot: string;
    confidence: string;
    supportingText: string;
  } | null;
  matrix: TimingSlot[];
}

export interface IntelligenceData {
  title: string;
  insights: AIInsight[];
}

export interface RecommendationsData {
  title: string;
  items: Recommendation[];
}

export interface TrendsData {
  title: string;
  trends: TrendItem[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `API error ${res.status}: ${res.statusText}`);
  }
  return json.data;
}

export const api = {
  getWorkspace: () => fetchJson<Workspace>('/api/v1/workspaces'),
  getOverview: () => fetchJson<OverviewData>('/api/v1/analytics/overview'),
  getConnections: () => fetchJson<PlatformConnection[]>('/api/v1/connections'),
  connectPlatform: (platform: string, credentials: any) =>
    fetchJson<PlatformConnection>(`/api/v1/connections/${platform}/connect`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  syncConnection: (platform: string) => 
    fetchJson<PlatformConnection>(`/api/v1/connections/${platform}/sync`, { method: 'POST' }),
  disconnectPlatform: (platform: string) => 
    fetchJson<PlatformConnection>(`/api/v1/connections/${platform}/disconnect`, { method: 'POST' }),
  toggleConnection: (platform: string) => 
    fetchJson<PlatformConnection>(`/api/v1/connections/${platform}/disconnect`, { method: 'POST' }),
  
  fetchYouTubeChannel: (params: { apiKey?: string; accessToken?: string; channelQuery?: string; channelId?: string }) =>
    fetchJson<{
      id: string;
      title: string;
      description: string;
      customUrl?: string;
      thumbnailUrl?: string;
      subscriberCount?: number;
      videoCount?: number;
      viewCount?: number;
      uploadsPlaylistId?: string;
    }>('/api/v1/youtube/fetch-channel', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getMedia: (platform?: string) => 
    fetchJson<NormalizedMedia[]>(`/api/v1/media${platform && platform !== 'all' ? `?platform=${platform}` : ''}`),
  getMediaById: (id: string) => fetchJson<NormalizedMedia>(`/api/v1/media/${id}`),

  getTiming: () => fetchJson<TimingData>('/api/v1/timing'),
  getIntelligence: () => fetchJson<IntelligenceData>('/api/v1/intelligence/signals'),
  getPerformers: (sortBy: string = 'views') => fetchJson<{ top: PerformerAnalysis[]; bottom: PerformerAnalysis[] }>(`/api/v1/intelligence/performers?sortBy=${sortBy}`),
  getContentPatterns: () => fetchJson<any[]>('/api/v1/intelligence/patterns'),
  getArchiveAudit: () => fetchJson<any>('/api/v1/intelligence/archive-audit'),
  
  askAI: (question: string) => 
    fetchJson<{
      answer: string;
      observedSignal: string;
      suggestedAction: string;
      source: 'Gemini 3.8 Flash' | 'Media Intelligence Engine';
    }>('/api/v1/intelligence/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  analyzeItemAI: (mediaId: string) =>
    fetchJson<{
      observedFact: string;
      possibleReason: string;
      actionableRecommendations: string[];
      confidence: 'High' | 'Medium';
      answeredBy: string;
    }>('/api/v1/intelligence/analyze-item', {
      method: 'POST',
      body: JSON.stringify({ mediaId }),
    }),

  diagnosePostAI: (mediaId: string) =>
    fetchJson<PostAIDiagnosis>('/api/v1/intelligence/diagnose-post', {
      method: 'POST',
      body: JSON.stringify({ mediaId }),
    }),

  getRecommendations: () => fetchJson<RecommendationsData>('/api/v1/recommendations'),
  planRecommendation: (id: string) => 
    fetchJson<PlannedContent>(`/api/v1/recommendations/${id}/plan`, { method: 'POST' }),

  getTrends: () => fetchJson<TrendsData>('/api/v1/trends'),

  getPlanner: () => fetchJson<PlannedContent[]>('/api/v1/planner'),
  addPlannerItem: (item: Omit<PlannedContent, 'id'>) => 
    fetchJson<PlannedContent>('/api/v1/planner', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  deletePlannerItem: (id: string) => 
    fetchJson<{ id: string }>(`/api/v1/planner/${id}`, { method: 'DELETE' }),

  getAlerts: () => fetchJson<AlertItem[]>('/api/v1/alerts'),
  dismissAlert: (id: string) => 
    fetchJson<AlertItem>(`/api/v1/alerts/${id}/dismiss`, { method: 'POST' }),
};
