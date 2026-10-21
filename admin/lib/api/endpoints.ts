import type { AdminAuditEntry, AdminConnection, AdminSystem, MeResponse, SyncRun, User } from '@/types/api';
import { apiGet, apiRequest, apiSend } from './client';
export interface Page<T> { items: T[]; nextCursor: string | null; total?: number }
const page = async <T>(path: string, query: Record<string, string | number | undefined>): Promise<Page<T>> => {
  const { data, meta } = await apiRequest<T[]>(path, { query: { limit: 25, ...query } });
  return { items: data, nextCursor: meta?.nextCursor ?? null, total: meta?.total };
};
export const api = {
  login: (body: { email: string; password: string }) => apiSend<{ user: User }>('POST', '/auth/login', body),
  logout: () => apiSend<unknown>('POST', '/auth/logout'),
  me: () => apiGet<MeResponse>('/auth/me'),
  adminSystem: () => apiGet<AdminSystem>('/admin/system'),
  adminUsers: (q: { cursor?: string; search?: string }) => page<User>('/admin/users', q),
  adminSetRole: (id: string, role: 'user' | 'admin') => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/role`, { role }),
  adminSetStatus: (id: string, status: 'active' | 'disabled') => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/status`, { status }),
  adminAdjustCredits: (id: string, amount: number) => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/credits`, { amount }),
  adminConnections: (q: { cursor?: string; platform?: string; status?: string }) => page<AdminConnection>('/admin/connections', q),
  adminSyncConnection: (id: string) => apiSend<{ alreadyQueued: boolean }>('POST', `/admin/connections/${encodeURIComponent(id)}/sync`),
  adminSyncRuns: (q: { cursor?: string; platform?: string; status?: string }) => page<SyncRun>('/admin/sync-runs', q),
  adminAudit: (q: { cursor?: string }) => page<AdminAuditEntry>('/admin/audit-logs', q),
};
