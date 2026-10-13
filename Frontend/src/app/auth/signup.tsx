import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { useAuth } from '@/features/auth/auth-context';
import { PASSWORD_MIN_LENGTH, validateEmail, validateFullName, validateNewPassword } from '@/features/auth/validation';
import { ApiError, FieldErrors } from '@/lib/api/client';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const organizationRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: FieldErrors = {};
    const nameError = validateFullName(fullName);
    const emailError = validateEmail(email);
    const passwordError = validateNewPassword(password);
    if (nameError) errors.fullName = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (!passwordError && confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // On success the auth guard switches to the protected area automatically.
      const org = organization.trim();
      await signUp({ fullName: fullName.trim(), email: email.trim(), password, ...(org && { organization: org }) });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(error instanceof Error ? error.message : 'Sign up failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <BrandHeader title="Create your account" subtitle="Set up Media Navigator for your organization’s social channels." />

      {formError ? <Notice variant="error" message={formError} /> : null}

      <TextField
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => organizationRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={organizationRef}
        label="Organization (optional)"
        value={organization}
        onChangeText={setOrganization}
        error={fieldErrors.organization}
        placeholder="Company or brand"
        autoCapitalize="words"
        autoComplete="organization"
        textContentType="organizationName"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        placeholder="you@company.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        hint="Use at least one letter and one number."
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        placeholder="Re-enter your password"
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!submitting}
      />

      <View className="mt-sm">
        <Button title="Create Account" onPress={handleSubmit} loading={submitting} />
      </View>

      <View className="mt-2xl flex-row flex-wrap items-center justify-center">
        <Text className="text-label font-normal text-neutral-500">Already have an account?</Text>
        <TextLink href="/auth/login" label="Sign in" replace />
      </View>
    </Screen>
  );
}
