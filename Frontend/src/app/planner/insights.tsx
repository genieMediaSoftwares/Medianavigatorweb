import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { BulletList, Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { fetchConnections } from '@/features/connections/api';
import { PlatformPicker } from '@/features/connections/PlatformPicker';
import { isPlatform, PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { fetchBestTimes } from '@/features/planner/api';
import { BestTimeCard } from '@/features/planner/components/BestTimeCard';
import { HourlyChart } from '@/features/planner/components/HourlyChart';
import { AnalysisFilters, RangePicker } from '@/features/planner/components/PlannerFilters';
import { PostingPatternCard } from '@/features/planner/components/PostingPatternCard';
import { SlotDetailSheet } from '@/features/planner/components/SlotDetailSheet';
import { WeeklyHeatmap } from '@/features/planner/components/WeeklyHeatmap';
import { nextDateOn, parseTime, todayIn } from '@/features/planner/dates';
import { metricOf } from '@/features/planner/presentation';
import { usePlannerTimezone } from '@/features/planner/usePlannerTimezone';
import { useApiResource } from '@/hooks/useApiResource';
import type { BestTimes, Connection, Platform, PlannerMetricKey, PlannerRange, PlannerScope, PlannerSlot } from '@/types/api';

/** What each connected account actually allows, so only real actions are offered. Media Navigator never publishes. */
function AccountAccess({ connections, onReconnect }: { connections: Connection[]; onReconnect: (p: Platform) => void }) {
  const rows = PLATFORM_ORDER.map((p) => connections.find((c) => c.platform === p)).filter((c): c is Connection => Boolean(c?.connected));
  if (!rows.length) return null;
  return (
    <Card title="Account access" description="What each connection lets Media Navigator read. Planning, checklists and reminders work either way.">
      {rows.map((c) => {
        const expired = c.status === 'connection_expired';
        const missing = c.missingPermissions ?? [];
        const measures = !expired && c.status !== 'permission_required' && missing.length === 0;
        return (
          <View key={c.platform} className="border-b border-neutral-100 py-sm">
            <View className="flex-row items-center">
              <PlatformLogo platform={c.platform} size={22} />
              <Text className="ml-sm flex-1 text-label font-semibold text-navy">{PLATFORM_META[c.platform].name}</Text>
              {!measures ? <Button title="Reconnect" size="sm" variant="ghost" onPress={() => onReconnect(c.platform)} /> : null}
            </View>
            <Text className="mt-xs text-[12px] leading-[17px] text-neutral-500">
              {expired
                ? 'Access expired: nothing new is synced until you reconnect. Synced posts are kept.'
                : `Posts: ${c.status === 'permission_required' ? 'blocked' : 'yes'} · Performance numbers: ${measures ? 'yes' : missing.length ? `missing (${missing.join(', ')})` : 'no'} · Find published posts: ${c.status === 'permission_required' ? 'no' : 'yes'} · Publishing: no (you post it yourself)`}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

const loadConnections = fetchConnections;

export default function PostingInsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ platform?: string }>();
  const { timezone } = usePlannerTimezone();
  const connections = useApiResource(loadConnections);
  const list = connections.state.status === 'success' ? connections.state.data : [];
  const firstConnected = PLATFORM_ORDER.find((p) => list.find((c) => c.platform === p)?.connected);
  const [picked, setPicked] = useState<PlannerScope | null>(isPlatform(params.platform) ? params.platform : null);
  const scope: PlannerScope = picked ?? firstConnected ?? 'instagram';
  const [days, setDays] = useState<PlannerRange>(90);
  // undefined = let the server pick the best measure this platform actually reports.
  const [metric, setMetric] = useState<PlannerMetricKey | undefined>(undefined);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [slot, setSlot] = useState<PlannerSlot | null>(null);

  const fetcher = useCallback(() => fetchBestTimes({ platform: scope, days, metric, contentType }), [scope, days, metric, contentType]);
  const best = useApiResource(fetcher);
  // Keep the last result on screen (dimmed) while new filters load, so the controls don't jump.
  const [last, setLast] = useState<BestTimes | null>(null);
  if (best.state.status === 'success' && best.state.data !== last) setLast(best.state.data);
  const shown = best.state.status === 'success' ? best.state.data : best.state.status === 'loading' && last?.platform === scope ? last : null;

  const changeScope = (s: PlannerScope) => {
    setMetric(undefined);
    setContentType(undefined);
    setSlot(null);
    setPicked(s);
  };
  const reconnect = (p: Platform) => router.push({ pathname: '/connect/[platform]', params: { platform: p } });
  const planAt = (data: BestTimes, day: string, windowKey: string, start?: string | null) => {
    const w = data.windows.find((x) => x.key === windowKey);
    const time = parseTime(start ?? w?.range.split(' – ')[0] ?? '');
    router.push({
      pathname: '/planner/new',
      params: {
        date: nextDateOn(day, todayIn(timezone)),
        ...(data.platform !== 'all' ? { platform: data.platform } : {}),
        ...(data.contentType !== 'all' ? { format: data.contentType } : {}),
        ...(time && data.timezone === timezone ? { time } : {}),
      },
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-lg pb-3xl pt-md"
      refreshControl={
        <RefreshControl
          // Spins until both the connections and the analysis have reloaded.
          refreshing={connections.refreshing || best.refreshing}
          onRefresh={() => {
            void connections.refresh();
            void best.refresh();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text className="mb-lg text-body text-neutral-500">When your past posts did best, measured from your own synced posts.</Text>
      {connections.state.status === 'loading' ? (
        <LoadingState message="Loading…" />
      ) : connections.state.status !== 'success' ? (
        <ErrorState message={connections.state.message} onRetry={connections.reload} />
      ) : (
        <>
          <PlatformPicker connections={list} value={scope} onChange={changeScope} />
          <RangePicker value={days} onChange={setDays} />

          {best.state.status === 'error' || best.state.status === 'unavailable' ? (
            <ErrorState message={best.state.message} onRetry={best.reload} />
          ) : !shown ? (
            <LoadingState message="Analysing your posting history…" />
          ) : shown.state === 'not_connected' ? (
            <EmptyState
              icon="link-outline"
              title={scope === 'all' ? 'No accounts connected' : `${PLATFORM_META[scope].name} isn’t connected`}
              message={scope === 'all' ? 'Connect an account to see when your posts perform best.' : `Connect your ${PLATFORM_META[scope].name} account to get best times based on its own posts.`}
              action={scope === 'all' ? { label: 'Connected accounts', onPress: () => router.push('/connected-accounts') } : { label: `Connect ${PLATFORM_META[scope].name}`, onPress: () => reconnect(scope) }}
            />
          ) : (
            <View style={{ opacity: best.state.status === 'loading' ? 0.55 : 1 }}>
              {best.state.status === 'loading' ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} /> : null}
              <AnalysisFilters data={shown} onMetric={setMetric} onContentType={(t) => setContentType(t === 'all' ? undefined : t)} />
              {shown.accounts
                .filter((a) => (shown.platform === 'all' ? a.connected : a.platform === shown.platform))
                .map((a) =>
                  a.status === 'connection_expired' || a.status === 'permission_required' ? (
                    <Notice key={a.platform} variant="warning" title={a.status === 'connection_expired' ? `${a.name} access expired` : `${a.name} needs more permissions`} message="Results use the posts already synced. Reconnect to keep them up to date." />
                  ) : a.syncState === 'syncing' ? (
                    <Notice key={a.platform} variant="info" title="Sync in progress" message={`${a.name} is syncing. Pull down to refresh when it finishes.`} />
                  ) : null,
                )}
              {shown.timezoneSource === 'default' ? (
                <Notice variant="info" title="Times are in UTC" message="Your profile has no timezone yet. Set it in Profile → Preferences so days and times match where you are." />
              ) : null}
              {shown.analysis && shown.analysis.eligiblePosts === 0 && shown.analysis.excluded.unmeasured + shown.analysis.excluded.tooRecent === 0 ? (
                <EmptyState icon="calendar-outline" title="No posts in this period" message={`No posts were published in the last ${shown.days} days${shown.contentType !== 'all' ? ' in this format' : ''}. Try a longer range.`} />
              ) : shown.analysis ? (
                <>
                  <BestTimeCard
                    data={shown}
                    onReconnect={reconnect}
                    onPlan={() => {
                      const rec = shown.analysis?.recommendation;
                      if (rec) planAt(shown, rec.day, rec.window, rec.narrowStartTime);
                      else router.push({ pathname: '/planner/new', params: shown.platform !== 'all' ? { platform: shown.platform } : {} });
                    }}
                  />
                  <WeeklyHeatmap data={shown} onSelect={setSlot} />
                  <HourlyChart data={shown} />
                  <PostingPatternCard data={shown} />
                  <Card title="About these results">
                    <BulletList
                      items={[
                        `${shown.analysis.eligiblePosts} posts analysed, measured by ${metricOf(shown).label.toLowerCase()}.${shown.analysis.excluded.unmeasured ? ` ${shown.analysis.excluded.unmeasured} skipped because the platform didn’t measure this for them.` : ''}${shown.analysis.excluded.tooRecent ? ` ${shown.analysis.excluded.tooRecent} too recent to judge yet.` : ''}`,
                        'This is historical performance: how your past posts did by publishing time. It isn’t a prediction of when your audience is online.',
                        shown.method.summary,
                        ...shown.notes,
                      ]}
                    />
                  </Card>
                </>
              ) : null}
              {slot ? (
                <SlotDetailSheet slot={slot} data={shown} onClose={() => setSlot(null)} onPlan={(s) => { setSlot(null); planAt(shown, s.day, s.window); }} />
              ) : null}
            </View>
          )}
          <AccountAccess connections={list} onReconnect={reconnect} />
          <View className="mt-md flex-row items-center">
            <Ionicons name="information-circle-outline" size={14} color={colors.neutral500} />
            <Text className="ml-xs flex-1 text-[12px] text-neutral-500">Best times are evidence from your history, not a guarantee. Content and format matter too.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
