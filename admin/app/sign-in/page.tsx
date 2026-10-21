'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogoLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { api } from '@/lib/api/endpoints';
export default function SignIn() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const router = useRouter(); const qc = useQueryClient();
  return <main className="flex min-h-dvh items-center justify-center p-6"><div className="card w-full max-w-md space-y-7 p-8"><LogoLockup /><div><p className="eyebrow mb-3">Administration</p><h1 className="text-2xl">Sign in to your command center</h1><p className="mt-3 text-muted">Manage Media Navigator across your website and mobile app.</p></div><form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await api.login({ email, password }); qc.clear(); router.replace('/admin'); } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed'); } finally { setBusy(false); } }}><label className="block space-y-2"><span>Email</span><Input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block space-y-2"><span>Password</span><Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="text-bad">{error}</p>}<Button type="submit" loading={busy} className="w-full">Sign in securely</Button></form><p className="text-xs text-muted">Access is restricted to existing administrators. Contact your system owner for access.</p></div></main>;
}
