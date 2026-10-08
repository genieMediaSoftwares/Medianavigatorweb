'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { qk } from '@/lib/queryKeys';
import type { Platform } from '@/types/api';

type Opts<T> = Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>;

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.me, staleTime: 60_000 });
export const useConnections = (opts?: Opts<Awaited<ReturnType<typeof api.connections>>>) => useQuery({ queryKey: qk.connections, queryFn: api.connections, staleTime: 30_000, ...opts });
export const useSummary = (platform: Platform | 'all', days: number) => useQuery({ queryKey: qk.summary(platform, days), queryFn: () => api.summary({ platform: platform === 'all' ? undefined : platform, days }), staleTime: 60_000 });
export const useOverview = () => useQuery({ queryKey: qk.overview, queryFn: api.overview, staleTime: 60_000 });
export const useTiming = () => useQuery({ queryKey: qk.timing, queryFn: api.timing, staleTime: 60_000 });
export const useUnreadCount = () => useQuery({ queryKey: qk.unread, queryFn: api.unreadCount, refetchInterval: 60_000, staleTime: 30_000 });
export const useIntelStatus = () => useQuery({ queryKey: qk.intelStatus, queryFn: api.intelligenceStatus, staleTime: 300_000 });

/** Retry only network/5xx failures; never retry auth, permission, validation or rate-limit answers. */
export function shouldRetry(count: number, error: unknown): boolean {
  if (count >= 2) return false;
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  return false;
}
