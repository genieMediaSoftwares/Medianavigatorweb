'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { emailField } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';

const schema = z.object({ email: emailField });

export function ForgotForm({ supportEmail }: { supportEmail: string }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onChange' });
  const forgot = useMutation({ mutationFn: authApi.forgotPassword });

  if (forgot.isSuccess) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-10 text-action" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-ink-muted">If an account exists for that email, we&apos;ve sent a link to reset your password. It expires soon, so use it shortly.</p>
        <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center font-semibold text-action hover:underline">Back to sign in</Link>
      </div>
    );
  }

  const notConfigured = forgot.error instanceof ApiError && forgot.error.status === 503;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-ink-muted">Enter your email and we&apos;ll send you a reset link.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit((v) => forgot.mutate(v))}>
        {notConfigured ? (
          <FormError error={`Password reset by email isn't set up yet. Please contact support at ${supportEmail}.`} />
        ) : forgot.isError ? (
          <FormError error={forgot.error} />
        ) : null}
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" autoFocus error={errors.email?.message} {...register('email')} />
        <Button type="submit" className="w-full" loading={forgot.isPending}>Send reset link</Button>
      </form>
      <p className="mt-6 text-center">
        <Link href="/sign-in" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-action hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
