import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { formatCompactNumber, formatRelativeTime } from '@/lib/format';
import type { Connection } from '@/types/api';

import { PLATFORM_META, problemMessage, statusView } from './platforms';

interface ConnectionRowProps {
  connection: Connection;
  syncing: boolean;
  onConnect: () => void;
  onSync: () => void;
}

/** One platform from GET /connections: status, account, last sync, and the next action. */
export function ConnectionRow({ connection, syncing, onConnect, onSync }: ConnectionRowProps) {
  const meta = PLATFORM_META[connection.platform];
  const status = statusView(connection, syncing);
  const problem = problemMessage(connection);
  const followers = connection.accountInfo?.followersCount;

  return (
    <View className="py-md">
      <View className="flex-row items-center">
        <PlatformLogo platform={connection.platform} size={44} />
        <View className="ml-md flex-1 pr-sm">
          <Text className="text-body font-semibold text-navy">{meta.name}</Text>
          <View className="mt-0.5 flex-row items-center">
            <Ionicons name={status.icon} size={13} color={status.color} />
            <Text className="ml-xs flex-shrink text-caption" style={{ color: status.color }} numberOfLines={1}>
              {connection.connected ? `${status.label} · ${connection.accountHandle}` : status.label}
            </Text>
          </View>
          {connection.connected ? (
            <Text className="mt-0.5 text-caption text-neutral-500" numberOfLines={1}>
              {`Synced ${formatRelativeTime(connection.lastSyncedAt || null)}`}
              {followers !== undefined ? ` · ${formatCompactNumber(followers)} followers` : ''}
            </Text>
          ) : (
            <Text className="mt-0.5 text-caption text-neutral-500" numberOfLines={1}>
              {connection.primaryStrength}
            </Text>
          )}
        </View>
        {!connection.connected || status.needsReconnect ? (
          <Button title={connection.connected ? 'Reconnect' : 'Connect'} size="sm" variant="secondary" onPress={onConnect} />
        ) : (
          <Button title="Sync" size="sm" variant="ghost" icon="refresh-outline" onPress={onSync} loading={syncing} />
        )}
      </View>
      {problem ? <Text className="ml-[56px] mt-xs text-caption text-warning">{problem}</Text> : null}
    </View>
  );
}
