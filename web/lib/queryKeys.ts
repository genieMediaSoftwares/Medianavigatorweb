import type { Platform } from '@/types/api';

export const qk = {
  me: ['me'] as const,
  connections: ['connections'] as const,
  media: (platform: Platform | 'all') => ['media', platform] as const,
  summary: (platform: Platform | 'all', days: number) => ['summary', platform, days] as const,
  history: (platform: Platform | 'all') => ['history', platform] as const,
  overview: ['overview'] as const,
  timing: ['timing'] as const,
  signals: ['signals'] as const,
  performers: (sort: string) => ['performers', sort] as const,
  patterns: ['patterns'] as const,
  recommendations: ['recommendations'] as const,
  trends: ['trends'] as const,
  intelStatus: ['intelligence-status'] as const,
  planner: ['planner'] as const,
  plannerInsights: ['planner-insights'] as const,
  notifications: ['notifications'] as const,
  unread: ['unread'] as const,
  sessions: ['sessions'] as const,
  files: ['files'] as const,
};
