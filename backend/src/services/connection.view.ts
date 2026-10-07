import type { PlatformConnection, PlatformType, ConnectionStatus } from '../../../shared/types.js';
import type { ConnectedAccountDoc } from '../models/ConnectedAccount.js';
import { PLATFORMS, getAdapter } from '../integrations/registry.js';

const META: Record<PlatformType, { name: string; strength: string }> = {
  instagram: { name: 'Instagram', strength: 'Visual & short-form media' },
  facebook: { name: 'Facebook', strength: 'Community & page engagement' },
  youtube: { name: 'YouTube', strength: 'Video retention & search discoverability' },
  linkedin: { name: 'LinkedIn', strength: 'Professional network distribution' },
};

function statusOf(a?: ConnectedAccountDoc): ConnectionStatus {
  if (!a || a.status === 'disconnected') return 'not_connected';
  return a.status;
}

/**
 * Client-facing connection state. Never includes credentials. `lastSyncedAt` is an ISO-8601 UTC timestamp (or ''),
 * `sync` carries what a UI needs to show Connected / Syncing / Synced / Sync failed / Disconnected truthfully.
 */
export function toPlatformConnection(platform: PlatformType, a?: ConnectedAccountDoc): PlatformConnection & { sync: Record<string, unknown>; capabilities: unknown } {
  const live = Boolean(a && a.active);
  const status = statusOf(a);
  return {
    platform,
    name: META[platform].name,
    accountHandle: live ? a!.handle : 'Not connected',
    avatarUrl: live ? a!.avatarUrl : undefined,
    connected: live,
    lastSyncedAt: live && a!.lastSyncedAt ? a!.lastSyncedAt.toISOString() : '',
    status,
    statusMessage: a?.statusMessage ?? `Connect ${META[platform].name} to start analyzing your media.`,
    primaryStrength: META[platform].strength,
    dataPointsCount: live ? a!.dataPointsCount : 0,
    missingPermissions: live ? a!.missingPermissions : undefined,
    accountInfo: live ? a!.accountInfo : undefined,
    sync: {
      state: !live ? 'disconnected' : status === 'syncing' || status === 'connecting' ? 'syncing' : status === 'sync_failed' ? 'failed' : status === 'sync_complete' ? 'synced' : status,
      lastSyncedAt: live && a!.lastSyncedAt ? a!.lastSyncedAt.toISOString() : null,
      nextSyncAt: live && a!.nextSyncAt ? a!.nextSyncAt.toISOString() : null,
      lastError: live ? a!.lastSyncError ?? null : null,
    },
    capabilities: getAdapter(platform).capabilities,
  };
}

export function toPlatformConnections(accounts: ConnectedAccountDoc[]) {
  return PLATFORMS.map((p) => toPlatformConnection(p, accounts.find((a) => a.platform === p)));
}
