'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { usersApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { ACCOUNT_TYPES, CONNECTION_STATUS, READ_ONLY_NOTE } from '@/lib/copy';
import { useConnections, useMe } from '@/lib/hooks';
import { browserTimeZone, timeZones } from '@/lib/validation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { CardsSkeleton, ErrorState, FormError, ListSkeleton } from '@/components/ui/States';
import { OAuthConnectButton, TokenConnectForm } from '@/components/connections/ConnectActions';
import type { Connection } from '@/types/api';

const step1 = z.object({
  timezone: z.string().min(1, 'Choose your time zone'),
  organization: z.string().trim().max(160, 'Use 160 characters or fewer'),
  accountType: z.string().max(60),
});
type Step1 = z.infer<typeof step1>;

export function OnboardingView() {
  const me = useMe();
  const [step, setStep] = useState<1 | 2>(1);

  if (me.isPending) return <ListSkeleton rows={3} />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-semibold text-ink-muted">Step {step} of 2</p>
        <div className="mt-2 h-2 rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step} aria-label="Setup progress">
          <div className="h-2 rounded-full bg-action transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>
      </div>
      {step === 1 ? <TimeZoneStep onDone={() => setStep(2)} /> : <ConnectStep onBack={() => setStep(1)} />}
    </>
  );
}

function TimeZoneStep({ onDone }: { onDone: () => void }) {
  const me = useMe();
  const client = useQueryClient();
  const profile = me.data?.profile;
  const zones = timeZones();
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<Step1>({
    resolver: zodResolver(step1),
    mode: 'onChange',
    defaultValues: { timezone: profile?.timezone ?? '', organization: profile?.organization ?? '', accountType: profile?.accountType ?? '' },
  });
  // Detected from this browser; the person can change it before continuing.
  useEffect(() => {
    if (!getValues('timezone')) {
      const tz = browserTimeZone();
      if (tz) setValue('timezone', tz);
    }
  }, [getValues, setValue]);

  const save = useMutation({
    mutationFn: (v: Step1) => usersApi.updateProfile({
      timezone: v.timezone,
      ...(v.organization ? { organization: v.organization } : {}),
      ...(v.accountType ? { accountType: v.accountType } : {}),
    }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.me });
      onDone();
    },
  });

  return (
    <Card>
      <h1 className="font-display text-3xl font-semibold">Welcome{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}</h1>
      <p className="mt-1 text-ink-muted">Two quick steps and you&apos;re in.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        {save.isError ? <FormError error={save.error} /> : null}
        <SelectField label="Your time zone" error={errors.timezone?.message} hint="We use it to work out your best times to post. We detected it from your browser; change it if it's wrong." {...register('timezone')}>
          <option value="">Choose your time zone</option>
          {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
        </SelectField>
        <TextField label="Organization" optional autoComplete="organization" error={errors.organization?.message} {...register('organization')} />
        <SelectField label="I am a…" optional {...register('accountType')}>
          <option value="">Choose one</option>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </SelectField>
        <Button type="submit" loading={save.isPending}>Continue</Button>
      </form>
    </Card>
  );
}

function ConnectStep({ onBack }: { onBack: () => void }) {
  const connections = useConnections();
  const client = useQueryClient();
  const router = useRouter();
  const finish = useMutation({
    mutationFn: () => usersApi.updateProfile({ onboardingCompleted: true }),
    onSuccess: async () => {
      // Wait for the fresh profile so the app doesn't send the user straight back to setup.
      await client.invalidateQueries({ queryKey: qk.me });
      router.replace('/home');
    },
  });
  const anyConnected = connections.data?.some((c) => c.connected);

  return (
    <Card>
      <h1 className="font-display text-3xl font-semibold">Connect your first account</h1>
      <p className="mt-1 text-ink-muted">{READ_ONLY_NOTE} You can add more later.</p>
      <div className="mt-6">
        {connections.isPending ? <CardsSkeleton count={4} className="sm:grid-cols-2 lg:grid-cols-2" /> : connections.isError ? (
          <ErrorState error={connections.error} onRetry={() => connections.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {connections.data.map((c) => <ConnectTile key={c.platform} connection={c} />)}
          </div>
        )}
      </div>
      {finish.isError ? <div className="mt-4"><FormError error={finish.error} /></div> : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button variant={anyConnected ? 'primary' : 'secondary'} loading={finish.isPending} onClick={() => finish.mutate()}>
          {anyConnected ? 'Go to my dashboard' : 'Skip for now'}
        </Button>
      </div>
    </Card>
  );
}

function ConnectTile({ connection: c }: { connection: Connection }) {
  const [advanced, setAdvanced] = useState(false);
  const status = CONNECTION_STATUS[c.status];
  return (
    <div className="rounded-[var(--radius-card)] border border-line p-5">
      <div className="flex items-center gap-3">
        <PlatformIcon platform={c.platform} decorative className="size-10" />
        <div>
          <h2 className="text-lg font-semibold">{c.name}</h2>
          {c.connected ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </div>
      </div>
      {c.connected ? (
        <p className="mt-3 flex items-center gap-2 text-good-fg"><CheckCircle2 className="size-4" aria-hidden /> {c.accountHandle}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {/* Leaving for the platform's sign-in page ends setup: the API brings the browser back to /connections. */}
          {c.oauthAvailable ? <OAuthConnectButton platform={c.platform} className="w-full" beforeRedirect={() => usersApi.updateProfile({ onboardingCompleted: true })} /> : null}
          {advanced ? (
            <TokenConnectForm connection={c} />
          ) : (
            <Button variant={c.oauthAvailable ? 'ghost' : 'secondary'} className="w-full" onClick={() => setAdvanced(true)}>
              {c.oauthAvailable ? 'Use an access token instead' : 'Connect with an access token'}
            </Button>
          )}
        </div>
      )}
      <p className="mt-3 text-sm text-ink-subtle">
        <Link href="/privacy" className="underline">How access works</Link>
      </p>
    </div>
  );
}
