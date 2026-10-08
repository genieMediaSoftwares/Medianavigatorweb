import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Globe, Loader2 } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { PlatformType } from '../../types';
import { PlatformConnectModal } from '../../components/modals/PlatformConnectModal';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../../components/common/PlatformLogos';
import { platformName } from '../../components/ui';

const ACCOUNT_TYPES = ['Creator', 'Personal brand', 'Business', 'E-commerce', 'Marketing agency', 'Other'] as const;
const LOGO: Record<PlatformType, React.ReactNode> = { instagram: <InstagramLogo size="lg" />, youtube: <YouTubeLogo size="lg" />, facebook: <FacebookLogo size="lg" />, linkedin: <LinkedInLogo size="lg" /> };

export const Onboarding: React.FC = () => {
  const { user, setUser, setAppView, setCurrentTab, connections, refreshConnections } = useMedia();
  const [step, setStep] = useState<1 | 2>(1);
  const detected = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
  const [organization, setOrganization] = useState(user.organization || '');
  const [accountType, setAccountType] = useState<string>(user.accountType || 'Creator');
  const [timezone, setTimezone] = useState(detected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<PlatformType | null>(null);

  useEffect(() => { refreshConnections(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const p = await api.updateProfile({ organization: organization.trim() || undefined, accountType, timezone });
      setUser({ ...user, organization: p.organization ?? user.organization });
      setStep(2);
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const finish = async () => {
    try { await api.updateProfile({ onboardingCompleted: true }); } catch { /* not critical */ }
    setCurrentTab('overview'); setAppView('app');
  };

  const linked = connections.filter((c) => c.connected).length;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="px-6 md:px-10 h-[72px] flex items-center justify-between"><BrandLogo />
        <span className="text-sm text-muted" aria-label={`Step ${step} of 2`}>Step {step} of 2</span></header>
      <main className="flex-1 flex items-start md:items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl">
          <div className="flex gap-2 mb-8" aria-hidden="true">{[1, 2].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand-500' : 'bg-line'}`} />)}</div>

          {step === 1 ? (
            <form onSubmit={saveProfile} className="animate-fade-up">
              <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">Welcome{user.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}.</h1>
              <p className="mt-3 text-lg text-body">Two quick details so your results make sense.</p>
              <div className="mt-8 space-y-5">
                <div><label htmlFor="o-org" className="text-sm font-semibold block mb-1.5">Brand or organization <span className="text-muted font-normal">(optional)</span></label><input id="o-org" className="input" maxLength={160} value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Studio North" /></div>
                <div><label htmlFor="o-type" className="text-sm font-semibold block mb-1.5">I am a</label><select id="o-type" className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)}>{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label htmlFor="o-tz" className="text-sm font-semibold block mb-1.5 flex items-center gap-1.5"><Globe className="w-4 h-4 text-muted" />Timezone</label>
                  <input id="o-tz" required className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} list="tz-list" />
                  <datalist id="tz-list">{(() => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone').map((z) => <option key={z} value={z} />); } catch { return null; } })()}</datalist>
                  <p className="text-xs text-muted mt-1.5">Detected from your browser; choose yours if it is empty. It decides which hours count as “morning” or “evening” for your best posting times.</p></div>
              </div>
              {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</p>}
              <button className="btn btn-primary btn-lg w-full mt-8" disabled={saving || !timezone.trim()}>{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}Continue<ArrowRight className="w-5 h-5" /></button>
            </form>
          ) : (
            <div className="animate-fade-up">
              <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight leading-[1.05]">Connect your first account.</h1>
              <p className="mt-3 text-lg text-body">Pick where you post most. You can add the rest later.</p>
              <ul className="mt-8 grid grid-cols-2 gap-3">
                {(['instagram', 'youtube', 'facebook', 'linkedin'] as PlatformType[]).map((p) => {
                  const done = connections.find((c) => c.platform === p)?.connected;
                  return (
                    <li key={p}><button onClick={() => setConnecting(p)} className={`card card-interactive w-full p-5 text-left flex flex-col gap-3 ${done ? '!border-emerald-300 !bg-emerald-50/40' : ''}`}>
                      <span className="flex items-center justify-between">{LOGO[p]}{done && <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-4 h-4" /></span>}</span>
                      <span className="font-bold">{platformName(p)}</span><span className="text-sm text-muted -mt-2">{done ? 'Connected' : 'Connect'}</span></button></li>
                  );
                })}
              </ul>
              <button onClick={finish} className="btn btn-primary btn-lg w-full mt-8">{linked > 0 ? 'Go to my overview' : 'Skip for now'}<ArrowRight className="w-5 h-5" /></button>
              {linked === 0 && <p className="mt-3 text-sm text-muted text-center">You can connect an account any time from Connections.</p>}
            </div>
          )}
        </div>
      </main>
      {connecting && <PlatformConnectModal platform={connecting} connection={connections.find((c) => c.platform === connecting)} onClose={() => setConnecting(null)} onSuccess={() => refreshConnections()} />}
    </div>
  );
};
