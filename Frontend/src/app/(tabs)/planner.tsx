import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BulletList, Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { TabScreen } from '@/components/TabScreen';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/auth-context';
import { fetchConnections } from '@/features/connections/api';
import { isPlatform, PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { PlatformPicker } from '@/features/connections/PlatformPicker';
import { fetchBestTimes, fetchPlannedItems, removePlannedItem } from '@/features/planner/api';
import { BestTimeCard } from '@/features/planner/components/BestTimeCard';
import { HourlyChart } from '@/features/planner/components/HourlyChart';
import { AnalysisFilters, RangePicker } from '@/features/planner/components/PlannerFilters';
import { PlanPostSheet, type PlanPrefill } from '@/features/planner/components/PlanPostSheet';
import { PostingPatternCard } from '@/features/planner/components/PostingPatternCard';
import { SlotDetailSheet } from '@/features/planner/components/SlotDetailSheet';
import { WeeklyHeatmap } from '@/features/planner/components/WeeklyHeatmap';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmDestructive, showMessage } from '@/lib/confirm';
import { DAY_NAMES } from '@/lib/format';
import type { BestTimes, Connection, PlannedItem, PlannerMetricKey, PlannerRange, PlannerScope, PlannerSlot, Platform } from '@/types/api';

const windowStart = (data: BestTimes, key: string) => data.windows.find((w) => w.key === key)?.range.split(' – ')[0];

function PlannedRow({ item, onRemove }: { item: PlannedItem; onRemove: () => void }) {
  return (
    <View className="flex-row items-center py-sm">
      <PlatformLogo platform={item.platform} size={32} />
      <View className="ml-md flex-1">
        <Text className="text-label text-navy" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="mt-0.5 text-caption text-neutral-500">{`${item.day} · ${item.time}${item.contentType ? ` · ${item.contentType}` : ''} · Planned`}</Text>
      </View>
      <IconButton icon="trash-outline" accessibilityLabel={`Remove ${item.title}`} onPress={onRemove} color={colors.danger} />
    </View>
  );
}

/** Problems with the selected account that change how far the numbers can be trusted. */
function AccountStatus({ data, onReconnect }: { data: BestTimes; onReconnect: (p: Platform) => void }) {
  const accounts = data.platform === 'all' ? data.accounts.filter((a) => a.connected) : data.accounts.filter((a) => a.platform === data.platform);
  return (
    <>
      {accounts.map((a) =>
        a.status === 'connection_expired' || a.status === 'permission_required' ? (
          <View key={a.platform} className="mb-lg">
            <Notice
              variant="warning"
              title={a.status === 'connection_expired' ? `${a.name} access expired` : `${a.name} needs more permissions`}
              message="Results below use the posts already synced. Reconnect to keep them up to date."
            />
            <Button title={`Reconnect ${a.name}`} variant="secondary" size="sm" onPress={() => onReconnect(a.platform)} />
          </View>
        ) : a.syncState === 'syncing' ? (
          <Notice key={a.platform} variant="info" title="Sync in progress" message={`${a.name} is syncing. Pull down to refresh when it finishes; the results update automatically.`} />
        ) : a.syncState === 'failed' ? (
          <Notice key={a.platform} variant="warning" title="Last sync failed" message={`Showing ${a.name} posts from the last successful sync.`} />
        ) : null,
      )}
    </>
  );
}

