import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { TabScreen } from '@/components/TabScreen';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { fetchConnections } from '@/features/connections/api';
import { Pill } from '@/features/connections/PlatformPicker';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { fetchPlansInRange, fetchUndatedPlans } from '@/features/planner/api';
import { BestTimeHint } from '@/features/planner/components/BestTimeHint';
import { Calendar, type CalendarView } from '@/features/planner/components/Calendar';
import { SectionLabel } from '@/features/planner/components/Chips';
import { PlanCard } from '@/features/planner/components/PlanCard';
import { addDays, monthGrid, rangeFor, relativeDay, todayIn, weekDates, type LocalDate } from '@/features/planner/dates';
import { refreshDeviceReminders } from '@/features/planner/deviceReminders';
import { countByDate, filterPlans, groupPlans, sortPlans, type PlatformFilter } from '@/features/planner/planRules';
import { usePlanActions } from '@/features/planner/usePlanActions';
import { usePlannerTimezone } from '@/features/planner/usePlannerTimezone';
import { useApiResource } from '@/hooks/useApiResource';
import type { Connection, Plan } from '@/types/api';

const UPCOMING_LIMIT = 8;

function Section({ title, count, children, right }: { title: string; count?: number; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="mb-lg">
      <View className="mb-sm flex-row items-center">
        <Text className="flex-1 text-title text-navy" accessibilityRole="header">
          {count !== undefined ? `${title} · ${count}` : title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Platform filter: always shows which filter is on, and "All" clears it. */
function PlatformFilterBar({ value, onChange, connections }: { value: PlatformFilter; onChange: (v: PlatformFilter) => void; connections: Connection[] }) {
  return (
    <View className="mb-lg">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel="Filter by platform">
        <Pill selected={value === 'all'} onPress={() => onChange('all')} label="All" />
        {PLATFORM_ORDER.map((p) => (
          <Pill key={p} selected={value === p} onPress={() => onChange(value === p ? 'all' : p)} label={PLATFORM_META[p].name} hint={connections.find((c) => c.platform === p)?.connected ? undefined : 'not connected'}>
            <View className="mr-xs">
              <PlatformLogo platform={p} size={18} />
            </View>
          </Pill>
        ))}
      </ScrollView>
      {value !== 'all' ? (
        <Pressable onPress={() => onChange('all')} accessibilityRole="button" accessibilityLabel={`Clear the ${PLATFORM_META[value].name} filter`} className="mt-xs min-h-9 flex-row items-center self-start">
          <Ionicons name="close-circle" size={16} color={colors.primary} />
          <Text className="ml-xs text-[13px] font-semibold text-primary">{`Showing ${PLATFORM_META[value].name} only · Clear`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const loadConnections = fetchConnections;

export default function PlannerScreen() {
  const router = useRouter();
  const { timezone } = usePlannerTimezone();
  const today = todayIn(timezone);
  const [selected, setSelected] = useState<LocalDate>(today);
  const [view, setView] = useState<CalendarView>('week');
  const [filter, setFilter] = useState<PlatformFilter>('all');
  const [showDone, setShowDone] = useState(false);

  // Calendar dots cover the visible week or month; the agenda covers the last 30 and next 60 days.
  const visible = view === 'week' ? weekDates(selected) : monthGrid(selected).map((d) => d.date);
  const gridRange = rangeFor(visible[0], visible[visible.length - 1], timezone);
  const agendaRange = rangeFor(addDays(today, -30), addDays(today, 60), timezone);
  const gridKey = `${gridRange.from}|${gridRange.to}`;
  const fetcher = useCallback(async () => {
    const [grid, agenda, undated] = await Promise.all([fetchPlansInRange(gridRange), fetchPlansInRange(agendaRange), fetchUndatedPlans()]);
    return { grid, agenda, undated };
    // The ranges are rebuilt from their keys on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey, agendaRange.from, agendaRange.to]);
  const plans = useApiResource(fetcher);
  const connections = useApiResource(loadConnections);

  // Returning from a plan or the new-plan screen shows the latest data and re-syncs device reminders.
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) first.current = false;
      else void plans.refresh();
      void refreshDeviceReminders();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plans.refresh]),
  );

  const { run, busyId, sheet } = usePlanActions({ timezone, onChanged: () => void plans.refresh() });

  // Keep the previous weeks on screen while the next range loads, so moving through the calendar doesn't flash.
  const [last, setLast] = useState<{ grid: Plan[]; agenda: Plan[]; undated: Plan[] } | null>(null);
  if (plans.state.status === 'success' && plans.state.data !== last) setLast(plans.state.data);
  const data = plans.state.status === 'success' ? plans.state.data : plans.state.status === 'loading' ? last : null;
  const connectionList = connections.state.status === 'success' ? connections.state.data : [];
  const counts = useMemo(() => countByDate(filterPlans(data?.grid ?? [], filter)), [data, filter]);
  const groups = useMemo(() => {
    if (!data) return null;
    // A plan can be in both ranges; keep one copy.
    const all = new Map<string, Plan>();
    for (const p of [...data.agenda, ...data.undated]) all.set(p.id, p);
    return groupPlans(filterPlans([...all.values()], filter));
  }, [data, filter]);
  const dayPlans = useMemo(() => sortPlans(filterPlans(data?.grid ?? [], filter).filter((p) => p.localDate === selected)), [data, filter, selected]);
  const upcoming = (groups?.upcoming ?? []).filter((p) => p.localDate !== selected);
  const hintPlatform = filter !== 'all' ? filter : connectionList.find((c) => c.connected)?.platform ?? null;

  const newPlan = (params: Record<string, string> = {}) =>
    router.push({ pathname: '/planner/new', params: { date: selected, ...(filter !== 'all' ? { platform: filter } : {}), ...params } });
  const card = (p: Plan) => (
    <PlanCard key={p.id} plan={p} today={today} timezone={timezone} busy={busyId === p.id} onOpen={() => router.push({ pathname: '/planner/[id]', params: { id: p.id } })} onAction={(a) => void run(p, a)} />
  );

  return (
    <TabScreen
      showLogo
      title="Planner"
      subtitle="Plan smarter. Publish consistently."
      headerRight={<Button title="New" icon="add" size="sm" onPress={() => newPlan()} />}
      refreshing={plans.refreshing || connections.refreshing}
      onRefresh={() => {
        void plans.refresh();
        void connections.refresh();
        void refreshDeviceReminders();
      }}
    >
      <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-md" style={elevation.card}>
        <Calendar today={today} selected={selected} onSelect={setSelected} view={view} onView={setView} counts={counts} />
      </View>

      <PlatformFilterBar value={filter} onChange={setFilter} connections={connectionList} />

      {plans.state.status === 'error' || plans.state.status === 'unavailable' ? (
        <ErrorState message={plans.state.message} onRetry={plans.reload} />
      ) : !groups ? (
        <LoadingState message="Loading your plans…" />
      ) : (
        <>
          <Section title={relativeDay(selected, today)} count={dayPlans.length || undefined}>
            {dayPlans.length ? dayPlans.map(card) : (
              <View className="rounded-xl border border-dashed border-neutral-300 p-lg">
                <Text className="text-label text-neutral-500">
                  {selected < today ? 'Nothing was planned for this day.' : `Nothing planned${filter !== 'all' ? ` for ${PLATFORM_META[filter].name}` : ''} on this day yet.`}
                </Text>
                {selected >= today ? (
                  <View className="mt-md self-start">
                    <Button title="Plan a post for this day" icon="add-circle-outline" variant="secondary" size="sm" onPress={() => newPlan()} />
                  </View>
                ) : null}
              </View>
            )}
          </Section>

          {groups.attention.length ? (
            <Section title="Needs attention" count={groups.attention.length}>
              <Text className="mb-sm text-[12px] text-neutral-500">Missed posts can be rescheduled or marked published. Older plans need a real date.</Text>
              {groups.attention.map(card)}
            </Section>
          ) : null}

          <Section title="Upcoming" count={upcoming.length || undefined}>
            {upcoming.length ? (
              <>
                {upcoming.slice(0, UPCOMING_LIMIT).map(card)}
                {upcoming.length > UPCOMING_LIMIT ? <Text className="text-[12px] text-neutral-500">{`${upcoming.length - UPCOMING_LIMIT} more later. Use the calendar to see them.`}</Text> : null}
              </>
            ) : (
              <EmptyState compact icon="calendar-outline" title="Nothing coming up" message="Plans for the next 60 days show here, earliest first." action={{ label: 'New plan', onPress: () => newPlan() }} />
            )}
          </Section>
        </>
      )}

      <Section
        title="When to post"
        right={
          <Pressable onPress={() => router.push({ pathname: '/planner/insights', params: hintPlatform ? { platform: hintPlatform } : {} })} accessibilityRole="link" className="min-h-10 justify-center">
            <Text className="text-label font-semibold text-primary">Posting insights</Text>
          </Pressable>
        }
      >
        {hintPlatform ? (
          <BestTimeHint platform={hintPlatform} format={null} date={selected >= today ? selected : null} timezone={timezone} />
        ) : (
          <Text className="text-label text-neutral-500">Connect an account to see when your own posts did best. Planning works without it.</Text>
        )}
      </Section>

      {groups?.ideas.length ? (
        <Section title="Ideas and drafts" count={groups.ideas.length}>
          {groups.ideas.map(card)}
        </Section>
      ) : null}

      {groups?.done.length ? (
        <Section
          title="Published and cancelled"
          count={groups.done.length}
          right={
            <Pressable onPress={() => setShowDone((s) => !s)} accessibilityRole="button" accessibilityState={{ expanded: showDone }} className="min-h-10 justify-center">
              <Text className="text-label font-semibold text-primary">{showDone ? 'Hide' : 'Show'}</Text>
            </Pressable>
          }
        >
          {showDone ? groups.done.map(card) : <SectionLabel>{`Last 30 days`}</SectionLabel>}
        </Section>
      ) : null}

      <Text className="text-[12px] leading-[17px] text-neutral-500">{`Times are in ${timezone}. Media Navigator doesn’t publish for you: post on the platform, then mark the plan published.`}</Text>
      {sheet}
    </TabScreen>
  );
}
