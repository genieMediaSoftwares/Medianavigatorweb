import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { PLATFORM_META } from '@/features/connections/platforms';
import { useApiResource } from '@/hooks/useApiResource';
import type { BestTimes, PlanFormat, Platform, Weekday } from '@/types/api';

import { fetchBestTimes } from '../api';
import { parseTime, weekdayName, type LocalDate, type LocalTime } from '../dates';
import { FORMAT_CONTENT_TYPE, FORMAT_LABEL } from '../planRules';
import { blockedByPermissions, EVIDENCE, metricOf, NO_RECOMMENDATION, permissionGaps, windowsForDay } from '../presentation';

function Shell({ icon, tone = 'info', children }: { icon: 'time-outline' | 'lock-closed-outline' | 'information-circle-outline' | 'link-outline'; tone?: 'info' | 'warning'; children: React.ReactNode }) {
  return (
    <View className={`mb-lg flex-row rounded-xl border p-md ${tone === 'warning' ? 'border-warning-border bg-warning-light' : 'border-sky-border bg-sky'}`}>
      <Ionicons name={icon} size={18} color={tone === 'warning' ? colors.warning : colors.primary} style={{ marginTop: 1 }} />
      <View className="ml-sm flex-1">{children}</View>
    </View>
  );
}

const Body = ({ children }: { children: string }) => <Text className="text-[13px] leading-[19px] text-navy">{children}</Text>;

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="mr-sm mt-sm min-h-10 justify-center self-start rounded-full border border-primary bg-white px-md active:bg-sky">
      <Text className="text-label font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}

/**
 * Best-time guidance for what is being planned: the platform, the format and (when chosen) the date. Built only from
 * the existing evidence-based analysis of the account's own posts; when it can't help it says why.
 */
export function BestTimeHint({ platform, format, date, timezone, onUseTime }: {
  platform: Platform;
  format: PlanFormat | null;
  date: LocalDate | null;
  /** The plan's timezone; a time is only offered when the analysis uses the same one. */
  timezone: string;
  onUseTime?: (t: LocalTime) => void;
}) {
  const router = useRouter();
  const name = PLATFORM_META[platform].name;
  const contentType = format ? FORMAT_CONTENT_TYPE[platform][format] : undefined;
  const fetcher = useCallback(
    () => fetchBestTimes({ platform, days: 90, contentType: contentType ?? undefined }),
    [platform, contentType],
  );
  const skip = contentType === null;
  const { state, reload } = useApiResource(skip ? noop : fetcher);

  if (skip) {
    return (
      <Shell icon="information-circle-outline">
        <Body>{`${name} doesn’t share ${FORMAT_LABEL[format!].toLowerCase()} history through its API, so there’s no evidence for a best time. Plan it whenever suits you.`}</Body>
      </Shell>
    );
  }
  if (state.status === 'loading') {
    return (
      <View className="mb-lg flex-row items-center rounded-xl border border-neutral-200 p-md">
        <ActivityIndicator color={colors.primary} />
        <Text className="ml-sm text-[13px] text-neutral-500">Checking when your past posts did best…</Text>
      </View>
    );
  }
  if (state.status !== 'success' || !state.data) {
    return (
      <Shell icon="information-circle-outline">
        <Body>Best-time guidance couldn’t load. You can still plan this post.</Body>
        <Action label="Try again" onPress={reload} />
      </Shell>
    );
  }
  const data = state.data as BestTimes;
  const reconnect = () => router.push({ pathname: '/connect/[platform]', params: { platform } });

  if (data.state === 'not_connected') {
    return (
      <Shell icon="link-outline">
        <Body>{`Connect ${name} to see when your own posts did best. Planning works without it.`}</Body>
        <Action label={`Connect ${name}`} onPress={reconnect} />
      </Shell>
    );
  }
  if (blockedByPermissions(data)) {
    const gap = permissionGaps(data)[0];
    return (
      <Shell icon="lock-closed-outline" tone="warning">
        <Body>{`${gap.name} hasn’t shared the insights needed to calculate your best posting times. Reconnect and allow ${gap.missing.join(', ')}.`}</Body>
        <Action label={`Reconnect ${gap.name}`} onPress={reconnect} />
      </Shell>
    );
  }
  const a = data.analysis!;
  const metric = metricOf(data).label.toLowerCase();
  const sameZone = data.timezone === timezone;
  const what = format ? `${FORMAT_LABEL[format].toLowerCase()}s` : 'posts';
  const day = date ? (weekdayName(date) as Weekday) : null;
  const options = day ? windowsForDay(data, day).slice(0, 2) : [];
  const rec = a.recommendation;
  const start = (range: string) => parseTime(range.split(' – ')[0]);

  if (day && options.length) {
    return (
      <Shell icon="time-outline">
        <Body>{`On ${day}s, your recent comparable ${what} suggest ${options.map((o) => `${o.label.toLowerCase()} (${o.range})`).join(' or ')} ${options.length > 1 ? 'are promising windows' : 'is a promising window'}.`}</Body>
        <Text className="mt-xs text-[12px] text-neutral-500">{`${EVIDENCE[options[0].slot.evidence].label} · ${options[0].slot.posts} posts · measured by ${metric} · ${data.timezone}`}</Text>
        {onUseTime && sameZone ? options.map((o) => {
          const narrow = rec && rec.day === day && rec.window === o.slot.window ? rec.narrowStartTime : null;
          const t = parseTime(narrow ?? '') ?? start(o.range);
          return t ? <Action key={o.slot.window} label={`Use ${narrow ?? o.range.split(' – ')[0]}`} onPress={() => onUseTime(t)} /> : null;
        }) : null}
        {!sameZone ? <Text className="mt-xs text-[12px] text-neutral-500">{`These times are in ${data.timezone}, not ${timezone}. Set your timezone in Profile → Preferences to plan with them.`}</Text> : null}
      </Shell>
    );
  }
  if (rec) {
    return (
      <Shell icon="time-outline">
        <Body>{`${day ? `No ${day} slot stands out yet. ` : ''}Your recent comparable ${what} did best on ${rec.day} ${rec.windowLabel.toLowerCase()} (${rec.timeRange}).`}</Body>
        <Text className="mt-xs text-[12px] text-neutral-500">{`${EVIDENCE[rec.evidence].label} · ${rec.posts} posts · measured by ${metric} · ${data.timezone}${rec.preliminary ? ' · preliminary' : ''}`}</Text>
      </Shell>
    );
  }
  const reason = a.noRecommendationReason ? NO_RECOMMENDATION[a.noRecommendationReason](data) : null;
  return (
    <Shell icon="information-circle-outline">
      <Body>{reason ? `${reason.title}. ${reason.message}` : 'No posting window stands out yet.'}</Body>
    </Shell>
  );
}

const noop = () => Promise.resolve(null as unknown as BestTimes);