function BestTimesSection({ connections, scope, onScope, onPlan, reloadKey }: {
  connections: Connection[];
  scope: PlannerScope;
  onScope: (s: PlannerScope) => void;
  onPlan: (prefill: PlanPrefill, timezone: string) => void;
  reloadKey: number;
}) {
  const router = useRouter();
  const [days, setDays] = useState<PlannerRange>(90);
  // undefined = let the server pick the best reach measure this platform actually reports.
  const [metric, setMetric] = useState<PlannerMetricKey | undefined>(undefined);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [slot, setSlot] = useState<PlannerSlot | null>(null);

  // reloadKey is part of the key so pull-to-refresh re-requests the API.
  const fetcher = useCallback(
    () => fetchBestTimes({ platform: scope, days, metric, contentType }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, days, metric, contentType, reloadKey],
  );
  const { state, reload } = useApiResource(fetcher);
  // Keep the last result on screen (dimmed) while a new range/metric loads, so the controls don't jump.
  const [last, setLast] = useState<BestTimes | null>(null);
  if (state.status === 'success' && state.data !== last) setLast(state.data);
  const shown = state.status === 'success' ? state.data : state.status === 'loading' && last?.platform === scope ? last : null;

  const changeScope = (s: PlannerScope) => {
    setMetric(undefined);
    setContentType(undefined);
    setSlot(null);
    onScope(s);
  };

  const planFrom = (data: BestTimes, s?: PlannerSlot) => {
    const rec = data.analysis?.recommendation;
    const platform = data.platform === 'all' ? data.scope[0]?.platform : data.platform;
    const type = data.contentType !== 'all' ? data.contentType : undefined;
    if (s) {
      onPlan({ day: s.day, time: windowStart(data, s.window), platform, contentType: type }, data.timezone);
    } else if (rec) {
      onPlan(
        {
          day: rec.day,
          time: rec.narrowStartTime ?? windowStart(data, rec.window),
          platform,
          contentType: type,
          reason: `${rec.day} ${rec.windowLabel.toLowerCase()} is your strongest slot (${rec.evidence === 'limited' ? 'preliminary' : `${rec.evidence} evidence`}).`,
        },
        data.timezone,
      );
    } else {
      onPlan({ platform }, data.timezone);
    }
  };

  return (
    <>
      <PlatformPicker connections={connections} value={scope} onChange={changeScope} />
      <RangePicker value={days} onChange={setDays} />

      {state.status === 'error' || state.status === 'unavailable' ? (
        <ErrorState message={state.message} onRetry={reload} />
      ) : !shown ? (
        <LoadingState message="Analysing your posting history…" />
      ) : shown.state === 'not_connected' ? (
        <EmptyState
          icon="link-outline"
          title={scope === 'all' ? 'No accounts connected' : `${PLATFORM_META[scope].name} isn’t connected`}
          message={scope === 'all' ? 'Connect an account to see when your posts perform best.' : `Connect your ${PLATFORM_META[scope].name} account to get best times based on its own posts.`}
          action={scope === 'all' ? { label: 'Connected accounts', onPress: () => router.push('/connected-accounts') } : { label: `Connect ${PLATFORM_META[scope].name}`, onPress: () => router.push({ pathname: '/connect/[platform]', params: { platform: scope } }) }}
        />
      ) : (
        <View style={{ opacity: state.status === 'loading' ? 0.55 : 1 }}>
          {state.status === 'loading' ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} /> : null}
          <AnalysisFilters data={shown} onMetric={setMetric} onContentType={setContentType} />
          <AccountStatus data={shown} onReconnect={(p) => router.push({ pathname: '/connect/[platform]', params: { platform: p } })} />
          {shown.timezoneSource === 'default' ? (
            <Notice variant="info" title="Times are in UTC" message="Your profile has no timezone yet. Set it in Profile → Preferences so days and times match where you are." />
          ) : null}
          {shown.analysis && shown.analysis.eligiblePosts === 0 && shown.analysis.excluded.unmeasured + shown.analysis.excluded.tooRecent === 0 ? (
            <EmptyState icon="calendar-outline" title="No posts in this period" message={`No posts were published in the last ${shown.days} days${shown.contentType !== 'all' ? ' in this format' : ''}. Try a longer range.`} />
          ) : (
            <>
              <BestTimeCard data={shown} onPlan={() => planFrom(shown)} />
              <WeeklyHeatmap data={shown} onSelect={setSlot} />
              <HourlyChart data={shown} />
              <PostingPatternCard data={shown} />
              <Card title="About these results">
                <BulletList
                  items={[
                    `${shown.analysis!.eligiblePosts} posts analysed.${shown.analysis!.excluded.unmeasured ? ` ${shown.analysis!.excluded.unmeasured} skipped because the platform didn’t measure this metric for them.` : ''}${shown.analysis!.excluded.tooRecent ? ` ${shown.analysis!.excluded.tooRecent} too recent to judge yet.` : ''}`,
                    'This is historical performance: how your past posts did by publishing time. It isn’t a prediction of when your audience is online.',
                    shown.method.summary,
                    ...shown.notes,
                  ]}
                />
              </Card>
            </>
          )}
          <SlotDetailSheet
            slot={slot}
            data={shown}
            onClose={() => setSlot(null)}
            onPlan={(s) => {
              setSlot(null);
              planFrom(shown, s);
            }}
          />
        </View>
      )}
    </>
  );
}

