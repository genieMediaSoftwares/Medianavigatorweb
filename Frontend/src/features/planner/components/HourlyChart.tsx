import { Text, View } from 'react-native';

import { elevation } from '@/constants/theme';
import type { BestTimes } from '@/types/api';

import { metricOf } from '../presentation';

const BAR_AREA = 96;
const HEAT_BG = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const;
const hourShort = (h: number) => (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`);

/** 24 bars, one per local hour, all days combined. Bar height is the score relative to typical (50). */
export function HourlyChart({ data }: { data: BestTimes }) {
  const analysis = data.analysis!;
  const metric = metricOf(data);
  const used = analysis.hours.filter((h) => h.score !== null);
  if (used.length < 2) return null;
  const best = analysis.bestHours;
  const inBest = (h: number) => best !== null && (h === best.startHour || h === (best.startHour + 1) % 24);
  const scores = used.map((h) => h.score!);
  const lo = Math.min(...scores), hi = Math.max(...scores);

  return (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      <Text className="text-title text-navy" accessibilityRole="header">
        Best hours of the day
      </Text>
      <Text className="mb-md mt-xs text-caption text-neutral-500">
        {`Every day combined, in ${data.timezone}. Taller bars = posts at that hour got more ${metric.label.toLowerCase()} than expected for their format and period.`}
      </Text>

      {best ? (
        <View className="mb-md self-start rounded-full border border-sky-border bg-sky px-md py-xs" accessible accessibilityLabel={`Strongest hours: ${best.range}, from ${best.posts} posts`}>
          <Text className="text-label font-semibold text-primary">{`Strongest hours: ${best.range} · ${best.posts} posts`}</Text>
        </View>
      ) : null}

      <View className="flex-row items-end" style={{ height: BAR_AREA, gap: 2 }} accessibilityRole="image" accessibilityLabel={`Hourly chart. ${used.length} hours have posts.`}>
        {analysis.hours.map((h) => {
          if (h.score === null) {
            return <View key={h.hour} className="flex-1 rounded-sm border border-dashed border-neutral-200" style={{ height: 6 }} />;
          }
          const t = hi === lo ? 0.5 : (h.score - lo) / (hi - lo);
          const level = Math.min(4, Math.floor(t * 5));
          return (
            <View
              key={h.hour}
              className={`flex-1 rounded-t-sm ${HEAT_BG[level]} ${inBest(h.hour) ? 'border-2 border-navy' : ''}`}
              style={{ height: 14 + t * (BAR_AREA - 14) }}
            />
          );
        })}
      </View>
      <View className="mt-xs flex-row justify-between">
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
          <Text key={h} className="text-[10px] text-neutral-500">
            {hourShort(h)}
          </Text>
        ))}
      </View>
      <Text className="mt-sm text-[12px] text-neutral-500">
        Dashed marks are hours you haven’t posted at, so nothing is known about them yet. Neighbouring hours are blended slightly to steady thin data.
      </Text>
    </View>
  );
}
