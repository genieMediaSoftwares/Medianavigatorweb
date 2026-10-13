import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { colors } from '@/constants/colors';
import { ANALYSIS_TABS, AnalysisTab, PlatformAnalysisLists } from '@/features/analysis/PlatformAnalysis';
import { fetchConnections } from '@/features/connections/api';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { PlatformPicker } from '@/features/connections/PlatformPicker';
import { useApiResource } from '@/hooks/useApiResource';
import type { AccountScope, Platform } from '@/types/api';

/**
 * Analysis tab: pick a platform's handle (or all accounts), then All Posts / Top Performing / Needs Attention.
 * Every platform is listed; ones that aren't connected offer to connect. Each handle is analysed only against itself.
 */
export default function AnalysisTabScreen() {
  const router = useRouter();
  const connections = useApiResource(fetchConnections);
  const [chosen, setChosen] = useState<AccountScope | null>(null);
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
  // "All accounts" only makes sense with two or more; otherwise fall back to the first connected handle.
  const scope: AccountScope | null = chosen === 'all' ? (connected.length > 1 ? 'all' : connected[0] ?? null) : chosen ?? connected[0] ?? null;
  const connection = scope && scope !== 'all' ? list.find((c) => c.platform === scope) : undefined;
  const problem = connection?.connected && (connection.status === 'connection_expired' || connection.status === 'permission_required');

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
        <Text className="mb-lg mt-[2px] text-[13px] text-neutral-500">See every post on each of your accounts, what is working and what needs attention.</Text>

        {connections.state.status === 'loading' ? (
          <ActivityIndicator className="my-xl" color={colors.primary} />
        ) : connections.state.status !== 'success' ? (
          <ErrorState message={connections.state.message} onRetry={connections.reload} />
        ) : connected.length === 0 ? (
          <EmptyState icon="link-outline" title="No account connected yet" message="Connect a platform with its access token. Its analysis appears here once it is connected." action={{ label: 'Connected accounts', onPress: () => router.push('/connected-accounts') }} />
        ) : (
          <>
            <PlatformPicker connections={list} value={scope ?? connected[0]} onChange={setChosen} />
            {scope !== 'all' && !connection?.connected ? (
              <EmptyState
                icon="link-outline"
                title={`${PLATFORM_META[scope as Platform].name} isn’t connected`}
                message={`Connect your ${PLATFORM_META[scope as Platform].name} account to analyse its posts here.`}
                action={{ label: `Connect ${PLATFORM_META[scope as Platform].name}`, onPress: () => router.push({ pathname: '/connect/[platform]', params: { platform: scope as Platform } }) }}
              />
            ) : (
              <>
                {problem ? (
                  <View className="mb-md">
                    <Notice
                      variant="warning"
                      title={connection!.status === 'connection_expired' ? `${connection!.name} access expired` : `${connection!.name} needs more permissions`}
                      message="Showing the posts already synced. Reconnect to keep them up to date."
                    />
                    <Button title={`Reconnect ${connection!.name}`} size="sm" variant="secondary" onPress={() => router.push({ pathname: '/connect/[platform]', params: { platform: connection!.platform } })} />
                  </View>
                ) : null}
                <View className="mb-md">
                  <SegmentedControl segments={ANALYSIS_TABS} value={tab} onChange={setTab} />
                </View>
                {/* Keyed by scope so switching handles starts each list fresh. */}
                <PlatformAnalysisLists key={scope!} scope={scope!} connections={list} tab={tab} reloadKey={reloadKey} onSynced={refreshConnections} onScope={setChosen} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
