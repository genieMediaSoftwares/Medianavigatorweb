import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';

import { colors } from '@/constants/colors';
import type { Connection, Platform } from '@/types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];

// UI configuration (names, icons, form labels). Whether an account is connected always comes from the API.
export const PLATFORM_ORDER: readonly Platform[] = ['instagram', 'youtube', 'facebook', 'linkedin'];

export const PLATFORM_META: Record<Platform, { name: string; icon: IconName }> = {
  instagram: { name: 'Instagram', icon: 'logo-instagram' },
  youtube: { name: 'YouTube', icon: 'logo-youtube' },
  facebook: { name: 'Facebook', icon: 'logo-facebook' },
  linkedin: { name: 'LinkedIn', icon: 'logo-linkedin' },
};

/** What each platform publishes, in its own vocabulary (dashboard card subtitle). */
export const PLATFORM_CONTENT_TYPES: Record<Platform, string> = {
  instagram: 'Posts, Reels, Stories',
  youtube: 'Videos, Shorts, Live',
  facebook: 'Posts, Videos, Reels',
  linkedin: 'Posts, Articles, Docs',
};

/** What the user connects on each platform ("Connect your YouTube channel"). */
export const PLATFORM_ACCOUNT_NOUN: Record<Platform, string> = {
  instagram: 'account',
  youtube: 'channel',
  facebook: 'Page',
  linkedin: 'account',
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORM_ORDER as readonly string[]).includes(value);
}

export interface StatusView {
  label: string;
  color: string;
  icon: IconName;
  /** The user has to reconnect before syncing can work again. */
  needsReconnect: boolean;
}

/** Plain words for every connection state reported by the API. */
export function statusView(connection: Connection, syncing = false): StatusView {
  if (!connection.connected) return { label: 'Not connected', color: colors.neutral500, icon: 'ellipse-outline', needsReconnect: false };
  if (syncing || connection.status === 'syncing' || connection.status === 'connecting') {
    return { label: 'Importing…', color: colors.primary, icon: 'sync-outline', needsReconnect: false };
  }
  switch (connection.status) {
    case 'permission_required':
      return { label: 'Needs permission', color: colors.warning, icon: 'warning-outline', needsReconnect: true };
    case 'connection_expired':
      return { label: 'Reconnect needed', color: colors.danger, icon: 'alert-circle-outline', needsReconnect: true };
    case 'sync_failed':
      return { label: 'Last update failed', color: colors.danger, icon: 'alert-circle-outline', needsReconnect: false };
    default:
      return { label: 'Connected', color: colors.success, icon: 'checkmark-circle', needsReconnect: false };
  }
}

/** The API's explanation when something is wrong with a connection, otherwise null. */
export function problemMessage(connection: Connection): string | null {
  if (connection.status === 'permission_required') return connection.statusMessage ?? null;
  if (connection.status === 'connection_expired') return connection.statusMessage ?? null;
  if (connection.status === 'sync_failed') return connection.sync?.lastError ?? connection.statusMessage ?? null;
  return null;
}
