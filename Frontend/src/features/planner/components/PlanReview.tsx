import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { useApiResource } from '@/hooks/useApiResource';
import { formatCompactNumber, formatPercent } from '@/lib/format';
import type { Plan } from '@/types/api';

import { fetchPlanReview } from '../api';
import { formatDay, formatTime, utcToZoned } from '../dates';
import { openAnalysis } from '../navigation';

const fmt = (key: string, v: number) => (key === 'engagementRate' ? formatPercent(v, 1) : key === 'watchTimeMinutes' ? `${formatCompactNumber(Math.round(v))} min` : formatCompactNumber(v));

/** Results of the published post, next to comparable posts, with the way back into analysis and the next plan. */
export function PlanReview({ plan, timezone, onLink }: { plan: Plan; timezone: string; onLink: () => void }) {
  const router = useRouter();
  const fetcher = useCallback(() => fetchPlanReview(plan.id), [plan.id]);
  const { state, reload } = useApiResource(fetcher);

  const shell = (children: React.ReactNode) => (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      <Text className="mb-sm text-title text-navy" accessibilityRole="header">How it did</Text>
      {children}
    </View>
  );

  if (state.status === 'loading') return shell(<ActivityIndicator color={colors.primary} />);
  if (state.status !== 'success') return shell(<><Text className="mb-sm text-label text-neutral-500">Results couldn’t load.</Text><Button title="Try again" variant="secondary" size="sm" onPress={reload} /></>);
  const r = state.data;
  if (r.state === 'not_linked') {
    return shell(
      <>
        <Text className="mb-md text-label font-normal text-neutral-500">This was marked published without linking a synced post, so there are no results to show. Link it once the post has synced.</Text>
        <Button title="Link the published post" variant="secondary" size="sm" icon="link-outline" onPress={onLink} />
      </>,
    );
  }
  if (r.state === 'post_unavailable') return shell(<Text className="text-label font-normal text-neutral-500">The linked post is no longer in your synced posts (the account may be disconnected).</Text>);
  if (r.state !== 'ready') return null;

  const local = utcToZoned(r.post.publishedAt, plan.timezone ?? timezone);
  const shown = r.metrics.filter((m) => m.value !== null);
  return shell(
    <>
      <Text className="mb-md text-[12px] text-neutral-500">{`Published ${formatDay(local.date)} at ${formatTime(local.time)} · ${r.post.contentType}`}</Text>
      {r.insightsAvailable ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {shown.map((m) => (
            <View key={m.key} className="min-w-[46%] flex-1 rounded-lg bg-canvas px-md py-sm" accessible accessibilityLabel={`${m.label}: ${fmt(m.key, m.value!)}${m.comparison?.diffPct != null ? `, ${m.comparison.diffPct}% versus comparable posts` : ''}`}>
              <Text className="text-[12px] text-neutral-500">{m.label}</Text>
              <Text className="text-title text-navy">{fmt(m.key, m.value!)}</Text>
              {m.comparison && m.comparison.diffPct !== null ? (
                <Text className={`text-[12px] ${m.comparison.diffPct >= 0 ? 'text-success' : 'text-danger'}`}>{`${m.comparison.diffPct >= 0 ? '+' : ''}${m.comparison.diffPct}% vs typical (${fmt(m.key, m.comparison.median)})`}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-label font-normal text-neutral-500">Performance insights aren’t available yet.</Text>
      )}
      {r.metrics.some((m) => m.value === null) && r.insightsAvailable ? (
        <Text className="mt-sm text-[12px] text-neutral-500">{`Not reported by the platform: ${r.metrics.filter((m) => m.value === null).map((m) => m.label.toLowerCase()).join(', ')}.`}</Text>
      ) : null}
      <Text className="mt-sm text-[12px] text-neutral-500">
        {`Compared with the median of your ${r.post.contentType} posts from the previous ${r.comparedWith.days} days (${r.comparedWith.posts} posts; at least 5 needed per number).${r.maturing ? ' Published under 48 hours ago, so numbers are still growing.' : ''}`}
      </Text>

      <View className="mt-md flex-row flex-wrap" style={{ gap: 8 }}>
        <Button title="Deep Analysis" variant="secondary" size="sm" icon="sparkles-outline" onPress={() => openAnalysis(router, r.post.mediaId, 'deep')} />
        {r.analyses.includes('why_top') ? <Button title="Why Top?" variant="ghost" size="sm" onPress={() => openAnalysis(router, r.post.mediaId, 'why_top')} /> : null}
        {r.analyses.includes('why_bottom') ? <Button title="Why Bottom?" variant="ghost" size="sm" onPress={() => openAnalysis(router, r.post.mediaId, 'why_bottom')} /> : null}
      </View>

      <Text className="mb-xs mt-lg text-label font-semibold text-navy">Plan next content</Text>
      {r.nextIdeas.length ? (
        r.nextIdeas.map((idea) => (
          <View key={idea.index} className="mb-sm rounded-lg border border-neutral-100 p-sm">
            <Text className="text-[13px] leading-[19px] text-navy">{idea.text}</Text>
            <View className="mt-xs self-start">
              <Button
                title="Plan this idea"
                variant="ghost"
                size="sm"
                icon="add-circle-outline"
                onPress={() => router.push({ pathname: '/planner/new', params: { sourceMediaId: r.post.mediaId, sourceType: idea.analysisType, recIndex: String(idea.index), recText: idea.text, platform: r.post.platform, format: r.post.contentType } })}
              />
            </View>
          </View>
        ))
      ) : (
        <Text className="text-[13px] text-neutral-500">Run a Deep Analysis of this post to get evidence-based ideas for what to post next.</Text>
      )}
    </>,
  );
}
