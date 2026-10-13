import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { colors } from '@/constants/colors';
import { ANALYSIS_TABS, AnalysisTab, PlatformAnalysisLists } from '@/features/analysis/PlatformAnalysis';
import { fetchConnections } from '@/features/connections/api';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { useApiResource } from '@/hooks/useApiResource';
import type { Platform } from '@/types/api';

/**
 * Analysis tab: pick one of your connected platforms, then All Posts / Top Performing / Needs Attention.
 * Only platforms the server reports as connected can be chosen.
 */
export default function AnalysisTabScreen() {
  const router = useRouter();
  const connections = useApiResource(fetchConnections);
  const [chosen, setChosen] = useState<Platform | null>(null);
  const [tab, setTab] = useState<AnalysisTab>('all');
  const [reloadKey, setReloadKey] = useState(0);

  // A platform connected on the Dashboard should appear when coming back to this tab.
  const refreshConnections = connections.refresh;
  useFocusEffect(
    useCallback(() => {
      void refreshConnections();
    }, [refreshConnections]),
  );

  const list = connections.state.status === 'success' ? connections.state.data : [];
  const connected = PLATFORM_ORDER.filter((p) => list.some((c) => c.platform === p && c.connected));
  const platform = chosen && connected.includes(chosen) ? chosen : (connected[0] ?? null);
  const connection = platform ? list.find((c) => c.platform === platform) : undefined;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerClassName="px-lg pb-2xl pt-sm"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void connections.refresh();
              setReloadKey((k) => k + 1);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View className="mb-md flex-row items-center justify-between">
          <MediaNavigatorLogo height={38} />
          <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel="Notifications" className="h-11 w-11 items-center justify-center rounded-full active:bg-neutral-100">
            <Ionicons name="notifications-outline" size={24} color={colors.navy} />
          </Pressable>
        </View>
        <Text className="text-[28px] font-extrabold text-navy" accessibilityRole="header">
          Analysis
        </Text>
        <Text className="mb-lg mt-[2px] text-[13px] text-neutral-500">See every post, what is working and what needs attention.</Text>

        {connections.state.status === 'loading' ? (
          <ActivityIndicator className="my-xl" color={colors.primary} />
        ) : connections.state.status !== 'success' ? (
          <ErrorState message={connections.state.message} onRetry={connections.reload} />
        ) : !platform || !connection ? (
          <EmptyState icon="link-outline" title="No account connected yet" message="Connect a platform on the Dashboard with its access token or API key. Its analysis appears here once it is connected." action={{ label: 'Go to Dashboard', onPress: () => router.navigate('/') }} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-lg mb-md" contentContainerClassName="px-lg" accessibilityRole="tablist">
              {connected.map((p) => {
                const selected = p === platform;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setChosen(p)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    className={`mr-sm min-h-11 flex-row items-center rounded-[12px] border px-md ${selected ? 'border-primary/30 bg-sky' : 'border-neutral-100 bg-white'}`}
                  >
                    <PlatformLogo platform={p} size={24} />
                    <Text className={`ml-sm text-[13px] font-semibold ${selected ? 'text-primary' : 'text-navy'}`}>{PLATFORM_META[p].name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View className="mb-md">
              <SegmentedControl segments={ANALYSIS_TABS} value={tab} onChange={setTab} />
            </View>
            {/* Keyed by platform so switching platforms starts each list fresh. */}
            <PlatformAnalysisLists key={platform} platform={platform} connection={connection} tab={tab} reloadKey={reloadKey} onSynced={refreshConnections} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
