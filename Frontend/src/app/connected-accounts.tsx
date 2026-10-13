import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Divider } from '@/components/ui/Divider';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { disconnectPlatform, fetchConnections } from '@/features/connections/api';
import { ConnectionRow } from '@/features/connections/ConnectionRow';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { useSync } from '@/features/connections/useSync';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmDestructive, showMessage } from '@/lib/confirm';
import type { Platform } from '@/types/api';

export default function ConnectedAccountsScreen() {
  const router = useRouter();
  const { state, refreshing, reload, refresh } = useApiResource(fetchConnections);
  const sync = useSync(useCallback(() => void refresh(), [refresh]));
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null);

  const disconnect = async (platform: Platform) => {
    const name = PLATFORM_META[platform].name;
    const ok = await confirmDestructive(`Disconnect ${name}?`, 'Stored access is deleted and syncing stops. Your synced history is kept.', 'Disconnect');
    if (!ok) return;
    setDisconnecting(platform);
    try {
      await disconnectPlatform(platform);
      await refresh();
    } catch (e) {
      showMessage('Unable to disconnect', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDisconnecting(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-xl pb-3xl pt-lg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {sync.error ? <Notice variant="error" title="Sync" message={sync.error} /> : null}
      {state.status === 'loading' ? (
        <LoadingState message="Loading connections…" />
      ) : state.status !== 'success' ? (
        <ErrorState message={state.message} onRetry={reload} />
      ) : (
        PLATFORM_ORDER.map((platform, index) => {
          const connection = state.data.find((c) => c.platform === platform);
          if (!connection) return null;
          return (
            <View key={platform}>
              {index > 0 ? <Divider /> : null}
              <ConnectionRow
                connection={connection}
                syncing={sync.active.includes(platform)}
                onConnect={() => router.push({ pathname: '/connect/[platform]', params: { platform } })}
                onSync={() => void sync.start(platform)}
                disconnecting={disconnecting === platform}
                onDisconnect={() => void disconnect(platform)}
              />
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
