'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, LinkButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { EmptyState, Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { resetSchema } from '@/lib/validation/auth';
import type { z } from 'zod';
import { PasswordChecklist, PasswordInput } from './password-field';

export function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), mode: 'onTouched' });
  const pw = useWatch({ control, name: 'newPassword' }) ?? '';

  if (!token) return <EmptyState title="This link isn’t complete" description="Open the link from your email again, or ask for a new one." action={<LinkButton href="/forgot-password">Send a new link</LinkButton>} />;

  const submit = handleSubmit(async (v) => {
    setError(null);
    try { await api.resetPassword({ token, newPassword: v.newPassword }); router.replace('/sign-in?reset=done'); }
    catch (e) { setError(e instanceof ApiError && (e.status === 400 || e.status === 401 || e.status === 404) ? 'This link has expired or was already used. Please ask for a new one.' : e instanceof ApiError ? e.message : 'We couldn’t change your password. Please try again.'); }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="New password" error={errors.newPassword?.message}>{(p) => <><PasswordInput autoComplete="new-password" {...p} {...register('newPassword')} /><PasswordChecklist value={pw} /></>}</Field>
      <Field label="Type it again" error={errors.confirm?.message}>{(p) => <PasswordInput autoComplete="new-password" {...p} {...register('confirm')} />}</Field>
      {error && <Notice tone="bad">{error} <a href="/forgot-password" className="font-semibold underline">Get a new link</a></Notice>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Change password</Button>
    </form>
  );
}
