import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { resetPasswordRequest } from '@/features/auth/api';
import { useAuth } from '@/features/auth/auth-context';
import { validateNewPassword } from '@/features/auth/validation';
import { ApiError } from '@/lib/api/client';

/** Public route for medianavigator://reset-password?token=…; never starts an AI or signed-in flow. */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const router = useRouter();
  const { state: auth, signOut } = useAuth();
  const token = typeof params.token === 'string' && /^[A-Za-z0-9_-]{20,200}$/.test(params.token) ? params.token : null;
  const confirmRef = useRef<TextInput>(null);
  const lock = useRef(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (lock.current || !token || done) return;
    const found = { password: validateNewPassword(password) ?? undefined, confirm: confirm === password ? undefined : 'Passwords do not match.' };
    setErrors(found);
    if (found.password || found.confirm) return;
    lock.current = true;
    setSaving(true);
    setMessage(null);
    try {
      await resetPasswordRequest({ token, newPassword: password });
      setPassword(''); setConfirm(''); setDone(true);
      // Remove the consumed token from navigation state as well as the visible URL.
      router.setParams({ token: '' });
      if (auth.status === 'authenticated') await signOut();
    } catch (error) {
      setMessage(error instanceof ApiError && error.status === 400 ? 'This link has expired or was already used. Please request a new one.' : 'We couldn’t reset your password. Please try again.');
    } finally { lock.current = false; setSaving(false); }
  };
  return (
    <Screen>
      <BrandHeader title={done ? 'A fresh start' : 'Choose a new password'} subtitle={done ? 'Your password has been changed. Sign in with your new password.' : 'Use at least 8 characters, including a letter and a number.'} />
      {done ? <Button title="Back to sign in" onPress={() => router.replace('/auth/login')} /> : !token ? (
        <><Notice variant="warning" title="This link isn’t complete" message="Open the reset link from your email again, or request a new one." /><TextLink href="/auth/forgot-password" label="Send a new link" /></>
      ) : (
        <>
          {message ? <Notice variant="error" message={message} /> : null}
          <TextField label="New password" value={password} onChangeText={setPassword} error={errors.password} secureToggle autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" editable={!saving} onSubmitEditing={() => confirmRef.current?.focus()} />
          <TextField ref={confirmRef} label="Confirm new password" value={confirm} onChangeText={setConfirm} error={errors.confirm} secureToggle autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" editable={!saving} onSubmitEditing={() => void submit()} />
          <Button title="Change password" loading={saving} onPress={() => void submit()} />
          <View className="mt-xl items-center"><TextLink href="/auth/forgot-password" label="Send a new link" /></View>
        </>
      )}
    </Screen>
  );
}
