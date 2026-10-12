import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { colors, platformColors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { formatCompactNumber, formatPercent, NOT_AVAILABLE } from '@/lib/format';
import type { Connection, Platform } from '@/types/api';

import { PLATFORM_ACCOUNT_NOUN, PLATFORM_CONTENT_TYPES, PLATFORM_META, statusView } from './platforms';

/** Measured numbers for a connected account. null = not provided by the platform or not synced yet. */
export interface PlatformCardMetrics {
  totalPosts: number | null;
  totalViews: number | null;
  engagementRate: number | null;
}

interface PlatformDashboardCardProps {
  platform: Platform;
  /** The platform's entry from GET /connections. */
  connection: Connection;
  metrics: PlatformCardMetrics | null;
  onConnect: () => void;
  onManage: () => void;
  /** Enabled only once the server reports the account as connected (after a token / API key connect). */
  onViewAnalysis?: () => void;
}

function StatusPill({ connection }: { connection: Connection }) {
  const view = statusView(connection);
  const connected = connection.connected && !view.needsReconnect;
  return (
    <View
      className="flex-row items-center rounded-full px-[7px] py-[3px]"
      style={{ backgroundColor: connected ? colors.successLight : connection.connected ? colors.warningLight : 'rgba(238, 242, 247, 0.9)' }}
    >
      {connection.connected ? (
        <Ionicons name={view.icon} size={11} color={view.color} />
      ) : (
        <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: colors.neutral500 }} />
      )}
      <Text className="ml-[3px] text-[10px] font-medium" style={{ color: view.color }} numberOfLines={1}>
        {view.label}
      </Text>
    </View>
  );
}

function Metric({ value, label, divider }: { value: string | null; label: string; divider: boolean }) {
  return (
    <View
      className="flex-1 items-center px-[2px]"
      style={divider ? { borderLeftWidth: 1, borderLeftColor: colors.neutral200 } : undefined}
      accessible
      accessibilityLabel={`${label}: ${value ?? NOT_AVAILABLE}`}
    >
      <Text
        className={value === null ? 'text-[10px] font-medium leading-[18px] text-neutral-400' : 'text-[16px] font-bold leading-[20px] text-navy'}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value ?? NOT_AVAILABLE}
      </Text>
      <Text className="mt-[2px] text-[10px] text-neutral-500" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

function CardButton({ title, onPress, variant, disabled = false }: { title: string; onPress: () => void; variant: 'primary' | 'outline' | 'neutral'; disabled?: boolean }) {
  const container = disabled
    ? 'bg-neutral-300'
    : variant === 'primary'
      ? 'bg-primary active:bg-primary-dark'
      : variant === 'outline'
        ? 'border border-primary bg-white active:bg-sky'
        : 'border border-neutral-300 bg-white active:bg-neutral-50';
  const text = disabled || variant === 'primary' ? 'text-white' : variant === 'outline' ? 'text-primary' : 'text-navy';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      className={`min-h-10 items-center justify-center rounded-[10px] px-[6px] ${container}`}
      style={{ flex: variant === 'primary' || disabled ? 1.25 : 1, opacity: disabled ? 0.85 : 1 }}
    >
      <Text className={`text-[13px] font-semibold ${text}`} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
    </Pressable>
  );
}

/**
 * One platform on the Dashboard. Everything shown comes from the API: the connection state from
 * GET /connections and, once connected, measured numbers from the platform's latest sync.
 */
export function PlatformDashboardCard({ platform, connection, metrics, onConnect, onManage, onViewAnalysis }: PlatformDashboardCardProps) {
  const meta = PLATFORM_META[platform];
  const tint = platformColors[platform];
  const connected = connection.connected;
  const needsReconnect = connected && statusView(connection).needsReconnect;

  return (
    <View
      className="flex-1 rounded-[18px]"
      style={{ backgroundColor: colors.white, ...elevation.card }}
    >
      <LinearGradient
        colors={tint.tint}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 18, borderWidth: 1, borderColor: tint.border, padding: 12, justifyContent: 'space-between' }}
      >
        <View>
          <View className="items-end">
            <StatusPill connection={connection} />
          </View>
          <View className="-mt-[6px] flex-row items-center">
            <PlatformLogo platform={platform} size={40} />
            <View className="ml-[8px] flex-1">
              <Text className="text-[15px] font-bold leading-[20px] text-navy" numberOfLines={1}>
                {meta.name}
              </Text>
              <Text className="text-[11px] leading-[15px] text-neutral-500" numberOfLines={2}>
                {PLATFORM_CONTENT_TYPES[platform]}
              </Text>
            </View>
          </View>

          {connected ? (
            <View className="mt-md flex-row border-y border-neutral-200 py-[10px]">
              <Metric label="Total Posts" value={metrics?.totalPosts != null ? metrics.totalPosts.toLocaleString() : null} divider={false} />
              <Metric label="Total Views" value={metrics?.totalViews != null ? formatCompactNumber(metrics.totalViews) : null} divider />
              <Metric label="Eng. Rate" value={metrics?.engagementRate != null ? formatPercent(metrics.engagementRate, 1) : null} divider />
            </View>
          ) : (
            <View className="mt-md items-center">
              <View className="h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: 'rgba(59, 108, 246, 0.08)' }}>
                <Ionicons name="bar-chart" size={18} color={colors.primaryBright} style={{ opacity: 0.55 }} />
              </View>
              <Text className="mt-sm text-center text-[11px] leading-[15px] text-neutral-500">
                {`Connect your ${meta.name} ${PLATFORM_ACCOUNT_NOUN[platform]} to unlock analytics and insights.`}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-md flex-row" style={{ gap: 6 }}>
          {!connected ? (
            <CardButton title="Connect" variant="outline" onPress={onConnect} />
          ) : needsReconnect ? (
            <CardButton title="Reconnect" variant="outline" onPress={onConnect} />
          ) : (
            <CardButton title="Manage" variant="neutral" onPress={onManage} />
          )}
          {onViewAnalysis ? <CardButton title="View Analysis" variant="primary" onPress={onViewAnalysis} disabled={!connected} /> : null}
        </View>
      </LinearGradient>
    </View>
  );
}
