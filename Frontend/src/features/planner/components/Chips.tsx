import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import { STATUS_META } from '../planRules';
import type { PlanStatus } from '@/types/api';

/** One choice of several (radio) or several of several (`multi`), as compact pills. Scrolls sideways when needed. */
export function Chips<T extends string | number>({ options, value, onChange, label, multi = false, wrap = false, accessibilityLabel }: {
  options: readonly T[];
  value: T | readonly T[] | null;
  onChange: (v: T) => void;
  label: (v: T) => string;
  multi?: boolean;
  /** Wrap onto several lines instead of scrolling (short lists). */
  wrap?: boolean;
  accessibilityLabel?: string;
}) {
  const selected = (o: T) => (Array.isArray(value) ? (value as readonly T[]).includes(o) : value === o);
  const pills = options.map((option) => {
    const on = selected(option);
    return (
      <Pressable
        key={String(option)}
        onPress={() => onChange(option)}
        accessibilityRole={multi ? 'checkbox' : 'radio'}
        accessibilityState={multi ? { checked: on } : { selected: on }}
        accessibilityLabel={label(option)}
        className={`mb-sm mr-sm min-h-10 flex-row items-center justify-center rounded-full border px-md ${on ? 'border-primary bg-sky' : 'border-neutral-200 bg-white active:bg-neutral-50'}`}
      >
        {multi && on ? <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} /> : null}
        <Text className={`text-label ${on ? 'font-semibold text-primary' : 'text-navy'}`}>{label(option)}</Text>
      </Pressable>
    );
  });
  if (wrap) {
    return (
      <View className="flex-row flex-wrap" accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={accessibilityLabel}>
        {pills}
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={accessibilityLabel}>
      {pills}
    </ScrollView>
  );
}

export function StatusBadge({ status }: { status: PlanStatus }) {
  const m = STATUS_META[status];
  const color = { 'text-violet': colors.violet, 'text-neutral-500': colors.neutral500, 'text-primary': colors.primary, 'text-success': colors.success, 'text-warning': colors.warning }[m.text] ?? colors.navy;
  return (
    <View className={`flex-row items-center self-start rounded-full px-[8px] py-[2px] ${m.container}`} accessible accessibilityLabel={`Status: ${m.label}`}>
      <Ionicons name={m.icon} size={12} color={color} />
      <Text className={`ml-[3px] text-[11px] font-semibold ${m.text}`}>{m.label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-xs text-[12px] font-semibold uppercase tracking-[0.8px] text-neutral-500">{children}</Text>;
}
