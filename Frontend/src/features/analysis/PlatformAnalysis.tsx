import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PLATFORM_META } from '@/features/connections/platforms';
import { useSync } from '@/features/connections/useSync';
import { formatRelativeTime } from '@/lib/format';
import { useApiResource } from '@/hooks/useApiResource';
import type { Connection, MediaItem, Performer, PerformerSort, Platform } from '@/types/api';

import { fetchMediaPage, fetchPerformers, fetchSummary } from './api';
import { AnalysisPostCard, CardMetric } from './components';
import { cap, isUnavailable, isVideoType, plainComparison, sentence } from './wording';

// The three content options of a platform's analysis. Used by the Analysis tab and by
// /analysis/[platform] (Dashboard → View Analysis).

export type AnalysisTab = 'all' | 'top' | 'attention';
export const ANALYSIS_TABS = [
  { value: 'all', label: 'All Posts' },
  { value: 'top', label: 'Top Performing' },
  { value: 'attention', label: 'Needs Attention' },
] as const;

// Ranking options of the web Posts page (web/components/posts/posts-view.tsx).
const RANK_SORTS: { value: PerformerSort; label: string }[] = [
  { value: 'views', label: 'Most views' },
  { value: 'engagement', label: 'Best engagement' },
  { value: 'likes', label: 'Most likes' },
  { value: 'comments', label: 'Most comments' },
];


function useNav(platform: Platform) {
  const router = useRouter();
  return {
    deep: (id: string) => router.push({ pathname: '/analysis/deep/[id]', params: { id } }),
    why: (id: string, kind: 'top' | 'bottom', rank: string) => router.push({ pathname: '/analysis/why/[id]', params: { id, kind, rank, platform } }),
  };
}

