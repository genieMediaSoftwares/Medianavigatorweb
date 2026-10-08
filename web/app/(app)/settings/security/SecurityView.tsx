'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { Monitor } from 'lucide-react';
import { authApi, usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { timeAgo } from '@/lib/format';
import { changePasswordSchema } from '@/lib/validation';
import { useSessionNavigate } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, useConfirm } from '@/components/ui/Dialog';
import { PasswordField } from '@/components/ui/Field';
import { ErrorState, FormError, ListSkeleton, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import type { Session } from '@/types/api';

type Values = z.infer<typeof changePasswordSchema>;

export function SecurityView() {
  return (
    <div className="grid max-w-3xl gap-6">
      <ChangePassword />
      <Devices />
    </div>
  );
}

function ChangePassword() {
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(changePasswordSchema), mode: 'onChange' });
  const change = useMutation({
    mutationFn: (v: Values) => authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      reset();
      toast('Password changed. Your other devices have been signed out.');
    },
  });
  const message = change.error instanceof ApiError && change.error.status === 401 ? 'Your current password is incorrect.' : change.error;
  return (
    <Card>
      <CardHeader title="Change password" description="Other devices will be signed out. This one stays signed in." />
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => change.mutate(v))}>
        {change.isError ? <FormError error={message} /> : null}
        <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordField label="Type the new password again" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" loading={change.isPending}>Change password</Button>
      </form>
    </Card>
  );
}

function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

function Devices() {
  const client = useQueryClient();
  const toast = useToast();
  const sessions = useQuery({ queryKey: qk.sessions, queryFn: usersApi.sessions });
  const confirmOne = useConfirm<Session>();
  const [confirmAll, setConfirmAll] = useState(false);
  const go = useSessionNavigate();
  const revoke = useMutation({
    mutationFn: (id: string) => usersApi.revokeSession(id),
    onSuccess: () => {
      confirmOne.close();
      void client.invalidateQueries({ queryKey: qk.sessions });
      toast('That device has been signed out.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const logoutAll = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => go('/sign-in'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Card>
      <CardHeader
        title="Signed-in devices"
        description="Sign out any device you don't recognise."
        action={<Button variant="secondary" onClick={() => setConfirmAll(true)}>Sign out everywhere</Button>}
      />
      {sessions.isPending ? <ListSkeleton rows={2} /> : sessions.isError ? <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} /> : (
        <ul className="divide-y divide-line">
          {sessions.data.sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <Monitor className="size-5 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{describeDevice(s.userAgent)} {s.current ? <Badge tone="good" className="ml-1">This device</Badge> : null}</p>
                <p className="text-sm text-ink-muted">
                  {s.lastUsedAt ? `Last active ${timeAgo(s.lastUsedAt)}` : `Signed in ${timeAgo(s.createdAt)}`}{s.ip ? ` · ${s.ip}` : ''}
                </p>
              </div>
              {!s.current ? <Button variant="ghost" size="sm" onClick={() => confirmOne.ask(s)}>Sign out</Button> : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmOne.open}
        onOpenChange={(o) => !o && confirmOne.close()}
        title="Sign out this device?"
        consequence="That device will need to sign in again to use Media Navigator."
        confirmLabel="Sign out device"
        onConfirm={() => confirmOne.target && revoke.mutate(confirmOne.target.id)}
        pending={revoke.isPending}
      />
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out everywhere?"
        consequence="Every device, including this one, will be signed out and need to sign in again."
        confirmLabel="Sign out everywhere"
        onConfirm={() => logoutAll.mutate()}
        pending={logoutAll.isPending}
      />
    </Card>
  );
}
