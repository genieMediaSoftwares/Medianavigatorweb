import type {
  AdminAuditEntry, AdminConnection, AdminSystem, AnalyzeItemResult, AskResult, CompareResult, Connection, ConnectInput, ConnectResult, DiagnosePostResult,
  FileItem, HistoryPoint, IntelligenceStatus, MediaItem, MeResponse, NotificationItem, Overview, PageMeta, PatternRow, PerformerSort, PerformersResponse, Platform,
  PlannedItem, PlannerInsights, Profile, RecommendationsResponse, SessionInfo, SignalsResponse, Summary, SyncResult, SyncRun, Timing, TrendsResponse, User,
  VideoAnalysisResult, Weekday,
} from '@/types/api';
import { apiGet, apiRequest, apiSend } from './client';

export interface Page<T> { items: T[]; nextCursor: string | null; total?: number }
const page = async <T>(path: string, query: Record<string, string | number | undefined>): Promise<Page<T>> => {
  const { data, meta } = await apiRequest<T[]>(path, { query });
  const m: PageMeta | undefined = meta;
  return { items: data, nextCursor: m?.nextCursor ?? null, total: m?.total };
};

export const api = {
  // auth
  login: (b: { email: string; password: string }) => apiSend<{ user: User }>('POST', '/auth/login', b),
  register: (b: { email: string; password: string; fullName: string; organization?: string; accountType?: string }) => apiSend<{ user: User; profile: Profile }>('POST', '/auth/register', b),
  logout: () => apiSend<unknown>('POST', '/auth/logout'),
  logoutAll: () => apiSend<unknown>('POST', '/auth/logout-all'),
  me: () => apiGet<MeResponse>('/auth/me'),
  changePassword: (b: { currentPassword: string; newPassword: string }) => apiSend<unknown>('POST', '/auth/change-password', b),
  forgotPassword: (b: { email: string }) => apiSend<unknown>('POST', '/auth/forgot-password', b),
  resetPassword: (b: { token: string; newPassword: string }) => apiSend<unknown>('POST', '/auth/reset-password', b),

  // profile & sessions
  updateProfile: (b: Partial<{ fullName: string; organization: string; accountType: string; timezone: string; onboardingCompleted: boolean }>) => apiSend<{ profile: Profile }>('PATCH', '/profiles/me', b),
  sessions: () => apiGet<{ sessions: SessionInfo[] }>('/users/me/sessions'),
  revokeSession: (id: string) => apiSend<unknown>('DELETE', `/users/me/sessions/${encodeURIComponent(id)}`),
  deleteAccount: (password: string) => apiSend<unknown>('DELETE', '/users/me', { password }),

  // connections
  connections: () => apiGet<Connection[]>('/connections'),
  startOAuth: (p: Platform) => apiSend<{ authorizeUrl: string }>('POST', `/connections/${p}/oauth/start`),
  connect: (p: Platform, b: ConnectInput) => apiSend<ConnectResult>('POST', `/connections/${p}/connect`, b),
  sync: (p: Platform) => apiSend<SyncResult>('POST', `/connections/${p}/sync`),
  syncAll: () => apiSend<{ syncRuns: SyncRun[] }>('POST', '/connections/sync-all'),
  syncRun: (id: string) => apiGet<SyncRun>(`/connections/sync-runs/${encodeURIComponent(id)}`),
  disconnect: (p: Platform) => apiSend<unknown>('POST', `/connections/${p}/disconnect`),

  // media
  media: (q: { platform?: Platform | 'all'; limit?: number; cursor?: string }) => page<MediaItem>('/media', { platform: q.platform, limit: q.limit, cursor: q.cursor }),
  mediaItem: (id: string) => apiGet<MediaItem>(`/media/${encodeURIComponent(id)}`),

  // intelligence
  summary: (q: { platform?: Platform; days: number }) => apiGet<Summary>('/intelligence/summary', q),
  history: (q: { platform?: Platform; limit?: number }) => apiGet<HistoryPoint[]>('/intelligence/history', q),
  overview: () => apiGet<Overview>('/intelligence/overview'),
  timing: () => apiGet<Timing>('/intelligence/timing'),
  signals: () => apiGet<SignalsResponse>('/intelligence/signals'),
  performers: (sortBy: PerformerSort) => apiGet<PerformersResponse>('/intelligence/performers', { sortBy }),
  patterns: () => apiGet<PatternRow[]>('/intelligence/patterns'),
  recommendations: () => apiGet<RecommendationsResponse>('/intelligence/recommendations'),
  trends: () => apiGet<TrendsResponse>('/intelligence/trends'),
  intelligenceStatus: () => apiGet<IntelligenceStatus>('/intelligence/status'),
  ask: (question: string) => apiSend<AskResult>('POST', '/intelligence/ask', { question }),
  analyzeItem: (mediaId: string) => apiSend<AnalyzeItemResult>('POST', '/intelligence/analyze-item', { mediaId }),
  diagnosePost: (mediaId: string) => apiSend<DiagnosePostResult>('POST', '/intelligence/diagnose-post', { mediaId }),
  analyzeVideo: (mediaId: string) => apiSend<VideoAnalysisResult>('POST', '/intelligence/analyze-video', { mediaId }),
  compare: (mediaIdA: string, mediaIdB: string) => apiSend<CompareResult>('POST', '/intelligence/compare', { mediaIdA, mediaIdB }),

  // planner
  planner: () => apiGet<PlannedItem[]>('/planner'),
  plannerInsights: () => apiGet<PlannerInsights>('/planner/insights'),
  addPlanned: (b: { day: Weekday; time: string; platform: Platform; contentType?: string; title: string }) => apiSend<PlannedItem>('POST', '/planner', b),
  removePlanned: (id: string) => apiSend<unknown>('DELETE', `/planner/${encodeURIComponent(id)}`),
  planRecommendation: (id: string, slot?: { day?: string; time?: string }) => apiSend<unknown>('POST', `/recommendations/${encodeURIComponent(id)}/plan`, slot ?? {}),

  // notifications
  notifications: (q: { cursor?: string; unreadOnly?: boolean } = {}) => page<NotificationItem>('/notifications', { cursor: q.cursor, limit: 25, unreadOnly: q.unreadOnly ? 'true' : undefined }),
  unreadCount: () => apiGet<{ unread: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiSend<unknown>('POST', `/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => apiSend<unknown>('POST', '/notifications/read-all'),

  // files
  files: (q: { cursor?: string } = {}) => page<FileItem>('/files', { cursor: q.cursor, limit: 25 }),
  file: (id: string) => apiGet<FileItem>(`/files/${encodeURIComponent(id)}`),
  uploadFile: (file: File, purpose: string) => { const f = new FormData(); f.append('purpose', purpose); f.append('file', file); return apiRequest<FileItem>('/files', { method: 'POST', body: f }).then((r) => r.data); },
  deleteFile: (id: string) => apiSend<unknown>('DELETE', `/files/${encodeURIComponent(id)}`),

  // admin
  adminSystem: () => apiGet<AdminSystem>('/admin/system'),
  adminUsers: (q: { cursor?: string; search?: string }) => page<User>('/admin/users', { limit: 25, cursor: q.cursor, search: q.search }),
  adminSetRole: (id: string, role: 'user' | 'admin') => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/role`, { role }),
  adminSetStatus: (id: string, status: 'active' | 'disabled') => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/status`, { status }),
  adminConnections: (q: { cursor?: string }) => page<AdminConnection>('/admin/connections', { limit: 25, cursor: q.cursor }),
  adminSyncConnection: (id: string) => apiSend<{ alreadyQueued: boolean }>('POST', `/admin/connections/${encodeURIComponent(id)}/sync`),
  adminSyncRuns: (q: { cursor?: string }) => page<SyncRun>('/admin/sync-runs', { limit: 25, cursor: q.cursor }),
  adminAudit: (q: { cursor?: string }) => page<AdminAuditEntry>('/admin/audit-logs', { limit: 25, cursor: q.cursor }),
};
