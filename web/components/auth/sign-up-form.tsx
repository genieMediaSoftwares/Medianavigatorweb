'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { signUpSchema, type SignUpValues } from '@/lib/validation/auth';
import { ACCOUNT_TYPES } from '@/types/api';
import { PasswordChecklist, PasswordInput } from './password-field';

export function SignUpForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), mode: 'onTouched', defaultValues: { accountType: '' } });
  const password = useWatch({ control, name: 'password' }) ?? '';

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api.register({ fullName: v.fullName, email: v.email, password: v.password, ...(v.organization ? { organization: v.organization } : {}), ...(v.accountType ? { accountType: v.accountType } : {}) });
      qc.clear();
      router.replace('/onboarding');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError('email', { message: 'An account with this email already exists. Try signing in.' });
      else if (e instanceof ApiError && e.status === 422) {
        let placed = false;
        for (const field of ['fullName', 'email', 'password', 'organization'] as const) { const m = e.fieldMessage(field); if (m) { setError(field, { message: m }); placed = true; } }
        if (!placed) setFormError(e.message);
      } else setFormError(e instanceof ApiError ? e.message : 'We couldn’t create your account. Please try again.');
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Your name" error={errors.fullName?.message}>{(p) => <Input autoComplete="name" placeholder="Alex Rivera" {...p} {...register('fullName')} />}</Field>
      <Field label="Email" error={errors.email?.message}>{(p) => <Input type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" {...p} {...register('email')} />}</Field>
      <Field label="Password" error={errors.password?.message}>{(p) => <><PasswordInput autoComplete="new-password" {...p} {...register('password')} /><PasswordChecklist value={password} /></>}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Organization" optional error={errors.organization?.message}>{(p) => <Input autoComplete="organization" {...p} {...register('organization')} />}</Field>
        <Field label="I am a…" optional>{(p) => <Select {...p} {...register('accountType')}><option value="">Choose one</option>{ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>}</Field>
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-600)]" aria-invalid={errors.consent ? true : undefined} {...register('consent')} />
          <span>I agree to the <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-brand-600 underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-brand-600 underline">Privacy Policy</a>.</span>
        </label>
        {errors.consent && <p role="alert" className="mt-1.5 text-[13px] font-medium text-bad">{errors.consent.message}</p>}
      </div>
      {formError && <Notice tone="bad">{formError}</Notice>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create account</Button>
    </form>
  );
}
