import { ReactNode, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/auth-context';
import { validateNewPassword } from '@/features/auth/validation';
import { changePassword, deleteAccount, fetchSessions, logoutAllSessions, revokeSession } from '@/features/profile/api';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError, clearTokens } from '@/lib/api/client';
import { formatRelativeTime } from '@/lib/format';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View className="mb-2xl">
      <Text className="text-title text-navy" accessibilityRole="header">
        {title}
      </Text>
      {description ? <Text className="mb-lg mt-xs text-label font-normal text-neutral-500">{description}</Text> : <View className="mb-lg" />}
      {children}
    </View>
  );
}

export default function SecurityScreen() {
  const { signOut, restoreSession } = useAuth();
  const sessions = useApiResource(fetchSessions);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const submitPassword = async () => {
    const found = {
      current: current ? undefined : 'Enter your current password.',
      next: validateNewPassword(next) ?? undefined,
      confirm: confirm === next ? undefined : 'Passwords do not match.',
    };
    setErrors(found);
    if (found.current || found.next || found.confirm) return;
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      await sessions.refresh();
      Alert.alert('Password changed', 'Every other device has been signed out.');
    } catch (error) {
      const fields = error instanceof ApiError ? error.fields : undefined;
      if (fields) setErrors({ current: fields.currentPassword, next: fields.newPassword });
      else Alert.alert('Unable to change password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRevoke = (id: string) =>
    Alert.alert('Sign out this device?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeSession(id);
            await sessions.refresh();
          } catch (error) {
            Alert.alert('Unable to sign out device', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);

  const confirmLogoutAll = () =>
    Alert.alert('Sign out everywhere?', 'Every device, including this one, will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out everywhere',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutAllSessions();
            await clearTokens();
            await restoreSession();
          } catch (error) {
            Alert.alert('Unable to sign out', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);

  const confirmDelete = () => {
    if (!deletePassword) {
      Alert.alert('Enter your password', 'Confirm with your password to delete your account.');
      return;
    }
    Alert.alert('Delete your account?', 'This permanently deletes your Media Navigator account and its data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount(deletePassword);
            await signOut();
          } catch (error) {
            setDeleting(false);
            Alert.alert('Unable to delete account', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView className="flex-1" contentContainerClassName="px-xl pb-3xl pt-lg" keyboardShouldPersistTaps="handled">
        <Section title="Change password" description="Changing your password signs out every other device.">
          <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" error={errors.current} />
          <TextField label="New password" value={next} onChangeText={setNext} secureToggle autoCapitalize="none" autoComplete="new-password" error={errors.next} hint="At least 8 characters, with a letter and a number." />
          <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" error={errors.confirm} />
          <Button title="Update password" onPress={() => void submitPassword()} loading={saving} disabled={saving} />
        </Section>

        <Section title="Signed-in devices">
          {sessions.state.status === 'loading' ? (
            <Text className="mb-lg text-body text-neutral-500">Checking…</Text>
          ) : sessions.state.status !== 'success' ? (
            <Notice variant="error" message={sessions.state.message} />
          ) : (
            sessions.state.data.map((s) => (
              <View key={s.id} className="mb-sm flex-row items-center rounded-lg bg-neutral-50 p-md">
                <View className="flex-1">
                  <Text className="text-label text-navy" numberOfLines={1}>
                    {s.userAgent ?? 'Unknown device'}
                    {s.current ? ' (this device)' : ''}
                  </Text>
                  <Text className="mt-0.5 text-caption text-neutral-500">{`Last active ${formatRelativeTime(s.lastUsedAt)}${s.ip ? ` · ${s.ip}` : ''}`}</Text>
                </View>
                {s.current ? null : <Button title="Sign out" size="sm" variant="ghost" onPress={() => confirmRevoke(s.id)} />}
              </View>
            ))
          )}
          <View className="mt-md">
            <Button title="Sign out everywhere" variant="secondary" onPress={confirmLogoutAll} />
          </View>
        </Section>

        <Section title="Delete account">
          <Notice variant="error" message="Deleting your account permanently removes your profile, connected accounts, stored access, synced content and notifications." />
          <TextField label="Confirm with your password" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry autoCapitalize="none" />
          <Button title="Delete my account" variant="danger" onPress={confirmDelete} loading={deleting} disabled={deleting} />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
