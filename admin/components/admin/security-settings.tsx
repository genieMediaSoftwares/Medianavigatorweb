'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { dateTime } from '@/lib/format';

const factorOf = (code: string) => (/^\d{6}$/.test(code.trim()) ? { mfaCode: code.trim() } : { recoveryCode: code.trim() });
const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

/** Shown once after turning MFA on or regenerating: the codes are never retrievable again. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return <Card className="space-y-4" role="region" aria-label="Recovery codes">
    <SectionHeader title="Save your recovery codes" description="Each code works once if you lose your authenticator. They are shown only now." />
    <ul className="grid grid-cols-2 gap-2 font-mono text-sm">{codes.map((c) => <li key={c} className="rounded-lg bg-app px-3 py-2">{c}</li>)}</ul>
    <Button onClick={onDone}>I have saved these codes</Button>
  </Card>;
}

export function SecuritySettings() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['mfa'], queryFn: api.mfaStatus });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['mfa'] }), qc.invalidateQueries({ queryKey: ['me'] })]);

  return <div className="space-y-6">
    <Link className="text-brand-600 underline" href="/admin">Back to administration</Link>
    <PageHeader title="Security" subtitle="Two-step sign-in for your staff account." />
    {status.isPending && <p role="status">Loading security settings…</p>}
    {status.isError && <ErrorState error={status.error} onRetry={() => void status.refetch()} />}
    {codes && <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />}
    {status.data && !codes && <Card className="space-y-5">
      <SectionHeader title="Two-step sign-in" description={status.data.enabled ? `On since ${status.data.enabledAt ? dateTime(status.data.enabledAt) : 'enrolment'} · ${status.data.recoveryCodesRemaining} recovery codes left` : status.data.required ? 'Required for staff accounts. Set it up to use administration.' : 'Off. Turn it on to require a code from your authenticator app when you sign in.'} />
      {!status.data.available && <p>Two-step sign-in is available for staff accounts only.</p>}

      {status.data.available && !status.data.enabled && !setup && <form className="max-w-md space-y-4" onSubmit={(e) => { e.preventDefault(); void act(async () => { setSetup(await api.mfaSetup(password)); setPassword(''); }); }}>
        <label className="block space-y-2"><span>Confirm your password to start</span><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <Button type="submit" loading={busy}>Set up two-step sign-in</Button>
      </form>}

      {setup && !status.data.enabled && <form className="max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); void act(async () => { const r = await api.mfaEnable(code.trim()); setCodes(r.recoveryCodes); setSetup(null); setCode(''); await refresh(); }); }}>
        <p>Add this key to your authenticator app (choose “enter a setup key”, time-based), then enter the 6-digit code it shows.</p>
        <p className="break-all rounded-lg bg-app px-3 py-2 font-mono text-sm" aria-label="Setup key">{setup.secret.match(/.{1,4}/g)!.join(' ')}</p>
        <details className="text-sm text-muted"><summary>Setup link for apps that accept otpauth links</summary><p className="mt-2 break-all font-mono">{setup.otpauthUrl}</p></details>
        <label className="block space-y-2"><span>Code from your app</span><Input inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <div className="flex gap-2"><Button type="submit" loading={busy}>Turn on</Button><Button variant="secondary" onClick={() => { setSetup(null); setCode(''); }}>Cancel</Button></div>
        <p className="text-sm text-muted">Turning this on signs out your other devices.</p>
      </form>}

      {status.data.enabled && <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
        <label className="block space-y-2"><span>Password</span><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="block space-y-2"><span>Authentication code or recovery code</span><Input autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} disabled={!password || !code} onClick={() => void act(async () => { const r = await api.mfaRecoveryCodes({ password, ...factorOf(code) }); setCodes(r.recoveryCodes); setPassword(''); setCode(''); await refresh(); })}>New recovery codes</Button>
          {!status.data.required && <Button variant="secondary" loading={busy} disabled={!password || !code} onClick={() => void act(async () => { await api.mfaDisable({ password, ...factorOf(code) }); setPassword(''); setCode(''); await refresh(); })}>Turn off</Button>}
        </div>
      </form>}
      {error && <p role="alert" className="text-bad">{error}</p>}
    </Card>}
  </div>;
}
