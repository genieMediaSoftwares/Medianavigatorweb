import { ScrollView, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { Pill } from '@/features/connections/PlatformPicker';
import type { BestTimes, PlannerMetricKey, PlannerRange } from '@/types/api';

import { CONTENT_TYPE_LABEL } from '../presentation';

export function RangePicker({ value, onChange }: { value: PlannerRange; onChange: (d: PlannerRange) => void }) {
  return (
    <View className="mb-md">
      <SegmentedControl
        segments={[{ value: '30', label: 'Last 30 days' }, { value: '60', label: '60 days' }, { value: '90', label: '90 days' }]}
        value={String(value)}
        onChange={(v) => onChange(Number(v) as PlannerRange)}
      />
    </View>
  );
}

/** Metric and format choices, built only from what this platform actually measured. */
export function AnalysisFilters({ data, onMetric, onContentType }: { data: BestTimes; onMetric: (m: PlannerMetricKey) => void; onContentType: (t: string) => void }) {
  const types = data.contentTypes;
  const showTypes = types.length > 1;
  return (
    <View className="mb-md">
      {data.metrics.length > 1 ? (
        <>
          <Text className="mb-xs text-[12px] font-semibold uppercase tracking-[0.8px] text-neutral-500">Measure by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-sm" accessibilityRole="radiogroup">
            {data.metrics.map((m) => (
              <Pill key={m.key} selected={data.metric === m.key} onPress={() => onMetric(m.key)} label={m.label} hint={m.measuredPosts !== undefined ? `${m.measuredPosts}` : undefined} />
            ))}
          </ScrollView>
        </>
      ) : null}
      {showTypes ? (
        <>
          <Text className="mb-xs text-[12px] font-semibold uppercase tracking-[0.8px] text-neutral-500">Format</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup">
            {[{ type: 'all', count: types.reduce((a, b) => a + b.count, 0) }, ...types].map((t) => (
              <Pill key={t.type} selected={data.contentType === t.type} onPress={() => onContentType(t.type)} label={CONTENT_TYPE_LABEL[t.type] ?? t.type} hint={String(t.count)} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}
