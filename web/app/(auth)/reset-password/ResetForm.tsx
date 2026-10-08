'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api/endpoints';
import { resetSchema } from '@/lib/validation';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/Field';
import { EmptyState, FormError } from '@/components/ui/States';

type Values = z.infer<typeof resetSchema>;

export function ResetForm() {
  const token = useSearchParams().get('token');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(resetSchema), mode: 'onChange' });
  const reset = useMutation({ mutationFn: (v: Values) => authApi.resetPassword({ token: token ?? '', newPassword: v.newPassword }) });

  if (!token || token.length < 20) {
    return (
      <EmptyState
        title="This reset link isn't complete"
        body="Open the link from your email again, or ask for a new one."
        action={<ButtonLink href="/forgot-password">Get a new link</ButtonLink>}
        className="border-0 p-0"
      />
    );
  }

  if (reset.isSuccess) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-good-fg" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold">Password changed</h1>
        <p className="mt-2 text-ink-muted">For your safety, every device has been signed out. Sign in with your new password.</p>
        <ButtonLink href="/sign-in" className="mt-6">Sign in</ButtonLink>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-ink-muted">At least 8 characters, with a letter and a number.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit((v) => reset.mutate(v))}>
        {reset.isError ? (
          <div className="space-y-2">
            <FormError error={reset.error} />
            <Link href="/forgot-password" className="text-[15px] font-semibold text-action hover:underline">Get a new link</Link>
          </div>
        ) : null}
        <PasswordField label="New password" autoComplete="new-password" autoFocus error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordField label="Type it again" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" className="w-full" loading={reset.isPending}>Save new password</Button>
      </form>
    </>
  );
}
