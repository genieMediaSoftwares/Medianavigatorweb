import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import type { BestTimes, BestTimeRecommendation, EvidenceLevel } from '@/types/api';

import { describeLift, EVIDENCE, formatMetric, metricOf, NO_RECOMMENDATION } from '../presentation';

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const e = EVIDENCE[level];
  return (
    <View className={`flex-row items-center self-start rounded-full border px-sm py-[3px] ${e.container}`} accessible accessibilityLabel={e.label}>
      <Ionicons name={e.icon} size={13} color={e.color} />
      <Text className={`ml-xs text-[12px] font-semibold ${e.text}`}>{e.label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-sm mt-sm min-w-[96px] flex-1 rounded-lg bg-canvas px-md py-sm" accessible accessibilityLabel={`${label}: ${value}`}>
      <Text className="text-[12px] text-neutral-500">{label}</Text>
      <Text className="mt-[2px] text-title text-navy">{value}</Text>
    </View>
  );
}

function Recommendation({ rec, data, onPlan }: { rec: BestTimeRecommendation; data: BestTimes; onPlan: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const metric = metricOf(data);
  const reachGoal = metric.unit === 'count';
  const lift = describeLift(rec.liftPct);
  const aggregate = data.analysis?.aggregate;

  const actions = (
    <View className={wide ? 'ml-xl items-end' : 'mt-lg'} style={wide ? { width: 220 } : undefined}>
      <EvidenceBadge level={rec.evidence} />
      <View className={wide ? 'mt-md self-stretch' : 'mt-md'}>
        <Button title="Plan a post" icon="add-circle-outline" onPress={onPlan} />
      </View>
    </View>
  );

  return (
    <>
      <View className={wide ? 'flex-row items-start' : ''}>
        <View className={wide ? 'flex-1' : ''}>
          <Text className="text-overline uppercase tracking-[1.2px] text-neutral-500">
            {reachGoal ? `Your best time to reach more people` : 'Your best time to post'}
          </Text>
          <Text className="mt-sm text-heading text-navy" accessibilityRole="header">{`${rec.day} — ${rec.windowLabel}`}</Text>
          <Text className="mt-[2px] text-body font-semibold text-navy">{`${rec.timeRange} (${data.timezone})`}</Text>
          {rec.narrowRange ? (
            <View className="mt-sm flex-row items-center">
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text className="ml-xs flex-1 text-label text-primary">{`Aim for ${rec.narrowRange}: the strongest 2 hours in this slot`}</Text>
            </View>
          ) : null}
          <Text className="mt-sm text-label font-normal text-neutral-500">
            {`Based on ${rec.posts} posts in this slot and ${data.analysis!.eligiblePosts} overall from the last ${data.days} days${
              aggregate ? ', all connected accounts combined' : data.scope[0] ? ` on ${data.scope[0].handle}` : ''
            }. Each post was compared with what was expected for its format and the period it went out in.`}
          </Text>
        </View>
        {wide ? actions : null}
      </View>

      <View className="mt-xs flex-row flex-wrap">
        {!aggregate ? <Stat label={`Median ${metric.label.toLowerCase()} here`} value={formatMetric(rec.median, metric.unit)} /> : null}
        {!aggregate ? <Stat label="Your typical post" value={formatMetric(data.analysis!.baseline.median, metric.unit)} /> : <Stat label="Performance score" value={`${rec.score} / 100`} />}
        <Stat label={reachGoal ? 'Beat expected reach' : 'Beat expected result'} value={`${Math.round(rec.shareAboveTypical * 100)}% of posts`} />
      </View>
      {lift ? <Text className="mt-sm text-label font-semibold text-navy">{lift}</Text> : null}

      {rec.preliminary ? (
        <View className="mt-md flex-row rounded-lg border border-warning-border bg-warning-light p-md">
          <Ionicons name="alert-circle" size={18} color={colors.warning} />
          <Text className="ml-sm flex-1 text-label font-normal text-warning">
            Preliminary: this is the strongest slot so far, but there aren’t enough posts to be confident. Treat it as something to test, not a rule.
          </Text>
        </View>
      ) : null}

      {wide ? null : actions}
      <Text className="mt-sm text-[12px] text-neutral-500">
        {`An estimate from your own history, not a guarantee: content, format, topic and ${reachGoal ? 'the platform’s distribution' : 'audience'} matter too.`}
      </Text>
    </>
  );
}

/** The headline card: the best slot with its evidence, or an honest explanation of why there isn't one. */
export function BestTimeCard({ data, onPlan }: { data: BestTimes; onPlan: () => void }) {
  const analysis = data.analysis!;
  const empty = analysis.noRecommendationReason ? NO_RECOMMENDATION[analysis.noRecommendationReason](data) : null;
  return (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      {analysis.recommendation ? (
        <Recommendation rec={analysis.recommendation} data={data} onPlan={onPlan} />
      ) : (
        <>
          <View className="flex-row items-start justify-between">
            <Text className="text-overline uppercase tracking-[1.2px] text-neutral-500">Your best time to post</Text>
            <EvidenceBadge level="insufficient" />
          </View>
          <Text className="mt-sm text-title text-navy" accessibilityRole="header">{empty?.title}</Text>
          <Text className="mt-xs text-label font-normal text-neutral-500">{empty?.message}</Text>
          <View className="mt-lg">
            <Button title="Plan a post anyway" icon="add-circle-outline" variant="secondary" onPress={onPlan} />
          </View>
        </>
      )}
    </View>
  );
}
