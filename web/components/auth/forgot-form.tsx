'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { forgotSchema } from '@/lib/validation/auth';
import type { z } from 'zod';

export function ForgotForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), mode: 'onTouched' });

  const submit = handleSubmit(async (v) => {
    setError(null);
    try { await api.forgotPassword(v); setDone(true); }
    catch (e) {
      setError(e instanceof ApiError && e.status === 503 ? 'Password reset email isn’t set up yet. Please contact support and we’ll help you get back in.' : e instanceof ApiError ? e.message : 'We couldn’t send that right now. Please try again.');
    }
  });

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-brand-50 p-6 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-brand-600"><MailCheck className="h-6 w-6" aria-hidden="true" /></span>
        <p className="font-display text-lg font-bold text-ink">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">If there&apos;s an account for that email, we&apos;ve sent a link to choose a new password. It can take a few minutes to arrive.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email" error={errors.email?.message}>{(p) => <Input type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" {...p} {...register('email')} />}</Field>
      {error && <Notice tone="bad">{error}</Notice>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send reset link</Button>
    </form>
  );
}
