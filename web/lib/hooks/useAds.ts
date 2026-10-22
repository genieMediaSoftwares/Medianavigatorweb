'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { InstagramAdsPage } from '../../../shared/instagramAds';

/**
 * The posts that are running as a boost or an ad right now, so the post lists can mark them
 * beside Top performers and Opportunities.
 */
export function useBoostedMediaIds(): Set<string> | undefined {
  const q = useQuery({
    queryKey: ['instagram-ads', 'all'],
    queryFn: () => apiGet<InstagramAdsPage>('/intelligence/ads', { category: 'all' }),
    staleTime: 60_000,
    select: (data) => new Set(data?.boostedMediaIds ?? []),
  });
  return q.data;
}
