import { apiRequest } from '@/lib/api/client';
import type { Connection, HistorySnapshot, Platform } from '@/types/api';

import { fetchConnections } from './api';
import type { PlatformCardMetrics } from './PlatformDashboardCard';

/** The newest daily snapshot for one platform, or null before its first completed sync. */
async function fetchLatestSnapshot(platform: Platform): Promise<HistorySnapshot | null> {
  const rows = await apiRequest<HistorySnapshot[]>('/intelligence/history', { auth: true, query: { platform, limit: 1 } });
  return rows[0] ?? null;
}

export interface DashboardData {
  connections: Connection[];
  metrics: Partial<Record<Platform, PlatformCardMetrics>>;
}

/**
 * Connection state for every platform, plus each connected account's numbers:
 * posts = items stored for the account; views and engagement = the latest post-sync snapshot.
 * A metric the platform does not provide stays null ("Not available"), never 0.
 */
export async function fetchDashboard(): Promise<DashboardData> {
  const connections = await fetchConnections();
  const connected = connections.filter((c) => c.connected);
  const snapshots = await Promise.all(connected.map((c) => fetchLatestSnapshot(c.platform)));

  const metrics: DashboardData['metrics'] = {};
  connected.forEach((connection, index) => {
    const snapshot = snapshots[index];
    // Not available when the platform never provides views, or when no synced post had them (e.g. Facebook without
    // read_insights). Snapshots older than the measured counts (null) fall back to the post count.
    const viewsUnavailable = (connection.capabilities?.unavailableMetrics.includes('views') ?? false) || snapshot?.viewsMeasured === 0;
    const engagementMeasured = snapshot ? snapshot.engagementMeasured ?? snapshot.contentCount : 0;
    metrics[connection.platform] = {
      totalPosts: connection.dataPointsCount,
      totalViews: snapshot && !viewsUnavailable ? snapshot.totalViews : null,
      engagementRate: snapshot && engagementMeasured > 0 ? snapshot.medianEngagementRate : null,
    };
  });
  return { connections, metrics };
}
