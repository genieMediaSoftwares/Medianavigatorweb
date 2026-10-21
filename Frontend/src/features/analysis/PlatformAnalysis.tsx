import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { useSync } from '@/features/connections/useSync';
import { formatRelativeTime } from '@/lib/format';
import { useApiResource } from '@/hooks/useApiResource';
import type { AccountScope, Connection, MediaItem, Performer, PerformerSort, Platform } from '@/types/api';

import { fetchMediaPage, fetchPerformers, fetchSummary } from './api';
import { AnalysisPostCard, CardMetric } from './components';
import { cap, isVideoType, plainComparison, sentence } from './wording';
import { facebookMetricLimitations, postMetricValue } from './post-metrics';
import { syncCoverage, syncCoverageText } from './syncCoverage';

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


function useNav(platform?: Platform) {
  const router = useRouter();
  return {
    deep: (id: string) => router.push({ pathname: '/analysis/deep/[id]', params: { id } }),
    why: (id: string, kind: 'top' | 'bottom', rank: string) => router.push({ pathname: '/analysis/why/[id]', params: { id, kind, rank, platform } }),
  };
}

/** Option 1: every synced post, page by page from GET /media, for one handle or all of them. Action: Deep Analysis. */
function AllPosts({ scope, connections, reloadKey, onSynced }: { scope: AccountScope; connections: Connection[]; reloadKey: string; onSynced?: () => void }) {
  const router = useRouter();
  const platform = scope === 'all' ? undefined : scope;
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
    return () => { request.current += 1; };
  }, [platform, reloadKey, retryKey]);
  const live = connections.filter((c) => c.connected && (scope === 'all' || c.platform === scope));

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

  const total = live.reduce((a, c) => a + c.dataPointsCount, 0);
  // One account: compare the profile's post count, what the API returned on the last sync and what is stored.
  const coverage = syncCoverageText(live.length === 1 ? syncCoverage(live[0]) : { kind: 'none' }, live.length === 1 ? live[0].name : '');
  const profile = live.length === 1 ? live[0].accountInfo : undefined;
  const audience = [
    typeof profile?.followersCount === 'number' ? `${profile.followersCount.toLocaleString()} followers` : null,
    typeof profile?.followsCount === 'number' ? `${profile.followsCount.toLocaleString()} following` : null,
  ].filter(Boolean).join(' · ');
  const syncing = platform ? sync.active.includes(platform) : sync.active.length > 0;
  const lastSynced = live.map((c) => c.lastSyncedAt).filter(Boolean).sort()[0] ?? null;
  // Permissions the last sync reported missing for metrics: the posts were read, but those numbers are unavailable.
  const metricGaps = [...new Set(live.flatMap((c) => (c.status === 'permission_required' ? [] : c.missingPermissions ?? [])))];
  return (
    <View>
      <View className="mb-sm rounded-[12px] bg-neutral-50 p-md">
        <View className="flex-row items-center">
          <View className="flex-1 pr-sm">
            <Text className="text-[13px] font-semibold text-navy">
              {coverage.headline ?? `${total.toLocaleString()} posts synced${live.length > 1 ? ` across ${live.length} accounts` : ''}`}
            </Text>
            <Text className="mt-[2px] text-[11px] text-neutral-500">{`${live.length > 1 ? 'Oldest sync' : 'Last synced'} ${formatRelativeTime(lastSynced)} · showing ${items.length.toLocaleString()}`}</Text>
            {audience ? <Text className="mt-[2px] text-[11px] text-neutral-500">{audience}</Text> : null}
          </View>
          <Button title={syncing ? 'Syncing…' : live.length > 1 ? 'Sync all' : 'Sync now'} size="sm" variant="secondary" icon="refresh-outline" loading={syncing} onPress={() => void sync.start(platform ?? 'all')} />
        </View>
        {coverage.note && !syncing ? (
          <Text className={`mt-xs text-[11px] ${coverage.attention ? 'text-warning' : 'text-neutral-500'}`}>{coverage.note}</Text>
        ) : null}
        {metricGaps.length && !syncing ? (
          <View className="mt-xs" style={{ gap: 6 }}>
            <Text className="text-[11px] text-warning">{`Meta denied access requiring ${metricGaps.join(' and ')} during the last sync. Reconnect to grant access, then sync again. Some metrics may also be unavailable for the post’s format.`}</Text>
            {live.some((c) => c.platform === 'facebook' && c.missingPermissions?.length) ? (
              <Text className="text-[11px] text-neutral-500">If Meta will not grant these permissions, resolve access in the Meta app dashboard first. Syncing again cannot unlock denied metrics, including when running locally.</Text>
            ) : null}
            {live.filter((c) => c.missingPermissions?.length).map((c) => (
              <Button key={c.platform} title={`Reconnect ${c.name}`} size="sm" variant="secondary" onPress={() => router.push({ pathname: '/connect/[platform]', params: { platform: c.platform, reconnect: '1' } })} />
            ))}
          </View>
        ) : null}
        {sync.error ? <Text className="mt-xs text-[11px] text-danger">{sync.error}</Text> : null}
      </View>
      <View className="flex-row flex-wrap justify-between">
      {items.map((m) => {
        const video = isVideoType(m.contentType);
        const metric = (icon: CardMetric['icon'], label: string, key: 'views' | 'likes' | 'comments' | 'shares' | 'reach'): CardMetric => ({ icon, label, value: postMetricValue(m, key) });
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
              metric('heart-outline', m.platform === 'facebook' ? 'reactions' : 'likes', 'likes'),
              metric('chatbubble-outline', 'comments', 'comments'),
              metric('arrow-redo-outline', 'shares', 'shares'),
              metric('people-outline', 'reach', 'reach'),
              ...(m.platform === 'facebook' && video ? [{ icon: 'time-outline' as const, label: 'watch time in minutes', decimals: 2, suffix: ' min', value: postMetricValue(m, 'watchTimeMinutes') }] : []),
              // Engagement needs measured reach or views; the sync marks it unavailable otherwise.
              { icon: 'pulse-outline', label: 'eng.', value: postMetricValue(m, 'engagementRate'), percent: true },
            ]}
            footnote={facebookMetricLimitations(m)}
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

/** One handle's ranked posts, compared only with that handle's own typical post (GET /intelligence/performers?platform=). */
function RankedPlatform({ kind, sort, platform, connection, limit, onOpen }: { kind: 'top' | 'bottom'; sort: PerformerSort; platform: Platform; connection: Connection; limit?: number; onOpen?: () => void }) {
  const nav = useNav(platform);
  const fetcher = useCallback(() => Promise.all([fetchPerformers(sort, platform), fetchSummary(platform)]), [sort, platform]);
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

  if (state.status === 'loading') return <LoadingState message={`Ranking your ${name} posts…`} />;
  if (state.status !== 'success') return <ErrorState message={state.message} onRetry={reload} />;
  const [perf, summary] = state.data;
  const all = kind === 'top' ? perf.top : perf.bottom;
  if (summary.insufficientHistory.includes(platform) || all.length === 0) {
    return (
      <EmptyState
        icon="albums-outline"
        title="We need a few more posts before we can say"
        message={`Once you have at least five posts on ${name}, we can show what is working and what could be better, compared with your own usual.`}
        compact
      />
    );
  }
  const shown = limit ? all.slice(0, limit) : all;
  const sortLabel = RANK_SORTS.find((r) => r.value === sort)?.label.toLowerCase() ?? sort;
  return (
    <View>
      <View className="flex-row flex-wrap justify-between">
        {shown.map((p, i) => {
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
                { label: kind === 'top' ? 'Why Top?' : 'Why Bottom?', icon: 'help-circle-outline', onPress: () => nav.why(p.mediaId, kind, `#${i + 1} of ${all.length} on ${name} by ${sortLabel}`) },
                { label: 'Deep Analysis', icon: video ? 'videocam-outline' : 'search-outline', primary: true, onPress: () => nav.deep(p.mediaId) },
              ]}
            />
          );
        })}
      </View>
      {limit && all.length > limit && onOpen ? <Button title={`See all ${all.length} on ${name}`} variant="secondary" size="sm" onPress={onOpen} /> : null}
    </View>
  );
}

