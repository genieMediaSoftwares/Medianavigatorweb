'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Wordmark } from '@/components/brand/logo';
import { ConnectModal } from '@/components/connections/connect-modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { PlatformTile } from '@/components/ui/platform-logo';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { useConnections, useMe } from '@/lib/hooks/useQueries';
import { PLATFORM_NAME } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { ACCOUNT_TYPES, PLATFORMS, type Platform } from '@/types/api';

const schema = z.object({ timezone: z.string().min(1, 'Choose your time zone'), organization: z.string().trim().max(160).optional(), accountType: z.string().optional() });
type Values = z.infer<typeof schema>;

function detectZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { return ''; }
}
function zones(): string[] {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return []; }
}

export function OnboardingFlow() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const connections = useConnections();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [finishing, setFinishing] = useState(false);
  const all = useMemo(() => zones(), []);
  const detected = useMemo(() => detectZone(), []);
  const saved = me.data?.profile?.timezone ?? '';
  const options = useMemo(() => { const z = new Set(all); const cur = saved || detected; if (cur) z.add(cur); return [...z].sort(); }, [all, saved, detected]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { timezone: saved || detected, organization: me.data?.profile?.organization ?? '', accountType: me.data?.profile?.accountType ?? '' } });
  const connected = (connections.data ?? []).filter((c) => c.connected);

  const saveProfile = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.updateProfile({ timezone: v.timezone, ...(v.organization ? { organization: v.organization } : {}), ...(v.accountType ? { accountType: v.accountType } : {}) });
      await qc.invalidateQueries({ queryKey: qk.me });
      setStep(2);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'We couldn’t save that. Please try again.'); }
  });

  const finish = async () => {
    setFinishing(true); setError(null);
    try { await api.updateProfile({ onboardingCompleted: true }); await qc.invalidateQueries({ queryKey: qk.me }); router.replace('/home'); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'We couldn’t finish setting up. Please try again.'); setFinishing(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
      <Wordmark href="/home" />
      <div className="my-auto py-10">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold"><span className="text-brand-600">Step {step} of 2</span><span className="text-subtle">{step === 1 ? 'About you' : 'Connect an account'}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}><div className="h-full rounded-full transition-all duration-300" style={{ width: step === 1 ? '50%' : '100%', background: 'var(--gradient)' }} /></div>
        </div>

        {step === 1 ? (
          <form onSubmit={saveProfile} noValidate className="card space-y-5 p-6 sm:p-8">
            <div><h1 className="text-[28px] leading-tight">Welcome{me.data?.profile?.fullName ? `, ${me.data.profile.fullName.split(' ')[0]}` : ''}. Let&apos;s set you up.</h1><p className="mt-2 text-[15px] text-muted">Two quick things, then you can connect your first account.</p></div>
            <Field label="Your time zone" error={errors.timezone?.message} hint="It decides which hours count as morning or evening in your best posting times.">
              {(p) => <Select {...p} {...register('timezone')}><option value="">Choose your time zone</option>{options.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}</Select>}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Organization" optional>{(p) => <Input autoComplete="organization" {...p} {...register('organization')} />}</Field>
              <Field label="I am a…" optional>{(p) => <Select {...p} {...register('accountType')}><option value="">Choose one</option>{ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>}</Field>
            </div>
            {error && <Notice tone="bad">{error}</Notice>}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Continue<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
          </form>
        ) : (
          <div className="card p-6 sm:p-8">
            <h1 className="text-[28px] leading-tight">Connect your first account</h1>
            <p className="mt-2 text-[15px] text-muted">Pick one to start. You can add the others later. We only read; we never post.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {PLATFORMS.map((p) => {
                const live = connected.some((c) => c.platform === p);
                return (
                  <button key={p} onClick={() => !live && setConnecting(p)} aria-label={live ? `${PLATFORM_NAME[p]} is connected` : `Connect ${PLATFORM_NAME[p]}`}
                    className={cn('flex h-20 items-center gap-4 rounded-2xl border p-4 text-left transition-colors', live ? 'border-good bg-good-bg' : 'border-line-strong bg-surface hover:border-brand-500 hover:bg-brand-50')}>
                    <PlatformTile platform={p} size="lg" />
                    <span className="flex-1"><span className="block font-display text-base font-bold text-ink">{PLATFORM_NAME[p]}</span><span className="block text-[13px] text-muted">{live ? 'Connected' : 'Tap to connect'}</span></span>
                    {live && <CheckCircle2 className="h-6 w-6 text-good" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {error && <Notice tone="bad" className="mt-5">{error}</Notice>}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => void finish()} disabled={finishing}>{connected.length ? 'Skip for now' : 'I’ll do this later'}</Button>
              <Button size="lg" onClick={() => void finish()} loading={finishing} disabled={connected.length === 0}>Go to my home page<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
            </div>
          </div>
        )}
      </div>
      {connecting && <ConnectModal platform={connecting} connection={connections.data?.find((c) => c.platform === connecting)} open onOpenChange={(o) => !o && setConnecting(null)} />}
    </div>
  );
}
