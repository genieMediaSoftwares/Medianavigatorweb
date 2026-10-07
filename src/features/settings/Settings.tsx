import React, { useEffect, useState } from 'react';
import { Check, Loader2, LogOut, ShieldCheck, Trash2, User as UserIcon, Lock, Database } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api, Profile, SessionInfo } from '../../services/api';
import { Badge, PageSkeleton, timeAgo } from '../../components/ui';

type Tab = 'profile' | 'security' | 'data';
const ACCOUNT_TYPES = ['Creator', 'Personal brand', 'Business', 'E-commerce', 'Marketing agency', 'Other'] as const;

const zones = (): string[] => {
  try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone'); } catch { return ['UTC']; }
};

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div><label htmlFor={id} className="text-sm font-semibold block mb-1.5">{label}</label>{children}{hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}</div>
);

const Notice: React.FC<{ kind: 'ok' | 'error'; children: React.ReactNode }> = ({ kind, children }) => (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border text-sm p-3 ${kind === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>{children}</p>
);

export const Settings: React.FC = () => {
  const { user, setUser, logout } = useMedia();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState({ fullName: '', organization: '', accountType: 'Creator', timezone: 'UTC' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [deletePw, setDeletePw] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.getProfile().then(({ profile: p }) => {
      setProfile(p);
      setForm({ fullName: p?.fullName ?? '', organization: p?.organization ?? '', accountType: p?.accountType ?? 'Creator', timezone: p?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC' });
    }).catch((e: Error) => setMsg({ kind: 'error', text: e.message })).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (tab === 'security') api.listSessions().then(setSessions).catch((e: Error) => setMsg({ kind: 'error', text: e.message })); }, [tab]);
  useEffect(() => setMsg(null), [tab]);

  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); } finally { setBusy(null); } };

  const saveProfile = (e: React.FormEvent) => { e.preventDefault(); void run('profile', async () => {
    const p = await api.updateProfile({ fullName: form.fullName.trim(), organization: form.organization.trim() || undefined, accountType: form.accountType, timezone: form.timezone });
    setProfile(p); setUser({ ...user, fullName: p.fullName, organization: p.organization ?? user.organization });
    setMsg({ kind: 'ok', text: 'Saved. Best-time analysis now uses your timezone.' });
  }); };

  const changePassword = (e: React.FormEvent) => { e.preventDefault(); void run('pw', async () => {
    await api.changePassword(pw.current, pw.next); setPw({ current: '', next: '' }); setSessions(await api.listSessions());
    setMsg({ kind: 'ok', text: 'Password changed. Your other devices were signed out.' });
  }); };

  const deleteAccount = (e: React.FormEvent) => { e.preventDefault(); void run('delete', async () => { await api.deleteAccount(deletePw); logout(); }); };

  if (loading) return <PageSkeleton />;

  const tabs: { id: Tab; label: string; icon: typeof UserIcon }[] = [{ id: 'profile', label: 'Profile', icon: UserIcon }, { id: 'security', label: 'Security', icon: Lock }, { id: 'data', label: 'Data and privacy', icon: Database }];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10 max-w-5xl">
      <nav aria-label="Settings" className="flex md:flex-col gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-body hover:bg-canvas-soft'}`}><t.icon className="w-[18px] h-[18px]" />{t.label}</button>
        ))}
      </nav>

      <div className="space-y-5 min-w-0">
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="card p-6 space-y-5">
            <div><h2 className="text-lg font-bold">Profile</h2><p className="text-sm text-muted mt-0.5">Signed in as <span className="font-semibold text-ink">{user.email}</span></p></div>
            <Field id="s-name" label="Full name"><input id="s-name" required maxLength={120} className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field id="s-org" label="Organization"><input id="s-org" maxLength={160} className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></Field>
              <Field id="s-type" label="I am a"><select id="s-type" className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            </div>
            <Field id="s-tz" label="Timezone" hint="Used to work out which days and hours your posts perform best."><select id="s-tz" className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>{[...new Set([form.timezone, ...zones()])].map((z) => <option key={z}>{z}</option>)}</select></Field>
            <button className="btn btn-primary" disabled={busy === 'profile' || !form.fullName.trim()}>{busy === 'profile' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save changes</button>
            {profile && !profile.timezone && <p className="text-sm text-muted">No timezone saved yet, so analysis currently uses UTC.</p>}
          </form>
        )}

        {tab === 'security' && (
          <>
            <form onSubmit={changePassword} className="card p-6 space-y-5">
              <div><h2 className="text-lg font-bold">Change password</h2><p className="text-sm text-muted mt-0.5">At least 8 characters with a letter and a number.</p></div>
              <Field id="p-cur" label="Current password"><input id="p-cur" type="password" autoComplete="current-password" required className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
              <Field id="p-new" label="New password"><input id="p-new" type="password" autoComplete="new-password" required minLength={8} className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
              <button className="btn btn-primary" disabled={busy === 'pw' || !pw.current || pw.next.length < 8}>{busy === 'pw' && <Loader2 className="w-4 h-4 animate-spin" />}Update password</button>
            </form>

            <section className="card p-6">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Where you’re signed in</h2><p className="text-sm text-muted mt-0.5">Sign out any device you don’t recognise.</p></div>
                <button onClick={() => run('all', async () => { await api.logoutEverywhere(); logout(); })} className="btn btn-secondary btn-sm shrink-0" disabled={busy === 'all'}><LogOut className="w-4 h-4" />Sign out everywhere</button></div>
              <ul className="mt-4 divide-y divide-line">
                {sessions.map((s) => (
                  <li key={s.id} className="py-3 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-muted shrink-0" />
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{(s.userAgent ?? 'Unknown device').slice(0, 70)}</div><div className="text-xs text-muted">Last active {timeAgo(s.lastUsedAt)}{s.ip ? ` · ${s.ip}` : ''}</div></div>
                    {s.current ? <Badge tone="success">This device</Badge> : <button onClick={() => run(`s-${s.id}`, async () => { await api.revokeSession(s.id); setSessions((l) => l.filter((x) => x.id !== s.id)); })} className="text-sm font-semibold text-rose-700 hover:underline">Sign out</button>}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {tab === 'data' && (
          <>
            <section className="card p-6 space-y-3 text-sm text-body leading-relaxed">
              <h2 className="text-lg font-bold text-ink">What we keep</h2>
              <p>Your account details, the posts and numbers imported from your connected channels, and the results calculated from them. Connection tokens are encrypted and are deleted the moment you disconnect.</p>
              <p>Connections are read-only: Media Navigator can’t post, edit or delete anything on your accounts.</p>
            </section>
            <section className="card p-6 border-rose-200">
              <h2 className="text-lg font-bold text-rose-900">Delete account</h2>
              <p className="text-sm text-body mt-1">Permanently deletes your profile, imported posts, results, planner, files and connection tokens. This can’t be undone.</p>
              {!confirmDelete ? <button onClick={() => setConfirmDelete(true)} className="btn mt-4 border border-rose-200 text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4" />Delete my account</button> : (
                <form onSubmit={deleteAccount} className="mt-4 space-y-3 max-w-sm">
                  <Field id="d-pw" label="Confirm with your password"><input id="d-pw" type="password" autoComplete="current-password" required className="input" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} /></Field>
                  <div className="flex gap-2"><button disabled={busy === 'delete' || !deletePw} className="btn bg-rose-600 text-white hover:bg-rose-700">{busy === 'delete' && <Loader2 className="w-4 h-4 animate-spin" />}Permanently delete</button><button type="button" onClick={() => { setConfirmDelete(false); setDeletePw(''); }} className="btn btn-secondary">Cancel</button></div>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