/** Options 2 and 3. For all accounts, one section per handle: platforms are never ranked against each other. */
function Ranked({ kind, scope, connections, onScope }: { kind: 'top' | 'bottom'; scope: AccountScope; connections: Connection[]; onScope?: (s: AccountScope) => void }) {
  const [sort, setSort] = useState<PerformerSort>('views');
  const targets = PLATFORM_ORDER.filter((p) => connections.some((c) => c.platform === p && c.connected) && (scope === 'all' || p === scope));

  return (
    <View>
      <Text className="mb-sm text-[13px] text-neutral-500">
        {kind === 'top'
          ? 'These posts did better than your usual on that account. See what they have in common and do more of it.'
          : 'Every account has quieter posts. These are the ones with the most room to grow, compared with your usual on that account.'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
        <Text className="mr-sm self-center text-[12px] font-semibold text-navy">Rank by</Text>
        {RANK_SORTS.map((s) => (
          <Pressable key={s.value} onPress={() => setSort(s.value)} accessibilityRole="radio" accessibilityState={{ selected: s.value === sort }} className={`mr-xs min-h-9 justify-center rounded-full px-md ${s.value === sort ? 'bg-navy' : 'bg-neutral-100'}`}>
            <Text className={`text-[12px] ${s.value === sort ? 'font-semibold text-white' : 'text-navy'}`}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {targets.map((p) => {
        const connection = connections.find((c) => c.platform === p)!;
        return (
          <View key={p} className={scope === 'all' ? 'mb-lg' : ''}>
            {scope === 'all' ? (
              <View className="mb-sm flex-row items-center">
                <PlatformLogo platform={p} size={24} />
                <Text className="ml-sm text-title text-navy" accessibilityRole="header">{PLATFORM_META[p].name}</Text>
                <Text className="ml-xs flex-1 text-caption text-neutral-500" numberOfLines={1}>{connection.accountHandle}</Text>
              </View>
            ) : null}
            <RankedPlatform kind={kind} sort={sort} platform={p} connection={connection} limit={scope === 'all' ? 4 : undefined} onOpen={onScope ? () => onScope(p) : undefined} />
          </View>
        );
      })}
    </View>
  );
}


/**
 * The selected option's list for one connected platform. All three stay mounted, so switching
 * options keeps each list and its place; `reloadKey` reloads them (pull to refresh).
 */
export function PlatformAnalysisLists({ scope, connections, tab, reloadKey, onSynced, onScope }: {
  /** One platform's handle, or every connected account. */
  scope: AccountScope;
  connections: Connection[];
  tab: AnalysisTab;
  reloadKey: number;
  onSynced?: () => void;
  /** Lets the all-accounts view jump to one handle. */
  onScope?: (s: AccountScope) => void;
}) {
  const [focusVersion, setFocusVersion] = useState(0);
  useFocusEffect(useCallback(() => {
    // Stack screens stay mounted: reload after returning from a connection or analysis screen.
    setFocusVersion((version) => version + 1);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setFocusVersion((version) => version + 1);
        onSynced?.();
      }
    });
    onSynced?.();
    return () => subscription.remove();
  }, [onSynced]));
  // Connection refreshes can reveal a sync completed on the dashboard or website.
  const syncVersion = connections.filter((c) => scope === 'all' || c.platform === scope)
    .map((c) => `${c.platform}:${c.lastSyncedAt ?? ''}`).join('|');
  const dataVersion = `${reloadKey}:${focusVersion}:${syncVersion}`;
  const importing = connections.filter((c) => c.connected && (scope === 'all' || c.platform === scope) && (c.status === 'syncing' || c.status === 'connecting'));
  return (
    <>
      {importing.map((c) => (
        <Notice key={c.platform} variant="info" title={`Importing your ${c.name} posts`} message={`${c.dataPointsCount.toLocaleString()} posts synced so far. Pull down to refresh.`} />
      ))}
      <View style={{ display: tab === 'all' ? 'flex' : 'none' }}>
        <AllPosts scope={scope} connections={connections} reloadKey={dataVersion} onSynced={onSynced} />
      </View>
      <View style={{ display: tab === 'top' ? 'flex' : 'none' }}>
        <Ranked key={`top${dataVersion}`} kind="top" scope={scope} connections={connections} onScope={onScope} />
      </View>
      <View style={{ display: tab === 'attention' ? 'flex' : 'none' }}>
        <Ranked key={`bottom${dataVersion}`} kind="bottom" scope={scope} connections={connections} onScope={onScope} />
      </View>
    </>
  );
}
