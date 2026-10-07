import React, { useState } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { UserAccount } from '../../types';
import { AuthLayout } from './AuthLayout';

const ACCOUNT_TYPES: UserAccount['accountType'][] = ['Creator', 'Personal brand', 'Business', 'E-commerce', 'Marketing agency', 'Other'];

const rules = (pw: string) => [
  { ok: pw.length >= 8, label: 'At least 8 characters' },
  { ok: /[A-Za-z]/.test(pw), label: 'A letter' },
  { ok: /\d/.test(pw), label: 'A number' },
];

export const CreateAccount: React.FC = () => {
  const { register, setAppView } = useMedia();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [accountType, setAccountType] = useState<UserAccount['accountType']>('Creator');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = rules(password);
  const valid = fullName.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && checks.every((c) => c.ok) && accepted;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!valid) return;
    setLoading(true); setError(null);
    try { await register({ fullName: fullName.trim(), email: email.trim(), accountType, password }); }
    catch (err: any) { setError(err?.status === 409 ? 'An account with this email already exists. Try signing in instead.' : err?.message || 'We couldn’t create your account. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Create your account" subtitle="It takes a minute. You’ll connect your first account next."
      footer={<>Already have an account? <button onClick={() => setAppView('signin')} className="font-semibold text-brand-700 hover:underline">Sign in</button></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div><label htmlFor="su-name" className="text-sm font-semibold block mb-1.5">Full name</label><input id="su-name" autoComplete="name" required autoFocus maxLength={120} className="input !h-12" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label htmlFor="su-email" className="text-sm font-semibold block mb-1.5">Email</label><input id="su-email" type="email" autoComplete="email" required className="input !h-12" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
        <div><label htmlFor="su-type" className="text-sm font-semibold block mb-1.5">I am a</label><select id="su-type" className="input !h-12" value={accountType} onChange={(e) => setAccountType(e.target.value as UserAccount['accountType'])}>{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div>
          <label htmlFor="su-pw" className="text-sm font-semibold block mb-1.5">Password</label>
          <div className="relative"><input id="su-pw" type={show ? 'text' : 'password'} autoComplete="new-password" required className="input !h-12 !pr-12" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="su-rules" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
          <ul id="su-rules" className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">{checks.map((c) => <li key={c.label} className={`text-sm flex items-center gap-1.5 ${c.ok ? 'text-emerald-700' : 'text-muted'}`}><Check className={`w-4 h-4 ${c.ok ? '' : 'opacity-30'}`} />{c.label}</li>)}</ul>
        </div>
        <label className="flex gap-3 items-start text-sm text-body cursor-pointer"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#d4560c]" />
          <span>I agree to the Terms of Service and Privacy Policy.</span></label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</p>}
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-lg w-full">{loading && <Loader2 className="w-5 h-5 animate-spin" />}Create account</button>
      </form>
    </AuthLayout>
  );
};
