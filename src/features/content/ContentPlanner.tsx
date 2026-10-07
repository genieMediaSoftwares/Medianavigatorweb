import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles, X, Loader2, Clock } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { PlannedContent, PlatformType } from '../../types';
import { Badge, PageSkeleton, platformName, typeLabel } from '../../components/ui';
import { EmptyState } from '../../components/common/EmptyState';

const DAYS: PlannedContent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FORMATS = ['Reel', 'Post', 'Carousel', 'Short', 'Video', 'Article'];
interface Window { day: string; timeSlot: string; meanEngagementRate: number; sampleCount: number; timezone: string }

const minutes = (t: string) => { const m = /(\d+):?(\d+)?\s*(am|pm)?/i.exec(t); if (!m) return 0; let h = Number(m[1]) % 12; if (/pm/i.test(m[3] ?? '')) h += 12; return h * 60 + Number(m[2] ?? 0); };

export const ContentPlanner: React.FC = () => {
  const { connections } = useMedia();
  const [plans, setPlans] = useState<PlannedContent[]>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', day: 'Tuesday' as PlannedContent['day'], time: '6:00 PM', type: 'Reel', platform: 'instagram' as PlatformType });

  const livePlatforms = connections.filter((c) => c.connected).map((c) => c.platform);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([api.getPlanner(), api.getPlannerInsights().catch(() => null)])
      .then(([p, i]) => { setPlans(p); setWindows(i?.bestWindows ?? []); })
      .catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  const byDay = useMemo(() => Object.fromEntries(DAYS.map((d) => [d, plans.filter((p) => p.day === d).sort((a, b) => minutes(a.time) - minutes(b.time))])) as Record<string, PlannedContent[]>, [plans]);

  const openWith = (patch: Partial<typeof form> = {}) => { setForm((f) => ({ ...f, platform: livePlatforms[0] ?? f.platform, ...patch })); setOpen(true); setError(null); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError(null);
    try {
      const created = await api.addPlannerItem({ title: form.title.trim(), day: form.day, time: form.time, contentType: form.type, platform: form.platform, status: 'draft' });
      setPlans((p) => [...p, created]); setOpen(false); setForm((f) => ({ ...f, title: '' }));
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    const before = plans; setPlans((p) => p.filter((x) => x.id !== id));
    try { await api.deletePlannerItem(id); } catch (err) { setPlans(before); setError((err as Error).message); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[15px] text-body max-w-xl">Your week at a glance. Drop ideas onto the days you plan to publish.</p>
        <button onClick={() => openWith()} className="btn btn-primary self-start"><Plus className="w-4 h-4" />Add to plan</button>
      </div>

      {windows.length > 0 && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-brand-600" />Your best times</span>
          {windows.map((w) => (
            <button key={`${w.day}-${w.timeSlot}`} onClick={() => openWith({ day: w.day as PlannedContent['day'], time: w.timeSlot.split(' – ')[0] })} className="badge badge-brand hover:bg-brand-100 cursor-pointer !py-1" title={`${w.sampleCount} posts, ${w.meanEngagementRate}% average engagement (${w.timezone})`}>
              {w.day} · {w.timeSlot}
            </button>
          ))}
        </div>
      )}

      {error && !open && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</p>}

      {plans.length === 0 ? (
        <EmptyState type="no_data" title="Nothing planned yet" description="Add an idea to a day, or accept one of your recommendations." actionText="Add your first idea" onAction={() => openWith()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS.map((d) => (
            <section key={d} aria-label={d} className={`rounded-2xl border p-3 min-h-[8rem] ${byDay[d].length ? 'bg-white border-line' : 'bg-canvas-soft/40 border-dashed border-line-strong'}`}>
              <h3 className="text-sm font-bold text-ink flex items-center justify-between">{d.slice(0, 3)}<button onClick={() => openWith({ day: d })} className="p-1 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50" aria-label={`Add to ${d}`}><Plus className="w-4 h-4" /></button></h3>
              <ul className="mt-2 space-y-2">
                {byDay[d].map((p) => (
                  <li key={p.id} className="group rounded-xl border border-line bg-canvas p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="flex-1 text-sm font-semibold text-ink leading-snug break-words">{p.title}</span>
                      <button onClick={() => remove(p.id)} className="opacity-60 hover:opacity-100 text-muted hover:text-rose-600" aria-label={`Remove ${p.title}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"><Clock className="w-3 h-3" />{p.time}<span>· {platformName(p.platform)}</span><span>· {typeLabel(p.contentType)}</span></div>
                    {p.isRecommended && <div className="mt-1.5"><Badge tone="brand">Recommended</Badge></div>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/45 backdrop-blur-[2px] p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={create} role="dialog" aria-modal="true" aria-label="Add to plan" className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-pop p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Add to plan</h2><button type="button" onClick={() => setOpen(false)} className="p-2 -mr-2 rounded-xl text-muted hover:bg-canvas-soft" aria-label="Close"><X className="w-5 h-5" /></button></div>
            <div><label className="text-sm font-semibold block mb-1.5" htmlFor="pl-title">Idea</label><input id="pl-title" autoFocus required maxLength={300} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Behind the scenes of a shoot" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-semibold block mb-1.5" htmlFor="pl-day">Day</label><select id="pl-day" className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as PlannedContent['day'] })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1.5" htmlFor="pl-time">Time</label><input id="pl-time" required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="6:00 PM" /></div>
              <div><label className="text-sm font-semibold block mb-1.5" htmlFor="pl-platform">Platform</label><select id="pl-platform" className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as PlatformType })}>{(['instagram', 'youtube', 'facebook', 'linkedin'] as PlatformType[]).map((p) => <option key={p} value={p}>{platformName(p)}</option>)}</select></div>
              <div><label className="text-sm font-semibold block mb-1.5" htmlFor="pl-type">Format</label><select id="pl-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{FORMATS.map((f) => <option key={f}>{f}</option>)}</select></div>
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={saving || !form.title.trim()} className="btn btn-primary w-full btn-lg">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Add to plan</button>
          </form>
        </div>
      )}
    </div>
  );
};
