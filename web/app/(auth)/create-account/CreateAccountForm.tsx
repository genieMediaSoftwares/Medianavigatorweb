'use client';

import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react';
import type { z } from 'zod';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { ACCOUNT_TYPES } from '@/lib/copy';
import { PASSWORD_RULES, createAccountSchema } from '@/lib/validation';
import { useSessionNavigate } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { PasswordField, SelectField, TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { cn } from '@/lib/cn';

type Values = z.infer<typeof createAccountSchema>;

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return 'An account with this email already exists. Try signing in.';
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export function CreateAccountForm() {
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(createAccountSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', organization: '', accountType: '', consent: false },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const go = useSessionNavigate();
  const create = useMutation({
    mutationFn: (v: Values) =>
      authApi.register({
        fullName: v.fullName,
        email: v.email,
        password: v.password,
        organization: v.organization || undefined,
        accountType: v.accountType || undefined,
      }),
    onSuccess: () => go('/onboarding'),
  });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Create your account</h1>
      <p className="mt-1 text-ink-muted">It takes a minute. You can connect your channels right after.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit((v) => create.mutate(v))}>
        {create.isError ? (
          <div className="space-y-2">
            <FormError error={messageFor(create.error)} />
            {create.error instanceof ApiError && create.error.status === 409 ? (
              <Link href="/sign-in" className="text-[15px] font-semibold text-action hover:underline">Go to sign in</Link>
            ) : null}
          </div>
        ) : null}
        <TextField label="Your name" autoComplete="name" autoFocus error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register('email')} />
        <div>
          <PasswordField label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          <ul className="mt-2 space-y-1" aria-label="Password requirements">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.id} className={cn('flex items-center gap-2 text-sm', ok ? 'text-good-fg' : 'text-ink-subtle')}>
                  {ok ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
                  {r.label}
                  <span className="sr-only">{ok ? '(done)' : '(not yet)'}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <TextField label="Organization" optional autoComplete="organization" error={errors.organization?.message} {...register('organization')} />
        <SelectField label="I am a…" optional error={errors.accountType?.message} {...register('accountType')}>
          <option value="">Choose one</option>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </SelectField>
        <div>
          <label className="flex min-h-11 items-start gap-3 text-[15px]">
            <input type="checkbox" className="mt-1 size-5 accent-[var(--action)]" aria-invalid={errors.consent ? true : undefined} {...register('consent')} />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-action underline">Terms</Link> and{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-action underline">Privacy policy</Link>.
            </span>
          </label>
          {errors.consent ? <p className="text-sm text-bad-fg">{errors.consent.message}</p> : null}
        </div>
        <Button type="submit" className="w-full" loading={create.isPending}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-action hover:underline">Sign in</Link>
      </p>
    </>
  );
}
