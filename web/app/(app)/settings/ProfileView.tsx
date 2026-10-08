'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { usersApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { ACCOUNT_TYPES } from '@/lib/copy';
import { useMe } from '@/lib/hooks';
import { timeZones } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { ErrorState, FormError, ListSkeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Tell us your name').max(120, 'Use 120 characters or fewer'),
  organization: z.string().trim().max(160, 'Use 160 characters or fewer'),
  accountType: z.string().max(60),
  timezone: z.string().min(1, 'Choose your time zone'),
});
type Values = z.infer<typeof schema>;

export function ProfileView() {
  const me = useMe();
  const client = useQueryClient();
  const toast = useToast();
  const profile = me.data?.profile;
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: profile ? { fullName: profile.fullName, organization: profile.organization ?? '', accountType: profile.accountType ?? '', timezone: profile.timezone ?? '' } : undefined,
  });
  const save = useMutation({
    // The API rejects empty strings, so cleared optional fields are simply not sent.
    mutationFn: (v: Values) => usersApi.updateProfile({
      fullName: v.fullName,
      timezone: v.timezone,
      ...(v.organization ? { organization: v.organization } : {}),
      ...(v.accountType ? { accountType: v.accountType } : {}),
    }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.me });
      void client.invalidateQueries({ queryKey: qk.intelligence });
      toast('Profile saved.');
    },
  });

  if (me.isPending) return <ListSkeleton rows={3} />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;

  const zones = timeZones();
  return (
    <Card className="max-w-2xl">
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        {save.isError ? <FormError error={save.error} /> : null}
        <TextField label="Name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email" value={me.data.user.email} readOnly disabled hint="Your sign-in email can't be changed here." />
        <TextField label="Organization" optional autoComplete="organization" error={errors.organization?.message} {...register('organization')} />
        <SelectField label="I am a…" optional {...register('accountType')}>
          <option value="">Choose one</option>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </SelectField>
        <SelectField
          label="Time zone"
          error={errors.timezone?.message}
          hint="Used for best times to post, the planner, and every date you see."
          {...register('timezone')}
        >
          <option value="">Choose your time zone</option>
          {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
        </SelectField>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>Save changes</Button>
      </form>
    </Card>
  );
}
