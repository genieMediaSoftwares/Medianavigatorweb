'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Laptop, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { timeAgo } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { passwordField, passwordRules } from '@/lib/validation/auth';
import { deviceLabel } from './ua';

const schema = z.object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordField });
type Values = z.infer<typeof schema>;

function PasswordInput({ show, onToggle, ...props }: React.ComponentProps<typeof Input> & { show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-12" {...props} />
      <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-ink">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
    </div>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });
  const next = useWatch({ control, name: 'newPassword' }) ?? '';
  const change = useMutation({
    mutationFn: (v: Values) => api.changePassword(v),
    onSuccess: () => { reset(); toast.success('Your password was changed'); },
    onError: (e) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setError('currentPassword', { message: 'That isn’t your current password' });
      else toast.error(e instanceof ApiError ? e.message : 'We couldn’t change your password. Please try again.');
    },
  });
  return (
    <Card>
      <SectionHeader title="Change password" description="Choose a password you don’t use anywhere else." />
      <form onSubmit={handleSubmit((v) => change.mutate(v))} noValidate className="max-w-md space-y-5">
        <Field label="Current password" error={errors.currentPassword?.message}>{(p) => <PasswordInput show={show} onToggle={() => setShow((s) => !s)} autoComplete="current-password" {...p} {...register('currentPassword')} />}</Field>
        <Field label="New password" error={errors.newPassword?.message}>{(p) => <PasswordInput show={show} onToggle={() => setShow((s) => !s)} autoComplete="new-password" {...p} {...register('newPassword')} />}</Field>
        <ul className="space-y-1.5" aria-label="Password rules">
          {passwordRules.map((r) => {
            const ok = r.test(next);
            return <li key={r.id} className={cn('flex items-center gap-2 text-[13px]', ok ? 'text-good' : 'text-muted')}><Check className={cn('h-4 w-4', ok ? 'opacity-100' : 'opacity-30')} aria-hidden="true" />{r.label}<span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span></li>;
          })}
        </ul>
        <Button type="submit" loading={change.isPending}>Change password</Button>
      </form>
    </Card>
  );
}

function Devices() {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const q = useQuery({ queryKey: qk.sessions, queryFn: api.sessions });
  const [revoke, setRevoke] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const sessions = q.data?.sessions ?? [];
  return (
    <Card>
      <SectionHeader title="Where you’re signed in" description="If you don’t recognise a device, sign it out and change your password." />
      {q.isLoading && <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.data && (
        <ul className="divide-y divide-line">
          {sessions.map((s) => {
            const phone = /Android|iPhone|iPad/.test(s.userAgent ?? '');
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">{phone ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">{deviceLabel(s.userAgent)}{s.current && <Badge tone="good">This device</Badge>}</p>
                  <p className="text-sm text-muted">Last used {timeAgo(s.lastUsedAt)}</p>
                </div>
                {!s.current && <Button size="sm" variant="secondary" onClick={() => setRevoke(s.id)}>Sign out</Button>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6 border-t border-line pt-5">
        <Button variant="secondary" onClick={() => setAll(true)}>Sign out everywhere</Button>
      </div>
      <ConfirmDialog open={revoke !== null} onOpenChange={(o) => !o && setRevoke(null)} title="Sign out this device?" message="Whoever is using it will need to sign in again." confirmLabel="Sign out"
        onConfirm={async () => { if (!revoke) return; try { await api.revokeSession(revoke); await qc.invalidateQueries({ queryKey: qk.sessions }); toast.success('Device signed out'); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t sign that device out.'); } }} />
      <ConfirmDialog open={all} onOpenChange={setAll} title="Sign out everywhere?" message="You’ll be signed out on every device, including this one." confirmLabel="Sign out everywhere"
        onConfirm={async () => { try { await api.logoutAll(); qc.clear(); router.replace('/sign-in'); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t sign you out. Please try again.'); } }} />
    </Card>
  );
}

export function SecurityTab() {
  return <div className="space-y-6"><ChangePassword /><Devices /></div>;
}
