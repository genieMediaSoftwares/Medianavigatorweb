import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { PLATFORM_META } from '@/features/connections/platforms';
import { fetchPlan, updatePlan } from '@/features/planner/api';
import { ChecklistEditor, type DraftChecklistItem } from '@/features/planner/components/ChecklistEditor';
import { SectionLabel, StatusBadge } from '@/features/planner/components/Chips';
import { whenText } from '@/features/planner/components/PlanCard';
import { PlanReview } from '@/features/planner/components/PlanReview';
import { PublishSheet } from '@/features/planner/components/PublishSheet';
import { ReminderPicker } from '@/features/planner/components/ReminderPicker';
import { formatDay, formatTime, todayIn, utcToZoned } from '@/features/planner/dates';
import { refreshDeviceReminders } from '@/features/planner/deviceReminders';
import { openAnalysis } from '@/features/planner/navigation';
import { actionsFor, FORMAT_LABEL, GOALS, readiness, type PlanAction } from '@/features/planner/planRules';
import { usePlanActions } from '@/features/planner/usePlanActions';
import { usePlannerTimezone } from '@/features/planner/usePlannerTimezone';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError } from '@/lib/api/client';
import type { Plan } from '@/types/api';

/** Where to post manually. These open the platform; nothing is posted by Media Navigator. */
const PLATFORM_HOME = { instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/', youtube: 'https://studio.youtube.com/', linkedin: 'https://www.linkedin.com/feed/' } as const;

const MORE_LABEL: Partial<Record<PlanAction, string>> = { edit: 'Edit details', toIdeas: 'Move to ideas', toDraft: 'Move to drafts', cancel: 'Cancel plan', delete: 'Delete' };

function Block({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      {title ? (
        <View className="mb-sm flex-row items-center">
          <Text className="flex-1 text-title text-navy" accessibilityRole="header">{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View className="mb-sm">
      <Text className="text-[12px] text-neutral-500">{label}</Text>
      <Text className="text-label font-normal text-navy" selectable>{value}</Text>
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; publish?: string }>();
  const id = params.id;
  const { timezone } = usePlannerTimezone();
  const today = todayIn(timezone);
  const fetcher = useCallback(() => fetchPlan(id), [id]);
  const res = useApiResource(fetcher);
  // "Mark published" from the list opens the sheet once; the parameter is cleared so it can't reopen later.
  const [publishing, setPublishing] = useState(params.publish === '1');
  useEffect(() => {
    if (params.publish) router.setParams({ publish: undefined });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) first.current = false;
    else void res.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.refresh]));

  const { run, busyId, sheet } = usePlanActions({
    timezone,
    onChanged: (p) => (p ? void res.refresh() : router.back()),
  });

  if (res.state.status === 'loading') return <LoadingState message="Loading plan…" />;
  if (res.state.status !== 'success') {
    // A reminder can point to a plan that was deleted since.
    if (res.state.status === 'error' && res.state.code === 'NOT_FOUND') {
      return <EmptyState icon="calendar-clear-outline" title="This plan no longer exists" message="It may have been deleted." action={{ label: 'Back to Planner', onPress: () => router.replace('/(tabs)/planner') }} />;
    }
    return <ErrorState message={res.state.message} onRetry={res.reload} />;
  }
  const { plan, group } = res.state.data;
  const r = readiness(plan);
  const actions = actionsFor(plan);
  const live = plan.storedStatus !== 'published' && plan.storedStatus !== 'cancelled';

  // Checklist and reminders save as they change; the server copy is shown again after each save.
  const save = async (patch: { checklist?: DraftChecklistItem[]; reminders?: number[] }) => {
    setSaveError(null);
    try {
      await updatePlan(plan.id, patch);
      await res.refresh();
      if (patch.reminders) void refreshDeviceReminders();
    } catch (e) {
      setSaveError(e instanceof ApiError || e instanceof Error ? e.message : 'Unable to save.');
    }
  };
  const copyCaption = async () => {
    await Clipboard.setStringAsync([plan.caption, plan.cta].filter(Boolean).join('\n\n'));
    setCopied(true);
  };
  const primary = (a: PlanAction, title: string, variant: 'primary' | 'secondary' = 'primary') =>
    actions.includes(a) ? <View className="mb-sm"><Button title={title} variant={variant} onPress={() => void run(plan, a)} loading={busyId === plan.id} /></View> : null;

  return (
    <>
      <Stack.Screen options={{ title: PLATFORM_META[plan.platform].name }} />
      <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-3xl pt-md">
        {saveError ? <Notice variant="error" message={saveError} /> : null}

        <Block>
          <View className="flex-row">
            <PlatformLogo platform={plan.platform} size={40} />
            <View className="ml-md flex-1">
              <Text className="text-heading text-navy" accessibilityRole="header">{plan.title}</Text>
              <Text className={`mt-xs text-label ${plan.status === 'missed' || plan.needsDate ? 'text-warning' : 'text-neutral-500'}`}>
                {`${plan.format ? `${FORMAT_LABEL[plan.format]} · ` : ''}${whenText(plan, today, timezone)}`}
              </Text>
              <View className="mt-sm flex-row flex-wrap items-center" style={{ gap: 8 }}>
                <StatusBadge status={plan.status} />
                {r.total ? <Text className={`text-[12px] ${r.complete ? 'text-success' : 'text-neutral-500'}`}>{`Checklist ${r.label}`}</Text> : null}
              </View>
            </View>
          </View>
          {plan.status === 'missed' ? <View className="mt-md"><Notice variant="warning" message="The planned time has passed. Reschedule it, or mark it published if you already posted it." /></View> : null}
          {plan.needsDate ? <View className="mt-md"><Notice variant="info" message={`This plan was saved as “${plan.legacy?.day} ${plan.legacy?.time}” before plans had dates. Pick the actual date to get it on the calendar.`} /></View> : null}
          {r.complete && plan.storedStatus === 'planned' ? <View className="mt-md"><Notice variant="success" message="Every step is done. Mark it ready when you’re happy with it." /></View> : null}

          <View className="mt-md">
            {primary('pickDate', 'Pick a date')}
            {plan.status === 'missed' ? primary('reschedule', 'Reschedule') : null}
            {primary('markReady', 'Mark ready', plan.status === 'missed' ? 'secondary' : 'primary')}
            {primary('markPublished', 'Mark published', plan.storedStatus === 'ready' ? 'primary' : 'secondary')}
            {plan.status !== 'missed' ? primary('reschedule', 'Reschedule', 'secondary') : null}
            {primary('restore', 'Restore as draft')}
          </View>
        </Block>

        {plan.source ? (
          <Block title="Why this idea?">
            <Text className="text-[13px] leading-[19px] text-navy">{plan.source.recommendationText}</Text>
            {plan.source.analysisSummary ? <Text className="mt-sm text-[12px] leading-[17px] text-neutral-500">{`From the analysis: ${plan.source.analysisSummary}`}</Text> : null}
            <View className="mt-sm self-start">
              <Button title="Open the analysis" variant="ghost" size="sm" icon="sparkles-outline" onPress={() => openAnalysis(router, plan.source!.mediaId, plan.source!.analysisType)} />
            </View>
          </Block>
        ) : null}

        {plan.storedStatus === 'published' ? (
          <>
            <Block title="Published">
              <Text className="text-label font-normal text-navy">
                {plan.publication
                  ? `${plan.publication.verification === 'matched' ? 'Linked to the synced post' : 'Marked published by you (not verified with the platform)'} · ${(() => { const l = utcToZoned(plan.publication.publishedAt, plan.timezone ?? timezone); return `${formatDay(l.date)} ${formatTime(l.time)}`; })()}`
                  : 'Published.'}
              </Text>
              {plan.publication?.url ? (
                <Pressable onPress={() => void Linking.openURL(plan.publication!.url!)} accessibilityRole="link" className="mt-xs min-h-10 justify-center self-start">
                  <Text className="text-label font-semibold text-primary">Open the post</Text>
                </Pressable>
              ) : null}
            </Block>
            <PlanReview plan={plan} timezone={timezone} onLink={() => setPublishing(true)} />
          </>
        ) : null}

        {live && plan.scheduledAt ? (
          <Block title="Publish it yourself">
            <Text className="mb-md text-[13px] text-neutral-500">{`Media Navigator doesn’t post for you. Copy the caption, post it on ${PLATFORM_META[plan.platform].name}, then mark it published.`}</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {plan.caption || plan.cta ? <Button title={copied ? 'Caption copied' : 'Copy caption'} icon={copied ? 'checkmark' : 'copy-outline'} variant="secondary" size="sm" onPress={() => void copyCaption()} /> : null}
              <Button title={`Open ${PLATFORM_META[plan.platform].name}`} icon="open-outline" variant="secondary" size="sm" onPress={() => void Linking.openURL(PLATFORM_HOME[plan.platform])} />
            </View>
          </Block>
        ) : null}

        <Block title="Preparation">
          <ChecklistEditor key={plan.updatedAt} items={plan.checklist} editable={live} onChange={(items) => void save({ checklist: items })} />
        </Block>

        {live ? (
          <Block title="Reminders">
            <ReminderPicker value={plan.reminders} hasDate={Boolean(plan.scheduledAt)} onChange={(reminders) => void save({ reminders })} />
          </Block>
        ) : null}

        {plan.description || plan.caption || plan.cta || plan.referenceUrl || plan.notes || plan.goal ? (
          <Block title="Details">
            <Detail label="Idea" value={plan.description} />
            <Detail label="Caption draft" value={plan.caption} />
            <Detail label="Call to action" value={plan.cta} />
            <Detail label="Goal" value={GOALS.find((g) => g.value === plan.goal)?.label ?? ''} />
            {plan.referenceUrl ? (
              <Pressable onPress={() => void Linking.openURL(plan.referenceUrl)} accessibilityRole="link" className="mb-sm">
                <Text className="text-[12px] text-neutral-500">Reference</Text>
                <Text className="text-label text-primary" numberOfLines={1}>{plan.referenceUrl}</Text>
              </Pressable>
            ) : null}
            <Detail label="Notes" value={plan.notes} />
          </Block>
        ) : null}

        {group.length ? (
          <Block title="Same idea on other platforms">
            {group.map((g: Plan) => (
              <Pressable key={g.id} onPress={() => router.push({ pathname: '/planner/[id]', params: { id: g.id } })} accessibilityRole="button" className="min-h-12 flex-row items-center border-b border-neutral-100 py-xs active:bg-neutral-50">
                <PlatformLogo platform={g.platform} size={24} />
                <Text className="ml-sm flex-1 text-label text-navy" numberOfLines={1}>{`${PLATFORM_META[g.platform].name} · ${whenText(g, today, timezone)}`}</Text>
                <StatusBadge status={g.status} />
              </Pressable>
            ))}
          </Block>
        ) : null}

        <SectionLabel>More</SectionLabel>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {actions.filter((a) => MORE_LABEL[a]).map((a) => (
            <Pressable key={a} onPress={() => void run(plan, a)} accessibilityRole="button"
              className={`min-h-10 flex-row items-center rounded-full border px-md ${a === 'delete' || a === 'cancel' ? 'border-danger-border active:bg-danger-light' : 'border-neutral-200 active:bg-neutral-50'}`}>
              <Text className={`text-label ${a === 'delete' || a === 'cancel' ? 'text-danger' : 'text-navy'}`}>{MORE_LABEL[a]}</Text>
            </Pressable>
          ))}
          {actions.includes('undoPublish') ? (
            <Pressable onPress={() => void run(plan, 'undoPublish')} accessibilityRole="button" className="min-h-10 flex-row items-center rounded-full border border-neutral-200 px-md active:bg-neutral-50">
              <Ionicons name="arrow-undo-outline" size={15} color={colors.navy} />
              <Text className="ml-xs text-label text-navy">Undo published</Text>
            </Pressable>
          ) : null}
        </View>
        <Text className="mt-lg text-[12px] text-neutral-500">{`Times are in ${plan.timezone ?? timezone}.`}</Text>
      </ScrollView>

      {publishing ? (
        <PublishSheet plan={plan} timezone={timezone} onClose={() => setPublishing(false)} onDone={() => { setPublishing(false); void res.refresh(); void refreshDeviceReminders(); }} />
      ) : null}
      {sheet}
    </>
  );
}
