'use client';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { useMe } from '@/lib/hooks/useQueries';

type Run = <T>(action: () => Promise<T>) => Promise<T>;
const Ctx = createContext<Run | null>(null);

/**
 * High-risk admin changes need a recent password (and code) confirmation, enforced by the API. When the API answers
 * REAUTH_REQUIRED, this asks for it once and retries the same action; cancelling rejects with the original error.
 */
export function StepUpProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ resolve: () => void; reject: () => void } | null>(null);
  const mfa = Boolean(me.data?.user.mfaEnabled);

  const ask = () => new Promise<void>((resolve, reject) => { pending.current = { resolve, reject }; setPassword(''); setCode(''); setError(''); setOpen(true); });
  const run: Run = useCallback(async (action) => {
    try { return await action(); }
    catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'REAUTH_REQUIRED') throw e;
      try { await ask(); } catch { throw e; }
      return action();
    }
  }, []);

  async function confirm() {
    setBusy(true); setError('');
    try {
      const factor = !mfa ? {} : /^\d{6}$/.test(code.trim()) ? { mfaCode: code.trim() } : { recoveryCode: code.trim() };
      await api.reauth({ password, ...factor });
      setOpen(false); pending.current?.resolve(); pending.current = null;
    } catch (e) { setError(e instanceof ApiError ? e.message : 'We couldn’t confirm that. Please try again.'); }
    finally { setBusy(false); }
  }
  function cancel() { setOpen(false); pending.current?.reject(); pending.current = null; }

  return <Ctx.Provider value={run}>
    {children}
    <Modal open={open} onOpenChange={(o) => { if (!o) cancel(); }} title="Confirm it’s you" description="Sensitive changes need your password from the last few minutes.">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
        <label className="block space-y-2"><span>Password</span><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {mfa && <label className="block space-y-2"><span>Authentication code or recovery code</span><Input inputMode="text" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></label>}
        {error && <p role="alert" className="text-bad">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={cancel}>Cancel</Button><Button type="submit" loading={busy}>Confirm</Button></div>
      </form>
    </Modal>
  </Ctx.Provider>;
}

export function useStepUp(): Run {
  const run = useContext(Ctx);
  if (!run) throw new Error('useStepUp must be used inside <StepUpProvider>');
  return run;
}
