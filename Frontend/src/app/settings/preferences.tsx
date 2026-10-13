import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/auth-context';
import { validateFullName } from '@/features/auth/validation';
import { updateProfile } from '@/features/profile/api';
import { ApiError } from '@/lib/api/client';
import { deviceTimeZone } from '@/lib/timezone';
import type { ProfileUpdate } from '@/types/api';

/** Edits PATCH /profiles/me. Timing and summaries use the saved time zone. */
export default function ProfileDetailsScreen() {
  const { state, updateProfile: applyProfile } = useAuth();
  const profile = state.status === 'authenticated' ? state.me.profile : null;

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [organization, setOrganization] = useState(profile?.organization ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [message, setMessage] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const nameError = validateFullName(fullName);
    setErrors({ fullName: nameError ?? undefined });
    setMessage(null);
    if (nameError) return;

    const update: ProfileUpdate = { fullName: fullName.trim() };
    if (organization.trim()) update.organization = organization.trim();
    if (timezone.trim()) update.timezone = timezone.trim();

    setSaving(true);
    try {
      applyProfile(await updateProfile(update));
      setMessage({ variant: 'success', text: 'Saved.' });
    } catch (error) {
      const fields = error instanceof ApiError ? error.fields : undefined;
      if (fields) setErrors(fields);
      setMessage({ variant: 'error', text: error instanceof Error ? error.message : 'Unable to save.' });
    } finally {
      setSaving(false);
    }
  };

  const deviceZone = deviceTimeZone();

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1" contentContainerClassName="px-xl pb-3xl pt-lg" keyboardShouldPersistTaps="handled">
        {message ? <Notice variant={message.variant} message={message.text} /> : null}
        <TextField label="Full name" value={fullName} onChangeText={setFullName} error={errors.fullName} autoCapitalize="words" autoComplete="name" />
        <TextField label="Organization" value={organization} onChangeText={setOrganization} error={errors.organization} autoCapitalize="words" />
        <TextField label="Time zone" value={timezone} onChangeText={setTimezone} error={errors.timezone} autoCapitalize="none" autoCorrect={false} placeholder="e.g. Asia/Kolkata" hint="Used to group your posts by local day and hour." />
        {deviceZone && timezone !== deviceZone ? (
          <Text className="-mt-sm mb-lg text-label font-semibold text-primary" onPress={() => setTimezone(deviceZone)} accessibilityRole="button">
            Use this device’s time zone ({deviceZone})
          </Text>
        ) : null}
        <Button title="Save" onPress={() => void save()} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
