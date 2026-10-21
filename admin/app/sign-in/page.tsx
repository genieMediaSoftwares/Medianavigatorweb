'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogoLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
export default function SignIn() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  // Shown once the API says this account uses two-step sign-in; no session exists until the code is accepted.
  const [needsCode, setNeedsCode] = useState(false); const [code, setCode] = useState('');
  const router = useRouter(); const qc = useQueryClient();
  async function submit() {
    setBusy(true); setError('');
    const factor = !needsCode ? {} : /^\d{6}$/.test(code.trim()) ? { mfaCode: code.trim() } : { recoveryCode: code.trim() };
    try { await api.login({ email, password, ...factor }); qc.clear(); router.replace('/admin'); }
    catch (e) {
      if (e instanceof ApiError && e.code === 'MFA_REQUIRED') { setNeedsCode(true); setError(''); }
      else setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally { setBusy(false); }
  }
  return <main className="flex min-h-dvh items-center justify-center p-6"><div className="card w-full max-w-md space-y-7 p-8"><LogoLockup /><div><p className="eyebrow mb-3">Administration</p><h1 className="text-2xl">Sign in to your command center</h1><p className="mt-3 text-muted">Manage Media Navigator across your website and mobile app.</p></div><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}><label className="block space-y-2"><span>Email</span><Input type="email" autoComplete="username" required maxLength={254} value={email} readOnly={needsCode} onChange={e => setEmail(e.target.value)} /></label><label className="block space-y-2"><span>Password</span><Input type="password" autoComplete="current-password" required value={password} readOnly={needsCode} onChange={e => setPassword(e.target.value)} /></label>{needsCode && <label className="block space-y-2"><span>Authentication code</span><Input autoFocus inputMode="text" autoComplete="one-time-code" required maxLength={20} value={code} onChange={e => setCode(e.target.value)} /><span className="block text-sm text-muted">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</span></label>}{error && <p role="alert" className="text-bad">{error}</p>}<Button type="submit" loading={busy} className="w-full">{needsCode ? 'Verify and sign in' : 'Sign in securely'}</Button>{needsCode && <Button variant="ghost" className="w-full" onClick={() => { setNeedsCode(false); setCode(''); setPassword(''); }}>Use a different account</Button>}</form><p className="text-xs text-muted">Access is restricted to existing administrators. Contact your system owner for access.</p></div></main>;
}
