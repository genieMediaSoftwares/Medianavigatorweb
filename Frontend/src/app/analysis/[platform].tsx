import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { colors } from '@/constants/colors';
import { ANALYSIS_TABS, AnalysisTab, PlatformAnalysisLists } from '@/features/analysis/PlatformAnalysis';
import { fetchConnections } from '@/features/connections/api';
import { isPlatform, PLATFORM_META, statusView } from '@/features/connections/platforms';
import { useApiResource } from '@/hooks/useApiResource';

/** Instagram Analysis (Dashboard → Instagram → View Analysis): All Posts, Top Performing, Needs Attention. */
export default function PlatformAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ platform: string }>();
  const platform = isPlatform(params.platform) ? params.platform : null;
  const [tab, setTab] = useState<AnalysisTab>('all');
  const [reloadKey, setReloadKey] = useState(0);
  const connections = useApiResource(fetchConnections);

  if (!platform) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <EmptyState icon="help-circle-outline" title="Unknown platform" message="This platform is not supported." action={{ label: 'Back', onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }
  const name = PLATFORM_META[platform].name;
  const connection = connections.state.status === 'success' ? connections.state.data.find((c) => c.platform === platform) : undefined;
  const status = connection ? statusView(connection) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View className="flex-row items-center px-lg pb-sm pt-xs">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} accessibilityRole="button" accessibilityLabel="Back" className="mr-xs h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100">
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </Pressable>
        <PlatformLogo platform={platform} size={30} />
        <Text className="ml-sm flex-shrink text-[18px] font-bold text-navy" numberOfLines={1} accessibilityRole="header">
          {`${name} Analysis`}
        </Text>
        {status && connection?.connected ? (
          <View className="ml-sm flex-row items-center rounded-full px-[7px] py-[2px]" style={{ backgroundColor: status.needsReconnect ? colors.warningLight : colors.successLight }}>
            <Ionicons name={status.icon} size={11} color={status.color} />
            <Text className="ml-[3px] text-[10px] font-medium" style={{ color: status.color }}>
              {status.label}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="px-lg pb-sm">
        <SegmentedControl segments={ANALYSIS_TABS} value={tab} onChange={setTab} />
      </View>

      <ScrollView
        contentContainerClassName="px-lg pb-2xl pt-xs"
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
        {connections.state.status === 'loading' ? (
          <ActivityIndicator className="my-xl" color={colors.primary} />
        ) : connections.state.status !== 'success' ? (
          <ErrorState message={connections.state.message} onRetry={connections.reload} />
        ) : !connection?.connected ? (
          <EmptyState icon="link-outline" title={`${name} is not connected`} message={`Connect your ${name} account to analyze its posts.`} action={{ label: `Connect ${name}`, onPress: () => router.push({ pathname: '/connect/[platform]', params: { platform } }) }} />
        ) : (
          <PlatformAnalysisLists scope={platform} connections={connections.state.data} tab={tab} reloadKey={reloadKey} onSynced={connections.refresh} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
