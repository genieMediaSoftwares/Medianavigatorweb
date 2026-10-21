import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { DAY_NAMES } from '@/lib/format';
import type { BestTimes, PlannerSlot } from '@/types/api';

import { cellValue, DAY_SHORT, EVIDENCE, metricOf, slotAt } from '../presentation';

const HEAT_BG = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const;
const HEAT_TEXT = ['text-navy', 'text-navy', 'text-navy', 'text-white', 'text-white'] as const;

const LABEL_WIDTH = 78;
const GAP = 6;
/** Below this a cell can't fit its value and post count, so the grid scrolls sideways instead of shrinking. */
const MIN_CELL = 54;

function Cell({ slot, data, best, width, onPress }: { slot: PlannerSlot; data: BestTimes; best: boolean; width: number; onPress: () => void }) {
  const empty = slot.posts === 0;
  const level = slot.level ?? 0;
  const windowLabel = data.windows.find((w) => w.key === slot.window)?.label ?? slot.window;
  const value = cellValue(slot, data);
  const a11y = empty
    ? `${slot.day} ${windowLabel}: no posts analysed`
    : `${slot.day} ${windowLabel}: ${data.analysis?.aggregate ? `score ${value}` : `median ${value}`}, ${slot.posts} post${slot.posts === 1 ? '' : 's'}, ${EVIDENCE[slot.evidence].label}${best ? ', your best time' : ''}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Shows the details for this time slot"
      style={{ width, ...(best ? elevation.float : null) }}
      className={`h-[58px] items-center justify-center rounded-lg ${
        empty ? 'border border-dashed border-neutral-300 bg-white active:bg-neutral-50' : `${HEAT_BG[level]} active:opacity-80`
      } ${best ? 'border-2 border-navy' : ''}`}
    >
      {empty ? (
        <Text className="text-center text-[11px] text-neutral-400">No posts</Text>
      ) : (
        <>
          <Text className={`text-[14px] font-bold ${HEAT_TEXT[level]}`} numberOfLines={1}>
            {value}
          </Text>
          <Text className={`text-[11px] ${HEAT_TEXT[level]} opacity-90`} numberOfLines={1}>
            {`${slot.posts} post${slot.posts === 1 ? '' : 's'}`}
          </Text>
        </>
      )}
      {best ? (
        <View className="absolute right-[3px] top-[3px]">
          <Ionicons name="star" size={11} color={level >= 3 ? colors.white : colors.navy} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Weekday × time-of-day grid. Color shows relative performance; the number and an icon carry the same meaning. */
export function WeeklyHeatmap({ data, onSelect }: { data: BestTimes; onSelect: (slot: PlannerSlot) => void }) {
  const { width: screen } = useWindowDimensions();
  const analysis = data.analysis!;
  const metric = metricOf(data);
  const rec = analysis.recommendation;
  // Screen padding (24 × 2) + card padding (16 × 2).
  const available = Math.min(screen, 1100) - 80;
  const fitted = (available - LABEL_WIDTH - GAP * 7) / 7;
  const cell = Math.max(MIN_CELL, fitted);
  const scrolls = fitted < MIN_CELL;

  const grid = (
    <View>
      <View className="flex-row" style={{ gap: GAP, marginBottom: GAP }}>
        <View style={{ width: LABEL_WIDTH }} />
        {DAY_NAMES.map((d) => (
          <Text key={d} style={{ width: cell }} className="text-center text-[13px] font-semibold text-neutral-500">
            {DAY_SHORT[d]}
          </Text>
        ))}
      </View>
      {data.windows.map((w) => (
        <View key={w.key} className="flex-row items-center" style={{ gap: GAP, marginBottom: GAP }}>
          <View style={{ width: LABEL_WIDTH }}>
            <Text className="text-[13px] font-semibold text-navy">{w.label}</Text>
            <Text className="text-[10px] text-neutral-500" numberOfLines={2}>
              {w.range}
            </Text>
          </View>
          {DAY_NAMES.map((d) => {
            const slot = slotAt(data, d, w.key);
            return <Cell key={d} slot={slot} data={data} width={cell} best={rec?.day === d && rec.window === w.key} onPress={() => onSelect(slot)} />;
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      <Text className="text-title text-navy" accessibilityRole="header">
        Your week
      </Text>
      <Text className="mb-md mt-xs text-caption text-neutral-500">
        {analysis.aggregate
          ? `Each square shows a performance score (50 = your typical post) and how many posts it’s based on. Times are in ${data.timezone}.`
          : `Each square shows the median ${metric.label.toLowerCase()} of posts published then, and how many posts it’s based on. Times are in ${data.timezone}.`}
      </Text>

      {scrolls ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityHint="Scroll sideways to see every day">
          {grid}
        </ScrollView>
      ) : (
        grid
      )}

      <View className="mt-sm flex-row flex-wrap items-center" accessibilityRole="summary">
        {[
          { level: 0, label: 'Lower' },
          { level: 2, label: 'Moderate' },
          { level: 4, label: 'Higher' },
        ].map((l) => (
          <View key={l.level} className="mr-lg mt-xs flex-row items-center">
            <View className={`h-[14px] w-[14px] rounded-sm ${HEAT_BG[l.level]}`} />
            <Text className="ml-xs text-[12px] text-neutral-500">{`${l.label} relative performance`}</Text>
          </View>
        ))}
        {rec ? (
          <View className="mt-xs flex-row items-center">
            <Ionicons name="star" size={12} color={colors.navy} />
            <Text className="ml-xs text-[12px] text-neutral-500">Best time</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-sm text-[12px] text-neutral-500">
        Tap a square for details.{scrolls ? ' Scroll sideways to see the whole week.' : ''} Shading compares your slots with each other, not with other accounts.
      </Text>
    </View>
  );
}
