/** One typed function per API endpoint used by the web app (docs/api.md). */
import { api, apiPage, apiVoid } from './client';
import * as s from './schemas';
import type { Platform, Weekday } from '@/types/api';

const enc = encodeURIComponent;

export const authApi = {
  login: (body: { email: string; password: string }) => api('/auth/login', s.signInResultSchema, { method: 'POST', body, signOutOn401: false }),
  register: (body: { email: string; password: string; fullName: string; organization?: string; accountType?: string }) =>
    api('/auth/register', s.signInResultSchema, { method: 'POST', body, signOutOn401: false }),
  logout: () => apiVoid('/auth/logout', { method: 'POST', signOutOn401: false }),
  logoutAll: () => apiVoid('/auth/logout-all', { method: 'POST', signOutOn401: false }),
  me: () => api('/auth/me', s.meSchema),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiVoid('/auth/change-password', { method: 'POST', body, signOutOn401: false }),
  forgotPassword: (body: { email: string }) => apiVoid('/auth/forgot-password', { method: 'POST', body, signOutOn401: false }),
  resetPassword: (body: { token: string; newPassword: string }) => apiVoid('/auth/reset-password', { method: 'POST', body, signOutOn401: false }),
};

export type ProfilePatch = { fullName?: string; organization?: string; accountType?: string; timezone?: string; onboardingCompleted?: boolean };

export const usersApi = {
  updateProfile: (body: ProfilePatch) => api('/profiles/me', s.profileUpdateResultSchema, { method: 'PATCH', body }),
  sessions: () => api('/users/me/sessions', s.sessionsSchema),
  revokeSession: (id: string) => apiVoid(`/users/me/sessions/${enc(id)}`, { method: 'DELETE' }),
  deleteAccount: (password: string) => apiVoid('/users/me', { method: 'DELETE', body: { password }, signOutOn401: false }),
};

export type ConnectBody = {
  accessToken?: string; apiKey?: string; accountId?: string; pageId?: string; channelId?: string; channelQuery?: string; organizationId?: string;
};

export const connectionsApi = {
  list: () => api('/connections', s.connectionsSchema),
  oauthStart: (p: Platform) => api(`/connections/${p}/oauth/start`, s.oauthStartSchema, { method: 'POST' }),
  connect: (p: Platform, body: ConnectBody) => api(`/connections/${p}/connect`, s.connectResultSchema, { method: 'POST', body }),
  sync: (p: Platform) => api(`/connections/${p}/sync`, s.syncResultSchema, { method: 'POST' }),
  syncAll: () => api('/connections/sync-all', s.syncAllResultSchema, { method: 'POST' }),
  syncRun: (id: string) => api(`/connections/sync-runs/${enc(id)}`, s.syncRunSchema),
  disconnect: (p: Platform) => apiVoid(`/connections/${p}/disconnect`, { method: 'POST' }),
};

export const mediaApi = {
  page: (q: { platform?: Platform; cursor?: string; limit: number }) => apiPage('/media', s.mediaSchema, { query: q }),
  get: (id: string) => api(`/media/${enc(id)}`, s.mediaSchema),
};

export const intelligenceApi = {
  status: () => api('/intelligence/status', s.statusSchema),
  overview: () => api('/intelligence/overview', s.overviewSchema),
  summary: (q: { platform?: Platform; days: number }) => api('/intelligence/summary', s.summarySchema, { query: q }),
  history: (q: { platform?: Platform; from?: string; to?: string; limit: number }) => api('/intelligence/history', s.historySchema, { query: q }),
  timing: () => api('/intelligence/timing', s.timingSchema),
  patterns: () => api('/intelligence/patterns', s.patternsSchema),
  archive: () => api('/intelligence/archive-audit', s.archiveSchema),
  recommendations: () => api('/intelligence/recommendations', s.recommendationsSchema),
  trends: () => api('/intelligence/trends', s.trendsSchema),
  ask: (question: string) => api('/intelligence/ask', s.askResultSchema, { method: 'POST', body: { question } }),
  diagnose: (mediaId: string) => api('/intelligence/diagnose-post', s.diagnosisSchema, { method: 'POST', body: { mediaId } }),
  analyzeVideo: (mediaId: string) => api('/intelligence/analyze-video', s.videoAnalysisSchema, { method: 'POST', body: { mediaId } }),
  compare: (mediaIdA: string, mediaIdB: string) => api('/intelligence/compare', s.compareSchema, { method: 'POST', body: { mediaIdA, mediaIdB } }),
};

export const plannerApi = {
  list: () => api('/planner', s.plannerSchema),
  insights: () => api('/planner/insights', s.plannerInsightsSchema),
  add: (body: { day: Weekday; time: string; platform: Platform; contentType?: string; title: string }) =>
    api('/planner', s.plannedItemSchema, { method: 'POST', body }),
  remove: (id: string) => apiVoid(`/planner/${enc(id)}`, { method: 'DELETE' }),
  planRecommendation: (id: string, body: { day?: Weekday; time?: string }) =>
    api(`/recommendations/${enc(id)}/plan`, s.plannedItemSchema, { method: 'POST', body }),
};

export const notificationsApi = {
  page: (q: { cursor?: string; limit: number; unreadOnly?: boolean }) => apiPage('/notifications', s.notificationSchema, { query: q }),
  unreadCount: () => api('/notifications/unread-count', s.unreadCountSchema),
  markRead: (id: string) => api(`/notifications/${enc(id)}/read`, s.notificationSchema, { method: 'POST' }),
  markAllRead: () => apiVoid('/notifications/read-all', { method: 'POST' }),
  dismissAlert: (id: string) => apiVoid(`/alerts/${enc(id)}/dismiss`, { method: 'POST' }),
};

export const filesApi = {
  page: (q: { cursor?: string; limit: number }) => apiPage('/files', s.fileSchema, { query: q }),
  upload: (file: File, purpose: 'avatar' | 'media' | 'document') => {
    const form = new FormData();
    form.set('purpose', purpose);
    form.set('file', file);
    return api('/files', s.fileSchema, { method: 'POST', body: form });
  },
  access: (id: string) => api(`/files/${enc(id)}`, s.fileAccessSchema),
  remove: (id: string) => apiVoid(`/files/${enc(id)}`, { method: 'DELETE' }),
};

export const adminApi = {
  system: () => api('/admin/system', s.adminSystemSchema),
  users: (q: { cursor?: string; limit: number; search?: string }) => apiPage('/admin/users', s.userSchema, { query: q }),
  setRole: (id: string, role: 'user' | 'admin') => api(`/admin/users/${enc(id)}/role`, s.userSchema, { method: 'PATCH', body: { role } }),
  setStatus: (id: string, status: 'active' | 'disabled') => api(`/admin/users/${enc(id)}/status`, s.userSchema, { method: 'PATCH', body: { status } }),
  connections: (q: { cursor?: string; limit: number; status?: string; platform?: Platform }) => apiPage('/admin/connections', s.adminAccountSchema, { query: q }),
  syncConnection: (id: string) => api(`/admin/connections/${enc(id)}/sync`, s.syncResultSchema, { method: 'POST' }),
  syncRuns: (q: { cursor?: string; limit: number; status?: string; platform?: Platform }) => apiPage('/admin/sync-runs', s.syncRunSchema, { query: q }),
  audit: (q: { cursor?: string; limit: number; action?: string }) => apiPage('/admin/audit-logs', s.auditEntrySchema, { query: q }),
};
