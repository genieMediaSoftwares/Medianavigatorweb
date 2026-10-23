import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/auth-context';
import { DashboardData, fetchDashboard } from '@/features/connections/dashboard';
import { PlatformDashboardCard } from '@/features/connections/PlatformDashboardCard';
import { DashboardMoments } from '@/features/dashboard/DashboardMoments';
import { useApiResource } from '@/hooks/useApiResource';
import type { Platform } from '@/types/api';

// Reference layout: Instagram / YouTube on the first row, Facebook / LinkedIn on the second.
const GRID: [Platform, Platform][] = [
  ['instagram', 'youtube'],
  ['facebook', 'linkedin'],
];

function GridSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading your platforms">
      {GRID.map((row, i) => (
        <View key={i} className="mb-md flex-row" style={{ gap: 12 }}>
          {row.map((p) => (
            <View key={p} className="h-[190px] flex-1">
              <Skeleton className="h-[190px] w-full rounded-[18px]" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PlatformGrid({ data, onConnect, onManage, onViewAnalysis }: {
  data: DashboardData;
  onConnect: (p: Platform) => void;
  onManage: (p: Platform) => void;
  onViewAnalysis: (p: Platform) => void;
}) {
  return (
    <>
      {GRID.map((row, i) => (
        <View key={i} className="mb-md flex-row" style={{ gap: 12 }}>
          {row.map((platform) => {
            const connection = data.connections.find((c) => c.platform === platform);
            // The server always lists all four platforms; a missing entry renders nothing rather than a guess.
            if (!connection) return <View key={platform} className="flex-1" />;
            return (
              <PlatformDashboardCard
                key={platform}
                platform={platform}
                connection={connection}
                metrics={data.metrics[platform] ?? null}
                onConnect={() => onConnect(platform)}
                onManage={() => onManage(platform)}
                onViewAnalysis={() => onViewAnalysis(platform)}
              />
            );
          })}
        </View>
      ))}
    </>
  );
}

/**
 * Dashboard: choose a platform, connect it, or enter its analysis. Connection state comes from
 * GET /connections.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { state: auth } = useAuth();
  const { state, refreshing, reload, refresh } = useApiResource(fetchDashboard);

  // Returning from the connect / manage screen must show the new state.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const firstName = auth.status === 'authenticated' ? auth.me.profile?.fullName.trim().split(/\s+/)[0] : undefined;
  const connections = useMemo(() => state.status === 'success' ? { status: 'success' as const, data: state.data.connections } : state, [state]);

  const openConnect = (platform: Platform) => router.push({ pathname: '/connect/[platform]', params: { platform } });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerClassName="px-lg pb-2xl pt-sm"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View className="mb-xl flex-row items-center justify-between">
          <MediaNavigatorLogo height={42} />
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={4}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-neutral-100"
            >
              <Ionicons name="notifications-outline" size={26} color={colors.navy} />
            </Pressable>
            <Pressable
              onPress={() => router.navigate('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={4}
              className="h-12 w-12 items-center justify-center rounded-full bg-sky active:bg-sky-border"
            >
              <Ionicons name="settings-sharp" size={22} color={colors.navy} />
            </Pressable>
          </View>
        </View>

        <View className="mb-lg">
          <Text className="text-[15px] text-neutral-500" numberOfLines={1}>
            {firstName ? `Welcome back, ${firstName} 👋` : 'Welcome back 👋'}
          </Text>
          <Text className="mt-[2px] text-[27px] font-extrabold leading-[34px] text-navy" accessibilityRole="header">
            Analyze. Improve. Grow.
          </Text>
          <Text className="mt-xs text-[14px] leading-[20px] text-neutral-500">
            Connect your social media accounts to get AI-powered insights, track performance and discover new ideas.
          </Text>
        </View>

        {state.status === 'loading' ? (
          <GridSkeleton />
        ) : state.status === 'success' ? (
          <PlatformGrid
            data={state.data}
            onConnect={openConnect}
            onManage={openConnect}
            onViewAnalysis={(platform) => router.push({ pathname: '/analysis/[platform]', params: { platform } })}
          />
        ) : (
          <ErrorState message={state.message} onRetry={reload} />
        )}

        <DashboardMoments
          connections={connections}
          userId={auth.status === 'authenticated' ? auth.me.user.id : ''}
          timezone={auth.status === 'authenticated' ? auth.me.profile?.timezone : undefined}
          onRetry={reload}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
