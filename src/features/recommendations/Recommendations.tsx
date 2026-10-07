import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, Loader2, CalendarPlus } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { Recommendation } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge, PageSkeleton, typeLabel } from '../../components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const KIND: Record<string, { label: string; tone: 'success' | 'brand' | 'warning'; blurb: string }> = {
  CREATE: { label: 'Make more of this', tone: 'success', blurb: 'Build on a post that clearly worked.' },
  REPURPOSE: { label: 'Reuse it', tone: 'warning', blurb: 'Give a strong idea a second life.' },
  TEST: { label: 'Run an experiment', tone: 'brand', blurb: 'Try a change and measure the result.' },
};

export const Recommendations: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planned, setPlanned] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [slotFor, setSlotFor] = useState<string | null>(null);
  const [day, setDay] = useState('Tuesday');
  const [time, setTime] = useState('6:00 PM');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.getRecommendations().then((d) => setItems(d.items)).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  const plan = async (rec: Recommendation, slot?: { day: string; time: string }) => {
    setBusy(rec.id); setActionError(null);
    try { await api.planRecommendation(rec.id, slot); setPlanned((p) => ({ ...p, [rec.id]: true })); setSlotFor(null); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load recommendations" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  if (items.length === 0) return <EmptyState type={connections.some((c) => c.connected) ? 'no_data' : 'no_connection'} title="Recommendations appear after your first sync" description="We base every suggestion on how your own posts performed." actionText="Go to connections" onAction={() => setCurrentTab('connections')} />;

  return (
    <div className="space-y-5 max-w-4xl">
      <p className="text-[15px] text-body max-w-2xl">Each suggestion points to a post of yours that did well and says what to do about it. Add the ones you like to your planner.</p>
      {actionError && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{actionError}</p>}

      <ol className="space-y-5">
        {items.map((rec, i) => {
          const kind = KIND[rec.type] ?? KIND.TEST;
          const done = planned[rec.id] || rec.status === 'planned';
          return (
            <li key={rec.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <Badge tone={kind.tone}>{kind.label}</Badge>
                {rec.suggestedSlot && <Badge tone="neutral"><Clock className="w-3.5 h-3.5" />{rec.suggestedSlot.day}, {rec.suggestedSlot.time} · {typeLabel(rec.suggestedSlot.format)}</Badge>}
              </div>
              <h3 className="mt-3 font-display text-2xl font-medium tracking-tight leading-snug">{rec.title}</h3>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <div><div className="eyebrow mb-1">Why</div><p className="text-body leading-relaxed">{rec.identifiedProblem || rec.reason}</p><p className="mt-1.5 text-muted">{rec.supportingPattern || rec.supportingSignal}</p></div>
                <div><div className="eyebrow mb-1">What to do</div><p className="text-body leading-relaxed">{rec.recommendedImprovement || rec.title}</p>{rec.suggestedImplementation && <p className="mt-1.5 text-muted">{rec.suggestedImplementation}</p>}</div>
                <div><div className="eyebrow mb-1">How you’ll know</div><p className="text-body leading-relaxed">{rec.expectedMeasurement || 'Compare its engagement with your usual results after a few days.'}</p></div>
              </div>

              <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center gap-3">
                {done ? (
                  <><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="w-4 h-4" />Added to your planner</span><button onClick={() => setCurrentTab('planner')} className="btn btn-secondary btn-sm">Open planner<ArrowRight className="w-4 h-4" /></button></>
                ) : rec.suggestedSlot || slotFor === rec.id ? (
                  <>
                    {slotFor === rec.id && (
                      <>
                        <select value={day} onChange={(e) => setDay(e.target.value)} className="input !h-9 !w-auto" aria-label="Day">{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
                        <input value={time} onChange={(e) => setTime(e.target.value)} className="input !h-9 !w-28" aria-label="Time" placeholder="6:00 PM" />
                      </>
                    )}
                    <button onClick={() => plan(rec, slotFor === rec.id ? { day, time } : undefined)} disabled={busy === rec.id || (slotFor === rec.id && !time.trim())} className="btn btn-primary btn-sm">{busy === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}Add to planner</button>
                  </>
                ) : (
                  <button onClick={() => setSlotFor(rec.id)} className="btn btn-primary btn-sm"><CalendarPlus className="w-4 h-4" />Choose a time</button>
                )}
                {!rec.suggestedSlot && !done && <span className="text-sm text-muted">Not enough posting history to suggest a time yet.</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
