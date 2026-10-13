import { Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { KeyValue } from '@/components/Card';
import { Button } from '@/components/ui/Button';
import type { BestTimes, PlannerSlot } from '@/types/api';

import { describeLift, EVIDENCE, formatMetric, metricOf, suggestion } from '../presentation';
import { EvidenceBadge } from './BestTimeCard';

/** Everything known about one weekday × time slot, plus a suggested next step. */
export function SlotDetailSheet({ slot, data, onClose, onPlan }: { slot: PlannerSlot | null; data: BestTimes; onClose: () => void; onPlan: (slot: PlannerSlot) => void }) {
  if (!slot) return null;
  const metric = metricOf(data);
  const window = data.windows.find((w) => w.key === slot.window)!;
  const aggregate = data.analysis?.aggregate;
  const minSlot = data.method.thresholds.minSlotPosts;
  const baseline = data.analysis?.baseline;

  return (
    <BottomSheet visible onClose={onClose} title={`${slot.day} ${window.label}`}>
      <Text className="-mt-xs mb-md text-label font-normal text-neutral-500">{`${window.range} · ${data.timezone}`}</Text>
      <EvidenceBadge level={slot.evidence} />
      <Text className="mb-md mt-xs text-caption text-neutral-500">{EVIDENCE[slot.evidence].explain}</Text>

      <View className="rounded-xl bg-neutral-50 px-lg py-sm">
        <KeyValue label="Posts analysed" value={String(slot.posts)} />
        {slot.posts > 0 ? (
          <>
            {!aggregate ? (
              <>
                <KeyValue label={`Average ${metric.label.toLowerCase()}`} value={formatMetric(slot.mean, metric.unit)} />
                <KeyValue label={`Median ${metric.label.toLowerCase()}`} value={slot.posts >= minSlot ? formatMetric(slot.median, metric.unit) : `Needs ${minSlot}+ posts`} />
                <KeyValue label="Your typical post (median)" value={formatMetric(baseline?.median ?? null, metric.unit)} />
              </>
            ) : null}
            <KeyValue label="Performance score" value={`${slot.score} / 100 (50 = typical)`} />
            <KeyValue label="Beat your typical post" value={`${Math.round((slot.shareAboveTypical ?? 0) * 100)}% of posts`} />
            {describeLift(slot.liftPct) && slot.posts >= minSlot ? <KeyValue label="Compared with baseline" value={describeLift(slot.liftPct)!} /> : null}
          </>
        ) : null}
      </View>

      <View className="mt-md rounded-xl border border-sky-border bg-sky p-md">
        <Text className="text-label font-semibold text-navy">Suggested action</Text>
        <Text className="mt-xs text-label font-normal text-navy-light">{suggestion(slot, minSlot)}</Text>
      </View>

      <Text className="mt-md text-[12px] text-neutral-500">{`${metric.label}: ${metric.description}`}</Text>
      <View className="mb-sm mt-lg">
        <Button title={`Plan a post for ${slot.day} ${window.label.toLowerCase()}`} variant="secondary" icon="add-circle-outline" onPress={() => onPlan(slot)} />
      </View>
    </BottomSheet>
  );
}
