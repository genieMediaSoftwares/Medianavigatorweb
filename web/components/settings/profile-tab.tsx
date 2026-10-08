'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { qk } from '@/lib/queryKeys';
import { ACCOUNT_TYPES, type MeResponse } from '@/types/api';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Tell us your name').max(120, 'That name is too long'),
  organization: z.string().trim().max(160, 'Keep it under 160 characters'),
  accountType: z.string(),
  timezone: z.string(),
});
type Values = z.infer<typeof schema>;

function zones(extra: string[]): string[] {
  let list: string[] = [];
  try { list = Intl.supportedValuesOf('timeZone'); } catch { list = []; }
  const set = new Set([...list, ...extra.filter(Boolean)]);
  return [...set].sort();
}

export function ProfileTab({ me }: { me: MeResponse }) {
  const qc = useQueryClient();
  const toast = useToast();
  const detected = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } }, []);
  const saved = me.profile?.timezone ?? '';
  const options = useMemo(() => zones([saved, detected]), [saved, detected]);
  const defaults: Values = { fullName: me.profile?.fullName ?? '', organization: me.profile?.organization ?? '', accountType: me.profile?.accountType ?? '', timezone: saved || detected };
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: defaults });
  useEffect(() => { reset(defaults); }, [me.profile?.fullName, me.profile?.organization, me.profile?.accountType, saved, detected]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (v: Values) => api.updateProfile({ fullName: v.fullName, organization: v.organization, ...(v.accountType ? { accountType: v.accountType } : {}), ...(v.timezone ? { timezone: v.timezone } : {}) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: qk.me }); toast.success('Your profile was saved'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'We couldn’t save your profile. Please try again.'),
  });

  return (
    <Card>
      <SectionHeader title="Your profile" description="This is how we address you. Your email can’t be changed here." />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <Field label="Email" className="sm:col-span-2">{(p) => <Input value={me.user.email} readOnly disabled {...p} />}</Field>
        <Field label="Full name" error={errors.fullName?.message}>{(p) => <Input autoComplete="name" {...p} {...register('fullName')} />}</Field>
        <Field label="Organization" optional error={errors.organization?.message}>{(p) => <Input autoComplete="organization" {...p} {...register('organization')} />}</Field>
        <Field label="I am a…">
          {(p) => (
            <Select {...p} {...register('accountType')}>
              <option value="">Choose one</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Time zone" hint="Used to work out which days and hours your posts do best.">
          {(p) => (
            <Select {...p} {...register('timezone')}>
              {options.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
            </Select>
          )}
        </Field>
        {!saved && detected && <div className="sm:col-span-2"><Notice>We picked <strong>{detected.replace(/_/g, ' ')}</strong> from your browser. Save to keep it.</Notice></div>}
        <div className="sm:col-span-2"><Button type="submit" loading={save.isPending} disabled={!isDirty && Boolean(saved)}>Save changes</Button></div>
      </form>
    </Card>
  );
}
