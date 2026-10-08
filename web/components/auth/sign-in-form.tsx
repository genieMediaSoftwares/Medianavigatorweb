'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { signInSchema, type SignInValues } from '@/lib/validation/auth';

/** Only same-site paths are allowed as a post-sign-in destination. */
const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/home');

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onTouched' });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.login(values);
      qc.clear();
      router.replace(safeNext(params.get('next')));
    } catch (e) {
      setFormError(e instanceof ApiError && e.status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'That email and password don’t match. Please check them and try again.'
        : e instanceof ApiError ? e.message : 'We couldn’t sign you in. Please try again.');
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {params.get('reason') === 'signed-out' && <Notice>You&apos;ve been signed out. Please sign in again.</Notice>}
      {params.get('reset') === 'done' && <Notice tone="good">Your password was changed. Sign in with the new one.</Notice>}
      <Field label="Email" error={errors.email?.message}>{(p) => <Input type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" {...p} {...register('email')} />}</Field>
      <Field label="Password" error={errors.password?.message}>
        {(p) => (
          <div className="relative">
            <Input type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-12" {...p} {...register('password')} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-ink">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        )}
      </Field>
      <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">Forgot password?</Link></div>
      {formError && <Notice tone="bad">{formError}</Notice>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
    </form>
  );
}
