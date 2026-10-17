import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ComponentProps, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { formatCompactNumber, formatDate, formatPercent } from '@/lib/format';
import type { Platform } from '@/types/api';

import { typeLabel } from './wording';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface CardMetric {
  icon: IconName;
  label: string;
  /** null = not provided by the platform (shown as N/A, never 0). */
  value: number | null;
  percent?: boolean;
  decimals?: number;
  suffix?: string;
}

export interface CardAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}

/** Real thumbnail, or the platform logo when the platform gave no image. Never an invented picture. */
export function PostThumb({ uri, platform, type, size }: { uri?: string; platform: Platform; type: string; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="overflow-hidden rounded-[12px] bg-sky" style={{ width: size, height: size }}>
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <View className="flex-1 items-center justify-center">
          <PlatformLogo platform={platform} size={size * 0.34} />
        </View>
      )}
      <Text className="absolute bottom-[4px] left-[4px] overflow-hidden rounded-[5px] bg-navy/80 px-[5px] py-[1px] text-[9px] font-semibold text-white">{typeLabel(type)}</Text>
    </View>
  );
}

/**
 * One post in any of the three lists, as an Instagram-style grid tile (two per row): the real
 * thumbnail on top with the rank and format over it, then caption, date, metrics and actions.
 */
export function AnalysisPostCard({
  platform,
  thumbnailUrl,
  contentType,
  caption,
  publishedAt,
  metrics,
  badge,
  comparison,
  actions,
  footnote,
}: {
  platform: Platform;
  thumbnailUrl?: string;
  contentType: string;
  caption: string;
  publishedAt: string;
  metrics: CardMetric[];
  badge?: { label: string; tone: 'good' | 'warn' };
  comparison?: string;
  actions: CardAction[];
  footnote?: string;
}) {
  const [failed, setFailed] = useState(false);
  const video = ['reel', 'short', 'video'].includes(contentType);
  return (
    <View
      className="mb-md overflow-hidden rounded-[14px] border border-neutral-100 bg-white"
      style={{ width: '48.5%', ...elevation.card }}
    >
      <View className="w-full bg-sky" style={{ aspectRatio: platform === 'youtube' ? 16 / 10 : 4 / 5 }}>
        {thumbnailUrl && !failed ? (
          <Image source={{ uri: thumbnailUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
        ) : (
          <View className="flex-1 items-center justify-center">
            <PlatformLogo platform={platform} size={34} />
          </View>
        )}
        <View className="absolute right-[6px] top-[6px] flex-row items-center rounded-[6px] bg-navy/80 px-[5px] py-[2px]">
          {video ? <Ionicons name="play" size={9} color={colors.white} style={{ marginRight: 2 }} /> : null}
          <Text className="text-[9px] font-semibold text-white">{typeLabel(contentType)}</Text>
        </View>
        {badge ? (
          <Text className={`absolute left-[6px] top-[6px] overflow-hidden rounded-[6px] px-[5px] py-[2px] text-[9px] font-bold ${badge.tone === 'good' ? 'bg-success text-white' : 'bg-warning text-white'}`}>{badge.label}</Text>
        ) : null}
      </View>

      <View className="p-sm">
        <Text className="text-[12px] font-semibold leading-[16px] text-navy" numberOfLines={2}>
          {caption || 'Untitled post'}
        </Text>
        <Text className="mt-[1px] text-[10px] text-neutral-400">{formatDate(publishedAt)}</Text>
        {comparison ? (
          <Text className="mt-[3px] text-[10px] font-medium leading-[14px] text-navy" numberOfLines={2}>
            {comparison}
          </Text>
        ) : null}

        <View className="mt-[6px] flex-row flex-wrap">
          {metrics.map((m) => (
            <View key={m.label} className="w-1/2 flex-row items-center py-[2px]" accessible accessibilityLabel={`${m.label}: ${m.value === null ? 'not available' : m.percent ? formatPercent(m.value) : m.value}`}>
              <Ionicons name={m.icon} size={11} color={colors.neutral500} />
              <Text className={`ml-[3px] text-[11px] ${m.value === null ? 'text-neutral-400' : 'font-semibold text-navy'}`} numberOfLines={1}>
                {m.value === null ? 'N/A' : `${m.percent ? formatPercent(m.value) : m.decimals !== undefined ? m.value.toLocaleString(undefined, { maximumFractionDigits: m.decimals }) : formatCompactNumber(m.value)}${m.suffix ?? ''}`}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-[6px]" style={{ gap: 6 }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              disabled={a.disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled: a.disabled }}
              className={`min-h-9 flex-row items-center justify-center rounded-[9px] px-[6px] ${a.disabled ? 'bg-neutral-100' : a.primary ? 'bg-primary active:bg-primary-dark' : 'border border-primary bg-white active:bg-sky'}`}
            >
              <Ionicons name={a.icon} size={13} color={a.disabled ? colors.neutral400 : a.primary ? colors.white : colors.primary} />
              <Text className={`ml-[4px] text-[12px] font-semibold ${a.disabled ? 'text-neutral-400' : a.primary ? 'text-white' : 'text-primary'}`} numberOfLines={1} adjustsFontSizeToFit>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {footnote ? <Text className="mt-[4px] text-[9px] leading-[12px] text-neutral-500">{footnote}</Text> : null}
      </View>
    </View>
  );
}

