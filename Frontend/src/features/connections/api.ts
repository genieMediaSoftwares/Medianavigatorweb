import { apiRequest } from '@/lib/api/client';
import type { Connection, ConnectInput, ConnectResult, Platform, SyncResult, SyncRun } from '@/types/api';

/** All four platforms, connected or not, with live sync state. */
export function fetchConnections(): Promise<Connection[]> {
  return apiRequest<Connection[]>('/connections', { auth: true });
}

/** Validates the credentials with the provider, stores them encrypted and queues the first sync. */
export function connectPlatform(platform: Platform, input: ConnectInput): Promise<ConnectResult> {
  return apiRequest<ConnectResult>(`/connections/${platform}/connect`, { method: 'POST', auth: true, json: input });
}

/** Provider sign-in URL; only offered when the connection reports `oauthAvailable`. */
export function startOAuth(platform: Platform): Promise<{ authorizeUrl: string }> {
  return apiRequest(`/connections/${platform}/oauth/start`, { method: 'POST', auth: true });
}

export function syncPlatform(platform: Platform): Promise<SyncResult> {
  return apiRequest<SyncResult>(`/connections/${platform}/sync`, { method: 'POST', auth: true });
}

export function syncAllPlatforms(): Promise<{ syncRuns: SyncRun[] }> {
  return apiRequest('/connections/sync-all', { method: 'POST', auth: true });
}

export function fetchSyncRun(id: string): Promise<SyncRun> {
  return apiRequest<SyncRun>(`/connections/sync-runs/${encodeURIComponent(id)}`, { auth: true });
}

/** Wipes stored credentials and stops syncing; synced history is kept. */
export function disconnectPlatform(platform: Platform): Promise<unknown> {
  return apiRequest(`/connections/${platform}/disconnect`, { method: 'POST', auth: true });
}
