import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';
import { ListRow } from '@/components/ListRow';
import { PlatformLogo } from '@/components/PlatformLogo';
import { Divider } from '@/components/ui/Divider';
import { colors } from '@/constants/colors';
import { fetchMe } from '@/features/auth/api';
import { useAuth } from '@/features/auth/auth-context';
import { fetchConnections } from '@/features/connections/api';
import { PLATFORM_ORDER } from '@/features/connections/platforms';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmDestructive, showMessage } from '@/lib/confirm';
import { formatRelativeTime, initials } from '@/lib/format';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-lg">
      <Text className="mb-xs px-xs text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500" accessibilityRole="header">
        {title}
      </Text>
      <View className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">{children}</View>
    </View>
  );
}

/** Connected handles at a glance: platform logos, count and the latest successful sync. */
function AccountsOverview({ onOpen }: { onOpen: () => void }) {
  const connections = useApiResource(fetchConnections);
  const refresh = connections.refresh;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (connections.state.status === 'loading') {
    return (
      <View className="mb-lg h-[58px] items-center justify-center rounded-xl bg-neutral-50">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (connections.state.status !== 'success') {
    return (
      <Pressable onPress={connections.reload} accessibilityRole="button" className="mb-lg flex-row items-center rounded-xl border border-danger-border bg-danger-light px-lg py-md">
        <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
        <Text className="ml-sm flex-1 text-[13px] text-danger" numberOfLines={2}>{`Couldn’t load your accounts. Tap to retry.`}</Text>
      </Pressable>
    );
  }

  const live = PLATFORM_ORDER.map((p) => connections.state.status === 'success' ? connections.state.data.find((c) => c.platform === p && c.connected) : undefined).filter((c) => c !== undefined);
  const last = live.map((c) => c.lastSyncedAt).filter(Boolean).sort().pop() ?? null;
  const attention = live.filter((c) => c.status === 'connection_expired' || c.status === 'permission_required' || c.status === 'sync_failed').length;

  if (live.length === 0) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="No accounts connected. Connect account" className="mb-lg flex-row items-center rounded-xl border border-sky-border bg-sky px-lg py-md active:opacity-80">
        <Ionicons name="link-outline" size={20} color={colors.primary} />
        <View className="ml-md flex-1">
          <Text className="text-[14px] font-semibold text-navy">No accounts connected</Text>
          <Text className="text-[12px] text-neutral-500">Connect Instagram, YouTube, Facebook or LinkedIn to start.</Text>
        </View>
        <Text className="text-[13px] font-semibold text-primary">Connect Account</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${live.length} of 4 accounts connected${last ? `, last synced ${formatRelativeTime(last)}` : ''}${attention ? `, ${attention} need attention` : ''}`}
      className="mb-lg flex-row items-center rounded-xl border border-neutral-100 bg-neutral-50 px-lg py-sm active:bg-neutral-100"
    >
      <View className="flex-row">
        {live.map((c, i) => (
          <View key={c.platform} className="rounded-full border-2 border-white" style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <PlatformLogo platform={c.platform} size={26} />
          </View>
        ))}
      </View>
      <View className="ml-md flex-1">
        <Text className="text-[14px] font-semibold text-navy">{`${live.length} of 4 accounts connected`}</Text>
        <Text className={`text-[12px] ${attention ? 'text-warning' : 'text-neutral-500'}`} numberOfLines={1}>
          {attention ? `${attention} need${attention === 1 ? 's' : ''} attention` : last ? `Last synced ${formatRelativeTime(last)}` : 'Not synced yet'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.neutral400} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { state, signOut, updateProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overviewKey, setOverviewKey] = useState(0);

  // Pick up changes made elsewhere (another device, the website) whenever the tab is opened.
  const reloadMe = useCallback(async () => {
    try {
      const me = await fetchMe();
      if (me.profile) updateProfile(me.profile);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Couldn’t refresh your profile.');
    }
  }, [updateProfile]);
  useFocusEffect(
    useCallback(() => {
      void reloadMe();
    }, [reloadMe]),
  );

  if (state.status !== 'authenticated') return null;
  const { user, profile } = state.me;
  const name = profile?.fullName?.trim() || null;
  const prefs = profile?.notificationPrefs;
  const notificationsOn = prefs ? [prefs.syncUpdates, prefs.connectionProblems, prefs.performanceAlerts].filter(Boolean).length : 3;

  const refresh = async () => {
    setRefreshing(true);
    setOverviewKey((k) => k + 1);
    await reloadMe();
    setRefreshing(false);
  };

  const confirmSignOut = async () => {
    if (!(await confirmDestructive('Sign out?', 'You will need to sign in again to use Media Navigator.', 'Sign out'))) return;
    setSigningOut(true);
    // Calls POST /api/v1/auth/logout, then clears the stored tokens.
    const { serverRevoked } = await signOut();
    if (!serverRevoked) showMessage('Signed out on this device', 'The server could not be reached to end your session. It will expire automatically.');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerClassName="px-lg pb-2xl pt-sm"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View className="mb-md flex-row items-center justify-between">
          <MediaNavigatorLogo height={30} />
          <Text className="text-[17px] font-bold text-navy" accessibilityRole="header">
            Profile
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Compact header: avatar, name, organization, email, edit. */}
        <View className="mb-md flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full border border-sky-border bg-sky" importantForAccessibility="no">
            <Text className="text-[18px] font-bold text-primary">{initials(name ?? user.email)}</Text>
          </View>
          <View className="ml-md flex-1">
            <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
              {name ?? 'Add your name'}
            </Text>
            {profile?.organization ? (
              <Text className="text-[13px] text-navy-light" numberOfLines={1}>
                {profile.organization}
              </Text>
            ) : null}
            <Text className="text-[12px] text-neutral-500" numberOfLines={1} selectable>
              {user.email}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings/preferences')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-full border border-neutral-200 active:bg-neutral-50"
          >
            <Ionicons name="create-outline" size={19} color={colors.navy} />
          </Pressable>
        </View>
        {loadError ? <Text className="-mt-xs mb-sm text-[12px] text-warning">{`${loadError} Showing your saved details.`}</Text> : null}

        <AccountsOverview key={overviewKey} onOpen={() => router.push('/connected-accounts')} />

        <Group title="Account">
          <ListRow icon="link-outline" label="Connected Accounts" onPress={() => router.push('/connected-accounts')} />
          <Divider inset />
          <ListRow icon="person-outline" label="Profile Details" onPress={() => router.push('/settings/preferences')} />
          <Divider inset />
          <ListRow icon="notifications-outline" label="Notifications" value={notificationsOn === 3 ? 'All on' : notificationsOn === 0 ? 'Off' : `${notificationsOn} of 3 on`} onPress={() => router.push('/settings/notifications')} />
          <Divider inset />
          <ListRow icon="shield-checkmark-outline" label="Security" onPress={() => router.push('/settings/security')} />
        </Group>

        <Group title="Preferences">
          <ListRow icon="time-outline" label="Time zone" value={profile?.timezone ?? 'Not set (UTC)'} onPress={() => router.push('/settings/preferences')} />
        </Group>

        <Group title="Support">
          <ListRow icon="help-circle-outline" label="Help and Support" onPress={() => router.push('/settings/help')} />
          <Divider inset />
          <ListRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/settings/privacy')} />
          <Divider inset />
          <ListRow icon="document-text-outline" label="Terms and Conditions" onPress={() => router.push('/settings/terms')} />
          <Divider inset />
          <ListRow icon="information-circle-outline" label="About Media Navigator" onPress={() => router.push('/settings/about')} />
        </Group>

        <View className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
          {signingOut ? (
            <View className="min-h-12 items-center justify-center">
              <ActivityIndicator color={colors.danger} />
            </View>
          ) : (
            <ListRow icon="log-out-outline" label="Sign Out" destructive onPress={() => void confirmSignOut()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