/** Option 1: every synced post, page by page from GET /media. Action: Deep Analysis only. */
function AllPosts({ platform, connection, reloadKey, onSynced }: { platform: Platform; connection: Connection; reloadKey: number; onSynced?: () => void }) {
  const nav = useNav(platform);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }>({ kind: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const request = useRef(0);
  // "Sync now" uses the backend sync (POST /connections/:platform/sync) and reloads when the run ends.
  const sync = useSync(
    useCallback(() => {
      setRetryKey((k) => k + 1);
      onSynced?.();
    }, [onSynced]),
  );

  useEffect(() => {
    const id = ++request.current;
    fetchMediaPage(platform).then(
      (page) => {
        if (id !== request.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setState({ kind: 'ready' });
      },
      (e: unknown) => {
        if (id === request.current) setState({ kind: 'error', message: e instanceof Error ? e.message : 'Unable to load posts.' });
      },
    );
  }, [platform, reloadKey, retryKey]);

  const more = async () => {
    if (!cursor || loadingMore) return;
    const id = request.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await fetchMediaPage(platform, cursor);
      if (id !== request.current) return;
      setItems((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      if (id === request.current) setMoreError(e instanceof Error ? e.message : 'We couldn’t load more posts.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (state.kind === 'loading') return <LoadingState message="Loading posts…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={() => { setState({ kind: 'loading' }); setRetryKey((k) => k + 1); }} />;
  if (items.length === 0) return <EmptyState icon="images-outline" title="No posts yet" message="Your account is connected, but no posts have been imported yet. Sync it from the Dashboard to check again." />;

  const total = connection.dataPointsCount;
  // Instagram and YouTube report how many posts the profile has; compare it with what was synced.
  const reported = connection.accountInfo?.mediaCount;
  const syncing = sync.active.includes(platform);
  return (
    <View>
      <View className="mb-sm rounded-[12px] bg-neutral-50 p-md">
        <View className="flex-row items-center">
          <View className="flex-1 pr-sm">
            <Text className="text-[13px] font-semibold text-navy">
              {reported !== undefined ? `${total.toLocaleString()} of ${reported.toLocaleString()} profile posts synced` : `${total.toLocaleString()} posts synced`}
            </Text>
            <Text className="mt-[2px] text-[11px] text-neutral-500">{`Last synced ${formatRelativeTime(connection.lastSyncedAt || null)} · showing ${items.length.toLocaleString()}`}</Text>
          </View>
          <Button title={syncing ? 'Syncing…' : 'Sync now'} size="sm" variant="secondary" icon="refresh-outline" loading={syncing} onPress={() => void sync.start(platform)} />
        </View>
        {reported !== undefined && total < reported && !syncing ? (
          <Text className="mt-xs text-[11px] text-warning">{`${(reported - total).toLocaleString()} posts on the profile aren’t synced yet. Sync now to fetch them; posts the platform doesn’t share through its API (for example some stories or deleted posts) can’t be imported.`}</Text>
        ) : null}
        {sync.error ? <Text className="mt-xs text-[11px] text-danger">{sync.error}</Text> : null}
      </View>
      <View className="flex-row flex-wrap justify-between">
      {items.map((m) => {
        const video = isVideoType(m.contentType);
        const metric = (icon: CardMetric['icon'], label: string, key: 'views' | 'likes' | 'comments' | 'shares' | 'reach'): CardMetric => ({ icon, label, value: isUnavailable(m, key) ? null : m[key] });
        return (
          <AnalysisPostCard
            key={m.id}
            platform={m.platform}
            thumbnailUrl={m.thumbnailUrl}
            contentType={m.contentType}
            caption={m.title || m.caption}
            publishedAt={m.publishedAt}
            metrics={[
              metric('eye-outline', 'views', 'views'),
              metric('heart-outline', 'likes', 'likes'),
              metric('chatbubble-outline', 'comments', 'comments'),
              metric('arrow-redo-outline', 'shares', 'shares'),
              metric('people-outline', 'reach', 'reach'),
              // Engagement needs measured reach or views; the sync marks it unavailable otherwise.
              { icon: 'pulse-outline', label: 'eng.', value: [...m.unavailableMetrics, ...(m.missingMetrics ?? [])].includes('engagementRate') ? null : m.engagementRate, percent: true },
            ]}
            actions={[{ label: 'Deep Analysis', icon: video ? 'videocam-outline' : 'search-outline', primary: true, onPress: () => nav.deep(m.id) }]}
          />
        );
      })}
      </View>
      {cursor ? <Button title="Show more" variant="secondary" onPress={() => void more()} loading={loadingMore} /> : <Text className="py-sm text-center text-[12px] text-neutral-400">That’s every synced post.</Text>}
      {moreError ? <Notice variant="warning" message={moreError} /> : null}
    </View>
  );
}

/** Options 2 and 3: the server's ranked lists (GET /intelligence/performers), as on the web Posts page. */
function Ranked({ kind, platform, connection }: { kind: 'top' | 'bottom'; platform: Platform; connection: Connection }) {
  const nav = useNav(platform);
  const [sort, setSort] = useState<PerformerSort>('views');
  const fetcher = useCallback(() => Promise.all([fetchPerformers(sort), fetchSummary(platform)]), [sort, platform]);
  const { state, reload } = useApiResource(fetcher);
  const name = PLATFORM_META[platform].name;
  const notProvided = connection.capabilities?.unavailableMetrics ?? [];

  const metrics = (p: Performer): CardMetric[] => {
    const v = (key: 'views' | 'likes' | 'comments' | 'shares' | 'reach') => (notProvided.includes(key) ? null : p[key]);
    return [
      { icon: 'eye-outline', label: 'views', value: v('views') },
      { icon: 'heart-outline', label: 'likes', value: v('likes') },
      { icon: 'chatbubble-outline', label: 'comments', value: v('comments') },
      { icon: 'arrow-redo-outline', label: 'shares', value: v('shares') },
      { icon: 'people-outline', label: 'reach', value: v('reach') },
      { icon: 'pulse-outline', label: 'eng.', value: p.engagementRate, percent: true },
    ];
  };

  return (
    <View>
      <Text className="mb-sm text-[13px] text-neutral-500">
        {kind === 'top' ? 'These posts did better than your usual. See what they have in common and do more of it.' : 'Every account has quieter posts. These are the ones with the most room to grow, with an idea for each.'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        <Text className="mr-sm self-center text-[12px] font-semibold text-navy">Rank by</Text>
        {RANK_SORTS.map((s) => (
          <Pressable key={s.value} onPress={() => setSort(s.value)} accessibilityRole="radio" accessibilityState={{ selected: s.value === sort }} className={`mr-xs min-h-9 justify-center rounded-full px-md ${s.value === sort ? 'bg-navy' : 'bg-neutral-100'}`}>
            <Text className={`text-[12px] ${s.value === sort ? 'font-semibold text-white' : 'text-navy'}`}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {state.status === 'loading' ? (
        <LoadingState message="Ranking your posts…" />
      ) : state.status !== 'success' ? (
        <ErrorState message={state.message} onRetry={reload} />
      ) : (
        (() => {
          const [perf, summary] = state.data;
          const src = (kind === 'top' ? perf.top : perf.bottom).filter((p) => p.platform === platform);
          if (summary.insufficientHistory.includes(platform) || src.length === 0) {
            return (
              <EmptyState
                icon="albums-outline"
                title="We need a few more posts before we can say"
                message={`Once you have at least five posts on ${name}, we can show what is working and what could be better, compared with your own usual.`}
                compact
              />
            );
          }
          return (
            <View className="flex-row flex-wrap justify-between">
              {src.map((p, i) => {
            const video = isVideoType(p.contentType);
            return (
              <AnalysisPostCard
                key={p.id}
                platform={p.platform}
                thumbnailUrl={p.thumbnailUrl}
                contentType={p.contentType}
                caption={p.title || p.caption || ''}
                publishedAt={p.publishedAt}
                metrics={metrics(p)}
                badge={kind === 'top' ? { label: `#${i + 1} · Above usual`, tone: 'good' } : { label: `#${i + 1} · Below usual`, tone: 'warn' }}
                comparison={cap(sentence(plainComparison(p.baselineComparison)))}
                actions={[
                  { label: kind === 'top' ? 'Why Top?' : 'Why Bottom?', icon: 'help-circle-outline', onPress: () => nav.why(p.mediaId, kind, `#${i + 1} of ${src.length} by ${RANK_SORTS.find((r) => r.value === sort)?.label.toLowerCase() ?? sort}`) },
                  { label: 'Deep Analysis', icon: video ? 'videocam-outline' : 'search-outline', primary: true, onPress: () => nav.deep(p.mediaId) },
                ]}
              />
            );
              })}
            </View>
          );
        })()
      )}
    </View>
  );
}


/**
 * The selected option's list for one connected platform. All three stay mounted, so switching
 * options keeps each list and its place; `reloadKey` reloads them (pull to refresh).
 */
export function PlatformAnalysisLists({ platform, connection, tab, reloadKey, onSynced }: { platform: Platform; connection: Connection; tab: AnalysisTab; reloadKey: number; onSynced?: () => void }) {
  const importing = connection.status === 'syncing' || connection.status === 'connecting';
  return (
    <>
      {importing ? <Notice variant="info" title="Importing your posts" message={`${connection.dataPointsCount.toLocaleString()} posts synced so far. Pull down to refresh.`} /> : null}
      <View style={{ display: tab === 'all' ? 'flex' : 'none' }}>
        <AllPosts platform={platform} connection={connection} reloadKey={reloadKey} onSynced={onSynced} />
      </View>
      <View style={{ display: tab === 'top' ? 'flex' : 'none' }}>
        <Ranked key={`top${reloadKey}`} kind="top" platform={platform} connection={connection} />
      </View>
      <View style={{ display: tab === 'attention' ? 'flex' : 'none' }}>
        <Ranked key={`bottom${reloadKey}`} kind="bottom" platform={platform} connection={connection} />
      </View>
    </>
  );
}
