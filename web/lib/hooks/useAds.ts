'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

/**
 * The posts that are running as a boost or an ad right now, so the post lists can mark them
 * beside Top performers and Opportunities. This is the light endpoint: it reads the saved ads
 * only, so the post page never waits for a ranking to be calculated.
 */
export function useBoostedMediaIds(): Set<string> | undefined {
  const q = useQuery({
    queryKey: ['instagram-ads', 'boosted-ids'],
    queryFn: () => apiGet<{ mediaIds: string[] }>('/intelligence/ads/boosted'),
    staleTime: 60_000,
    select: (data) => new Set(data?.mediaIds ?? []),
  });
  return q.data;
}