const loadConnections = fetchConnections;
const loadPlanned = fetchPlannedItems;

export default function PlannerScreen() {
  const { state: auth } = useAuth();
  // Planned times use the same timezone as the analysis: the profile's, or UTC when none is set (as on the server).
  const profileTimezone = (auth.status === 'authenticated' ? auth.me.profile?.timezone : null) || 'UTC';
  const connections = useApiResource(loadConnections);
  const planned = useApiResource(loadPlanned);
  const [reloadKey, setReloadKey] = useState(0);
  // Other screens can open the planner with ?platform=&day=&time= to prefill a plan.
  const params = useLocalSearchParams<{ day?: string; time?: string; platform?: string }>();
  const [picked, setPicked] = useState<PlannerScope | null>(isPlatform(params.platform) ? params.platform : null);
  const prefillDay = DAY_NAMES.find((d) => d === params.day);
  const [plan, setPlan] = useState<{ prefill: PlanPrefill; timezone: string; key: number } | null>(
    prefillDay || params.time ? { prefill: { day: prefillDay, time: params.time, platform: isPlatform(params.platform) ? params.platform : undefined }, timezone: '', key: 0 } : null,
  );

  const list = connections.state.status === 'success' ? connections.state.data : [];
  const connected = PLATFORM_ORDER.filter((p) => list.find((c) => c.platform === p)?.connected);
  const scope: PlannerScope = picked ?? connected[0] ?? 'instagram';
  const planPlatforms = [...connected, ...PLATFORM_ORDER.filter((p) => !connected.includes(p))];

  const refreshAll = () => {
    void connections.refresh();
    void planned.refresh();
    setReloadKey((k) => k + 1);
  };

  const confirmRemove = async (item: PlannedItem) => {
    if (!(await confirmDestructive('Remove this plan?', item.title, 'Remove'))) return;
    try {
      await removePlannedItem(item.id);
      await planned.refresh();
    } catch (e) {
      showMessage('Unable to remove', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <TabScreen showLogo title="Smart Planner" subtitle="Find the times your posts reach the most people." refreshing={connections.refreshing || planned.refreshing} onRefresh={refreshAll}>
      {connections.state.status === 'loading' ? (
        <LoadingState message="Loading planner…" />
      ) : connections.state.status !== 'success' ? (
        <ErrorState message={connections.state.message} onRetry={connections.reload} />
      ) : (
        <BestTimesSection
          connections={list}
          scope={scope}
          onScope={setPicked}
          reloadKey={reloadKey}
          onPlan={(prefill, timezone) => setPlan({ prefill, timezone, key: Date.now() })}
        />
      )}

      <Card
        title="Planned posts"
        description="Reminders for you. Media Navigator doesn’t publish to your accounts."
        right={<Button title="Add" size="sm" icon="add" variant="ghost" onPress={() => setPlan({ prefill: { platform: connected[0] }, timezone: '', key: Date.now() })} />}
      >
        {planned.state.status === 'loading' ? (
          <LoadingState message="Loading plans…" />
        ) : planned.state.status !== 'success' ? (
          <ErrorState message={planned.state.message} onRetry={planned.reload} />
        ) : planned.state.data.length === 0 ? (
          <Text className="text-label font-normal text-neutral-500">Nothing planned yet.</Text>
        ) : (
          planned.state.data.map((item) => <PlannedRow key={item.id} item={item} onRemove={() => void confirmRemove(item)} />)
        )}
      </Card>

      {plan ? (
        <PlanPostSheet
          key={plan.key}
          visible
          onClose={() => setPlan(null)}
          onAdded={() => void planned.refresh()}
          prefill={plan.prefill}
          timezone={plan.timezone || profileTimezone}
          platforms={planPlatforms}
        />
      ) : null}
    </TabScreen>
  );
}
