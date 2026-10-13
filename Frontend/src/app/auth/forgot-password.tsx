import { useState } from 'react';
import { View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { forgotPasswordRequest } from '@/features/auth/api';
import { validateEmail } from '@/features/auth/validation';
import { ApiError } from '@/lib/api/client';

type Result = { variant: 'error' | 'warning' | 'success'; title: string; message: string };

// POST /auth/forgot-password answers 202 for known and unknown emails alike, and 503 when email
// delivery is not configured on the server. The screen shows that real answer and never claims more.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const error = validateEmail(email);
    setEmailError(error);
    setResult(null);
    if (error) return;

    setSubmitting(true);
    try {
      const { message } = await forgotPasswordRequest({ email: email.trim() });
      setResult({ variant: 'success', title: 'Request received', message });
    } catch (requestError) {
      const notConfigured = requestError instanceof ApiError && requestError.status === 503;
      setResult({
        variant: notConfigured ? 'warning' : 'error',
        title: notConfigured ? 'Password reset isn’t available' : 'Request failed',
        message: requestError instanceof Error ? requestError.message : 'Password reset failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <BrandHeader title="Reset your password" subtitle="Enter the email address you use to sign in. We’ll email you a reset link." />

      {result ? <Notice variant={result.variant} title={result.title} message={result.message} /> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        placeholder="you@company.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!submitting}
      />

      <Button title="Send reset link" onPress={handleSubmit} loading={submitting} />

      <View className="mt-2xl items-center">
        <TextLink href="/auth/login" label="Back to sign in" />
      </View>
    </Screen>
  );
}
