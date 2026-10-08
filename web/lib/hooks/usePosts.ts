'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { qk } from '@/lib/queryKeys';
import type { PerformerSort, Platform } from '@/types/api';

export const POSTS_PAGE_SIZE = 24;

/** Posts for one channel (or all), 24 at a time, following the API cursor. */
export function usePostsFeed(platform: Platform | 'all') {
  return useInfiniteQuery({
    queryKey: [...qk.media(platform), 'feed'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.media({ platform: platform === 'all' ? undefined : platform, limit: POSTS_PAGE_SIZE, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}

/** Ranked best and weakest posts, ordered by the chosen measure. */
export const usePerformers = (sortBy: PerformerSort, enabled = true) =>
  useQuery({ queryKey: qk.performers(sortBy), queryFn: () => api.performers(sortBy), staleTime: 60_000, enabled });

/** One full post, for thumbnails and the detail drawer. */
export const useMediaItem = (id: string | null | undefined) =>
  useQuery({ queryKey: ['media-item', id] as const, queryFn: () => api.mediaItem(id as string), enabled: Boolean(id), staleTime: 60_000 });
