import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { colors } from '@/constants/colors';
import { formatRelativeTime } from '@/lib/format';
import type { AccountScope, Connection } from '@/types/api';

import { PLATFORM_META, PLATFORM_ORDER } from './platforms';

// Shared by the Planner and Analysis tabs so both pick platforms and handles the same way.

export function Pill({ selected, onPress, label, children, hint }: { selected: boolean; onPress: () => void; label: string; children?: ReactNode; hint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      className={`mr-sm min-h-11 flex-row items-center rounded-full border px-md ${selected ? 'border-primary bg-sky' : 'border-neutral-200 bg-white active:bg-neutral-50'}`}
    >
      {children}
      <Text className={`text-label ${selected ? 'font-semibold text-primary' : 'text-navy'}`}>{label}</Text>
      {hint ? <Text className="ml-xs text-[11px] text-neutral-400">{hint}</Text> : null}
    </Pressable>
  );
}

/** Platform (each platform holds one connected account) and the optional all-accounts view. */
export function PlatformPicker({ connections, value, onChange }: { connections: Connection[]; value: AccountScope; onChange: (p: AccountScope) => void }) {
  const connectedCount = connections.filter((c) => c.connected).length;
  const selected = value === 'all' ? null : connections.find((c) => c.platform === value);
  return (
    <View className="mb-md">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup">
        {PLATFORM_ORDER.map((p) => {
          const c = connections.find((x) => x.platform === p);
          return (
            <Pill key={p} selected={value === p} onPress={() => onChange(p)} label={PLATFORM_META[p].name} hint={c?.connected ? undefined : 'not connected'}>
              <View className="mr-xs">
                <PlatformLogo platform={p} size={20} />
              </View>
            </Pill>
          );
        })}
        {connectedCount > 1 ? (
          <Pill selected={value === 'all'} onPress={() => onChange('all')} label="All accounts">
            <Ionicons name="layers-outline" size={16} color={value === 'all' ? colors.primary : colors.navy} style={{ marginRight: 4 }} />
          </Pill>
        ) : null}
      </ScrollView>
      {selected?.connected ? (
        <View className="mt-sm flex-row items-center" accessible accessibilityLabel={`Account ${selected.accountHandle}`}>
          <Ionicons name="person-circle-outline" size={16} color={colors.neutral500} />
          <Text className="ml-xs text-caption text-neutral-500" numberOfLines={1}>
            {`${selected.accountHandle} · synced ${formatRelativeTime(selected.lastSyncedAt || null)}`}
          </Text>
        </View>
      ) : value === 'all' ? (
        <Text className="mt-sm text-caption text-neutral-500">Combined view of every connected account. Each post is compared with its own account’s typical post.</Text>
      ) : null}
    </View>
  );
}

