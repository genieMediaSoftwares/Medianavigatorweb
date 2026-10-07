import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { authApi } from '../../services/auth';
import { AuthLayout } from './AuthLayout';

export const SignIn: React.FC = () => {
  const { login, setAppView } = useMedia();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const ok = await login(email.trim(), password);
      if (!ok) setError('That email and password don’t match, or too many attempts were made. Please try again in a few minutes.');
    } catch { setError('We couldn’t reach the sign-in service. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault(); setForgotBusy(true); setForgotMsg(null);
    try { await authApi.forgotPassword(forgotEmail.trim()); setForgotMsg({ ok: true, text: 'If an account exists for that email, a reset link is on its way.' }); }
    catch (err) { setForgotMsg({ ok: false, text: (err as Error).message || 'We couldn’t send the email right now.' }); }
    finally { setForgotBusy(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see how your content is performing."
      footer={<>New here? <button onClick={() => setAppView('signup')} className="font-semibold text-brand-700 hover:underline">Create an account</button></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div><label htmlFor="si-email" className="text-sm font-semibold block mb-1.5">Email</label>
          <input id="si-email" type="email" autoComplete="email" required autoFocus className="input !h-12" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
        <div>
          <div className="flex items-center justify-between mb-1.5"><label htmlFor="si-pw" className="text-sm font-semibold">Password</label>
            <button type="button" onClick={() => { setForgotOpen(true); setForgotEmail(email); setForgotMsg(null); }} className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</button></div>
          <div className="relative"><input id="si-pw" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input !h-12 !pr-12" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</p>}
        <button type="submit" disabled={loading || !email || !password} className="btn btn-primary btn-lg w-full">{loading && <Loader2 className="w-5 h-5 animate-spin" />}Sign in</button>
      </form>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}>
          <form onSubmit={sendReset} role="dialog" aria-modal="true" aria-label="Reset password" className="w-full max-w-sm bg-white rounded-3xl shadow-pop p-6 space-y-4 animate-fade-up">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">Reset your password</h2><p className="text-sm text-muted mt-1">We’ll email you a link that works once.</p></div>
              <button type="button" onClick={() => setForgotOpen(false)} className="p-2 -mr-2 -mt-1 rounded-xl text-muted hover:bg-canvas-soft" aria-label="Close"><X className="w-5 h-5" /></button></div>
            <input type="email" required autoFocus className="input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@company.com" aria-label="Email" />
            {forgotMsg && <p role="status" className={`text-sm rounded-xl p-3 border ${forgotMsg.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>{forgotMsg.text}</p>}
            <button disabled={forgotBusy || !forgotEmail} className="btn btn-primary w-full">{forgotBusy && <Loader2 className="w-4 h-4 animate-spin" />}Send reset link</button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};
