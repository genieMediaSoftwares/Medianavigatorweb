import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/auth-context';
import { updateProfile } from '@/features/profile/api';
import type { NotificationPrefs } from '@/types/api';

const CATEGORIES: { key: keyof NotificationPrefs; icon: ComponentProps<typeof Ionicons>['name']; label: string; description: string }[] = [
  { key: 'connectionProblems', icon: 'warning-outline', label: 'Connection problems', description: 'Expired access, failed syncs and missing permissions.' },
  { key: 'syncUpdates', icon: 'refresh-outline', label: 'Sync complete', description: 'A message each time an account finishes syncing.' },
  { key: 'performanceAlerts', icon: 'trending-up-outline', label: 'Performance alerts', description: 'When a post performs far above your usual.' },
];

const ALL_ON: NotificationPrefs = { syncUpdates: true, connectionProblems: true, performanceAlerts: true };

/** Notification categories, saved to the profile on the server. The server checks them before creating each notification. */
export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { state, updateProfile: applyProfile } = useAuth();
  const saved = (state.status === 'authenticated' ? state.me.profile?.notificationPrefs : undefined) ?? ALL_ON;
  const [pending, setPending] = useState<keyof NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The switch only moves after the server confirms, so it never shows a value that wasn't saved.
  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    setPending(key);
    setError(null);
    try {
      applyProfile(await updateProfile({ notificationPrefs: { [key]: value } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that change. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-2xl pt-md">
      {error ? <Notice variant="error" message={error} /> : null}
      <Text className="mb-xs px-xs text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500">In-app notifications</Text>
      <View className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
        {CATEGORIES.map((c, i) => (
          <View key={c.key} className={`min-h-[60px] flex-row items-center px-lg py-sm ${i > 0 ? 'border-t border-neutral-200' : ''}`}>
            <Ionicons name={c.icon} size={20} color={colors.navy} />
            <View className="ml-lg mr-md flex-1">
              <Text className="text-[15px] text-navy">{c.label}</Text>
              <Text className="text-[12px] text-neutral-500">{c.description}</Text>
            </View>
            {pending === c.key ? (
              <ActivityIndicator color={colors.primary} style={{ width: 51 }} />
            ) : (
              <Switch
                value={saved[c.key]}
                onValueChange={(v) => void toggle(c.key, v)}
                disabled={pending !== null}
                trackColor={{ true: colors.primary, false: colors.neutral300 }}
                thumbColor={colors.white}
                accessibilityLabel={c.label}
              />
            )}
          </View>
        ))}
      </View>
      <Text className="mt-sm px-xs text-[12px] text-neutral-500">
        Changes apply to new notifications. Turning a category off also clears its current alerts. Media Navigator doesn’t send push or email notifications.
      </Text>

      <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" className="mt-lg min-h-12 flex-row items-center rounded-xl border border-neutral-100 bg-neutral-50 px-lg active:bg-neutral-100">
        <Ionicons name="mail-unread-outline" size={20} color={colors.navy} />
        <Text className="ml-lg flex-1 text-[15px] text-navy">View notifications</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.neutral400} />
      </Pressable>
    </ScrollView>
  );
}
