import type { AdminAuditEntry, AdminConnection, AdminSystem, AdminUserDetail, AdminSyncRun, CreditLedgerEntry, MeResponse, User, Role } from '@/types/api';
import { apiGet, apiRequest, apiSend } from './client';
export interface Page<T> { items: T[]; nextCursor: string | null; total?: number }
const page = async <T>(path: string, query: Record<string, string | number | undefined>): Promise<Page<T>> => {
  const { data, meta } = await apiRequest<T[]>(path, { query: { limit: 25, ...query } });
  return { items: data, nextCursor: meta?.nextCursor ?? null, total: meta?.total };
};
export const api = {
  reauth: (body: { password: string; mfaCode?: string; recoveryCode?: string }) => apiSend<{ reauthenticated: true; validForSeconds: number }>('POST', '/auth/reauth', body),
  mfaStatus: () => apiGet<{ enabled: boolean; enabledAt: string | null; recoveryCodesRemaining: number; available: boolean; required: boolean }>('/auth/mfa'),
  mfaSetup: (password: string) => apiSend<{ secret: string; otpauthUrl: string }>('POST', '/auth/mfa/setup', { password }),
  mfaEnable: (mfaCode: string) => apiSend<{ enabled: true; recoveryCodes: string[] }>('POST', '/auth/mfa/enable', { mfaCode }),
  mfaDisable: (body: { password: string; mfaCode?: string; recoveryCode?: string }) => apiSend<{ enabled: false }>('POST', '/auth/mfa/disable', body),
  mfaRecoveryCodes: (body: { password: string; mfaCode?: string; recoveryCode?: string }) => apiSend<{ recoveryCodes: string[] }>('POST', '/auth/mfa/recovery-codes', body),
  adminResetMfa: (id: string) => apiSend<{ reset: true }>('POST', `/admin/users/${encodeURIComponent(id)}/mfa/reset`),
  login: (body: { email: string; password: string; mfaCode?: string; recoveryCode?: string }) => apiSend<{ user: User }>('POST', '/auth/login', body),
  logout: () => apiSend<unknown>('POST', '/auth/logout'),
  me: () => apiGet<MeResponse>('/auth/me'),
  adminSystem: () => apiGet<AdminSystem>('/admin/system'),
  adminUsers: (q: { cursor?: string; search?: string }) => page<User>('/admin/users', q),
  adminUser: (id: string) => apiGet<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`),
  adminSetRole: (id: string, role: Role) => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/role`, { role }),
  adminSetStatus: (id: string, status: 'active' | 'disabled') => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/status`, { status }),
  adminAdjustCredits: (id: string, amount: number, reason?: string) => apiSend<User>('PATCH', `/admin/users/${encodeURIComponent(id)}/credits`, { amount, ...(reason ? { reason } : {}) }),
  adminCreditLedger: (id: string, q: { cursor?: string }) => page<CreditLedgerEntry>(`/admin/users/${encodeURIComponent(id)}/credit-ledger`, q),
  adminConnections: (q: { cursor?: string; platform?: string; status?: string }) => page<AdminConnection>('/admin/connections', q),
  adminSyncConnection: (id: string) => apiSend<{ alreadyQueued: boolean }>('POST', `/admin/connections/${encodeURIComponent(id)}/sync`),
  adminSyncRuns: (q: { cursor?: string; platform?: string; status?: string }) => page<AdminSyncRun>('/admin/sync-runs', q),
  adminAudit: (q: { cursor?: string }) => page<AdminAuditEntry>('/admin/audit-logs', q),
};
