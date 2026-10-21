import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { colors } from '@/constants/colors';

import { addDays, addMonths, compareDates, formatDay, formatMonth, monthGrid, weekDates, type LocalDate } from '../dates';

export type CalendarView = 'week' | 'month';
type Counts = Map<LocalDate, { total: number; missed: number; published: number }>;

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Day({ date, today, selected, inMonth = true, count, compact, onPress }: {
  date: LocalDate; today: LocalDate; selected: boolean; inMonth?: boolean; compact: boolean;
  count?: { total: number; missed: number; published: number }; onPress: () => void;
}) {
  const past = compareDates(date, today) < 0;
  const isToday = date === today;
  const day = Number(date.slice(8));
  const n = count?.total ?? 0;
  const a11y = `${formatDay(date)}${isToday ? ', today' : ''}${n ? `, ${n} plan${n === 1 ? '' : 's'}` : ', no plans'}${count?.missed ? `, ${count.missed} missed` : ''}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      className={`flex-1 items-center justify-center rounded-lg ${compact ? 'min-h-11' : 'min-h-[52px]'} ${selected ? 'bg-navy' : isToday ? 'border border-primary bg-sky' : 'active:bg-neutral-50'}`}
    >
      <Text
        className={`text-[15px] ${selected ? 'font-bold text-white' : isToday ? 'font-bold text-primary' : past || !inMonth ? 'text-neutral-400' : 'font-semibold text-navy'}`}
      >
        {day}
      </Text>
      <View className="mt-[3px] h-[6px] flex-row items-center" style={{ gap: 2 }}>
        {n ? (
          <>
            <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: count?.missed ? colors.warning : selected ? colors.white : colors.primary }} />
            {n > 1 ? <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: selected ? colors.white : colors.primary, opacity: 0.6 }} /> : null}
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Week strip or month grid of real dates (in the planner's timezone). Dots mark dates with plans; amber = missed.
 * Past dates are muted, today is outlined, the selected date is filled.
 */
export function Calendar({ today, selected, onSelect, view, onView, counts, compact = false }: {
  today: LocalDate;
  selected: LocalDate;
  onSelect: (d: LocalDate) => void;
  view: CalendarView;
  onView?: (v: CalendarView) => void;
  counts?: Counts;
  compact?: boolean;
}) {
  const step = (dir: 1 | -1) => onSelect(view === 'week' ? addDays(selected, dir * 7) : addMonths(selected, dir));
  const days = view === 'week' ? weekDates(selected).map((date) => ({ date, inMonth: true })) : monthGrid(selected);
  const offToday = view === 'week' ? !weekDates(selected).includes(today) : selected.slice(0, 7) !== today.slice(0, 7);

  return (
    <View>
      <View className="mb-sm flex-row items-center">
        <IconButton icon="chevron-back" accessibilityLabel={view === 'week' ? 'Previous week' : 'Previous month'} onPress={() => step(-1)} />
        <Text className="flex-1 text-center text-title text-navy" accessibilityRole="header" accessibilityLiveRegion="polite">
          {formatMonth(view === 'week' ? weekDates(selected)[3] : selected)}
        </Text>
        <IconButton icon="chevron-forward" accessibilityLabel={view === 'week' ? 'Next week' : 'Next month'} onPress={() => step(1)} />
      </View>
      <View className="mb-xs flex-row">
        {DOW.map((d, i) => (
          <Text key={i} className="flex-1 text-center text-[11px] font-semibold text-neutral-500" importantForAccessibility="no">
            {d}
          </Text>
        ))}
      </View>
      {Array.from({ length: days.length / 7 }, (_, row) => (
        <View key={row} className="mb-[4px] flex-row" style={{ gap: 4 }}>
          {days.slice(row * 7, row * 7 + 7).map((d) => (
            <Day key={d.date} date={d.date} inMonth={d.inMonth} today={today} selected={d.date === selected} count={counts?.get(d.date)} compact={compact || view === 'month'} onPress={() => onSelect(d.date)} />
          ))}
        </View>
      ))}
      {onView || offToday ? (
        <View className="mt-xs flex-row items-center" style={{ gap: 8 }}>
          {onView ? (
            <View className="flex-1">
              <SegmentedControl segments={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={view} onChange={(v) => onView(v as CalendarView)} />
            </View>
          ) : <View className="flex-1" />}
          {offToday ? (
            <Pressable onPress={() => onSelect(today)} accessibilityRole="button" accessibilityLabel="Go to today" className="min-h-10 flex-row items-center rounded-full border border-neutral-200 px-md active:bg-neutral-50">
              <Ionicons name="today-outline" size={15} color={colors.primary} />
              <Text className="ml-xs text-label font-semibold text-primary">Today</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
