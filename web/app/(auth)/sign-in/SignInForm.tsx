'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { safeNext, signInSchema } from '@/lib/validation';
import { useSessionNavigate } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';

type Values = z.infer<typeof signInSchema>;

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many sign-in attempts. For your safety, sign-in is paused for a few minutes. Please try again shortly.';
    // The API deliberately gives the same answer for an unknown email and a wrong password.
    if (error.status === 401) return error.message === 'This account is disabled' ? 'This account has been disabled. Please contact support.' : "That email and password don't match. Please try again.";
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(signInSchema), mode: 'onChange' });
  const go = useSessionNavigate();
  const login = useMutation({ mutationFn: authApi.login, onSuccess: () => go(next ?? '/home') });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-ink-muted">Sign in to see how your content is doing.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit((v) => login.mutate(v))}>
        {login.isError ? <FormError error={messageFor(login.error)} /> : null}
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" autoFocus error={errors.email?.message} {...register('email')} />
        <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="min-h-11 content-center text-[15px] font-semibold text-action hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={login.isPending}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-muted">
        New here?{' '}
        <Link href="/create-account" className="font-semibold text-action hover:underline">Create an account</Link>
      </p>
    </>
  );
}
