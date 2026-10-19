import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import type { Plan } from '@/types/api';

import { formatTime, relativeDay, type LocalDate } from '../dates';
import { actionsFor, FORMAT_LABEL, readiness, type PlanAction } from '../planRules';
import { StatusBadge } from './Chips';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Quick actions offered inline; the rest (publishing, editing details) live on the plan screen. */
const INLINE: Partial<Record<PlanAction, { label: string; icon: IconName; danger?: boolean }>> = {
  markReady: { label: 'Mark ready', icon: 'checkmark-circle-outline' },
  markPublished: { label: 'Mark published', icon: 'rocket-outline' },
  reschedule: { label: 'Reschedule', icon: 'calendar-outline' },
  pickDate: { label: 'Pick a date', icon: 'calendar-outline' },
  toIdeas: { label: 'Move to ideas', icon: 'bulb-outline' },
  restore: { label: 'Restore', icon: 'arrow-undo-outline' },
  delete: { label: 'Delete', icon: 'trash-outline', danger: true },
};

/** When a plan is due, in the plan's own timezone (noted when it differs from the planner's). */
export function whenText(plan: Plan, today: LocalDate, timezone: string): string {
  if (plan.localDate && plan.localTime) {
    return `${relativeDay(plan.localDate, today)} · ${formatTime(plan.localTime)}${plan.timezone && plan.timezone !== timezone ? ` (${plan.timezone})` : ''}`;
  }
  if (plan.needsDate && plan.legacy) return `Saved as “${plan.legacy.day} ${plan.legacy.time}” · needs a date`;
  return plan.storedStatus === 'idea' ? 'No date yet' : 'Draft, no date';
}

export function PlanCard({ plan, today, timezone, onOpen, onAction, busy = false }: {
  plan: Plan;
  today: LocalDate;
  timezone: string;
  onOpen: () => void;
  onAction: (action: PlanAction) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const r = readiness(plan);
  const actions = actionsFor(plan).filter((a) => INLINE[a]);
  return (
    <View className="mb-sm rounded-xl border border-neutral-200 bg-white" style={elevation.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        onLongPress={onOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint="Shows quick actions"
        className="flex-row p-md active:bg-neutral-50"
        style={{ borderRadius: 12, opacity: busy ? 0.6 : 1 }}
      >
        <PlatformLogo platform={plan.platform} size={34} />
        <View className="ml-md flex-1">
          <Text className="text-label font-semibold text-navy" numberOfLines={2}>
            {plan.title}
          </Text>
          <Text className={`mt-[2px] text-[12px] ${plan.status === 'missed' || plan.needsDate ? 'text-warning' : 'text-neutral-500'}`} numberOfLines={1}>
            {`${plan.format ? `${FORMAT_LABEL[plan.format]} · ` : ''}${whenText(plan, today, timezone)}`}
          </Text>
          <View className="mt-xs flex-row flex-wrap items-center" style={{ gap: 8 }}>
            <StatusBadge status={plan.status} />
            {r.total ? (
              <Text className={`text-[11px] ${r.complete ? 'text-success' : 'text-neutral-500'}`} accessibilityLabel={`Checklist ${r.label}`}>
                {`☑ ${r.done}/${r.total}`}
              </Text>
            ) : null}
            {plan.reminders.length && plan.scheduledAt ? (
              <View className="flex-row items-center" accessible accessibilityLabel="Reminder on">
                <Ionicons name="notifications-outline" size={12} color={colors.neutral500} />
              </View>
            ) : null}
            {plan.source ? (
              <View className="flex-row items-center" accessible accessibilityLabel="From an analysis">
                <Ionicons name="sparkles-outline" size={12} color={colors.violet} />
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.neutral400} style={{ marginTop: 8 }} />
      </Pressable>
      {open ? (
        <View className="flex-row flex-wrap border-t border-neutral-100 px-md pb-sm pt-xs">
          <Pressable onPress={onOpen} accessibilityRole="button" className="mr-sm mt-xs min-h-10 flex-row items-center rounded-full bg-navy px-md active:opacity-80">
            <Ionicons name="open-outline" size={15} color={colors.white} />
            <Text className="ml-xs text-label font-semibold text-white">Open</Text>
          </Pressable>
          {actions.map((a) => {
            const m = INLINE[a]!;
            return (
              <Pressable
                key={a}
                onPress={() => onAction(a)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                className={`mr-sm mt-xs min-h-10 flex-row items-center rounded-full border px-md ${m.danger ? 'border-danger-border active:bg-danger-light' : 'border-neutral-200 active:bg-neutral-50'}`}
              >
                <Ionicons name={m.icon} size={15} color={m.danger ? colors.danger : colors.navy} />
                <Text className={`ml-xs text-label ${m.danger ? 'text-danger' : 'text-navy'}`}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
