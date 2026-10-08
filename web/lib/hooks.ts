'use client';

import { useQuery } from '@tanstack/react-query';
import { markLeavingSession } from '@/lib/api/client';
import { connectionsApi, intelligenceApi, authApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import type { Connection, Platform } from '@/types/api';

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: authApi.me, staleTime: 5 * 60_000 });
}

const importing = (c: Connection) => c.status === 'syncing' || c.status === 'connecting';

/** Connections; re-checked every few seconds while any account is still importing. */
export function useConnections() {
  return useQuery({
    queryKey: qk.connections,
    queryFn: connectionsApi.list,
    refetchInterval: (q) => (q.state.data?.some(importing) ? 5000 : false),
  });
}

export const connectedOnly = (list: Connection[] | undefined) => (list ?? []).filter((c) => c.connected);

export function useServiceStatus() {
  return useQuery({ queryKey: qk.status, queryFn: intelligenceApi.status, staleTime: 10 * 60_000 });
}

export function useSummary(platform: Platform | 'all', days: number) {
  return useQuery({
    queryKey: qk.summary(platform, days),
    queryFn: () => intelligenceApi.summary({ platform: platform === 'all' ? undefined : platform, days }),
  });
}

/**
 * Navigates after a session starts or ends, with one full page load. That drops every cached query and mounted
 * component from the previous session at once, so nothing from one account can show for another, and requests still
 * in flight with the old cookies can't trigger a second, competing navigation.
 */
export function useSessionNavigate() {
  return (to: string) => {
    markLeavingSession();
    window.location.replace(new URL(to, window.location.origin).href);
  };
}
