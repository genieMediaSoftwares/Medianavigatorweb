import type { Platform } from '@/types/api';

/** Every TanStack Query key in one place, so invalidation after a sync or an edit is predictable. */
export const qk = {
  me: ['me'] as const,
  status: ['status'] as const,
  connections: ['connections'] as const,
  syncRun: (id: string) => ['sync-run', id] as const,
  media: (platform: Platform | 'all') => ['media', platform] as const,
  mediaItem: (id: string) => ['media-item', id] as const,
  /** Everything derived from synced content; invalidated together when a sync finishes. */
  intelligence: ['intelligence'] as const,
  overview: ['intelligence', 'overview'] as const,
  summary: (platform: Platform | 'all', days: number) => ['intelligence', 'summary', platform, days] as const,
  history: (platform: Platform | 'all', days: number) => ['intelligence', 'history', platform, days] as const,
  timing: ['intelligence', 'timing'] as const,
  patterns: ['intelligence', 'patterns'] as const,
  archive: ['intelligence', 'archive'] as const,
  trends: ['intelligence', 'trends'] as const,
  recommendations: ['intelligence', 'recommendations'] as const,
  plannerInsights: ['intelligence', 'planner-insights'] as const,
  planner: ['planner'] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  sessions: ['sessions'] as const,
  files: ['files'] as const,
  admin: {
    system: ['admin', 'system'] as const,
    users: (search: string) => ['admin', 'users', search] as const,
    connections: (status: string, platform: string) => ['admin', 'connections', status, platform] as const,
    syncRuns: (status: string, platform: string) => ['admin', 'sync-runs', status, platform] as const,
    audit: (action: string) => ['admin', 'audit', action] as const,
  },
};
