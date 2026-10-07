import React, { useEffect, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api, TimingData } from '../../services/api';
import { TimingSlot } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge, PageSkeleton } from '../../components/ui';

const DAYS: TimingSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PARTS: { id: TimingSlot['timeOfDay']; hours: string }[] = [
  { id: 'Morning', hours: '6 am – 12 pm' }, { id: 'Afternoon', hours: '12 – 5 pm' }, { id: 'Evening', hours: '5 – 10 pm' }, { id: 'Night', hours: '10 pm – 6 am' },
];

const cell = (score: number, samples: number) => {
  if (samples === 0) return 'bg-canvas text-subtle border border-dashed border-line-strong';
  if (score >= 90) return 'bg-brand-600 text-white font-bold shadow-brand';
  if (score >= 75) return 'bg-brand-300 text-ink font-semibold';
  if (score >= 55) return 'bg-brand-100 text-ink font-medium';
  return 'bg-canvas-soft text-body';
};

export const TimingIntelligence: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [data, setData] = useState<TimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ day: string; part: string; score: number; n: number } | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.getTiming().then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  if (loading && !data) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load posting times" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  const ready = data?.hasData && data.strongestWindow && data.matrix.length > 0;
  if (!ready) {
    return <EmptyState type={connections.some((c) => c.connected) ? 'no_data' : 'no_connection'} title="We need a few more posts" description={data?.message || 'Best-time analysis starts once you have at least 3 posts. Keep publishing and syncing.'} actionText="Go to connections" onAction={() => setCurrentTab('connections')} />;
  }

  const grid = new Map(data!.matrix.map((m) => [`${m.day}-${m.timeOfDay}`, m]));
  const w = data!.strongestWindow!;

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <Badge tone={w.confidence === 'High' ? 'success' : 'warning'}>{w.confidence === 'High' ? 'Solid evidence' : 'Early signal'}</Badge>
            <div className="eyebrow mt-4">Your strongest window</div>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">{w.label}</h2>
            <p className="mt-1 text-lg text-body">{w.timeSlot}</p>
            <p className="mt-3 text-sm text-muted max-w-xl">{w.supportingText}</p>
          </div>
          <button onClick={() => setCurrentTab('planner')} className="btn btn-primary btn-lg shrink-0">Plan a post<ArrowRight className="w-5 h-5" /></button>
        </div>
      </section>

      <section className="card p-5 md:p-6" aria-label="Engagement by day and time">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div><h3 className="text-lg font-bold tracking-tight">Engagement by day and time</h3><p className="text-sm text-muted mt-0.5">Darker means stronger average engagement. Times are in {data!.timezone ?? 'UTC'}.</p></div>
          <div className="flex items-center gap-2 text-sm text-muted">Lower<span className="flex gap-1">{['bg-canvas-soft', 'bg-brand-100', 'bg-brand-300', 'bg-brand-600'].map((c) => <span key={c} className={`w-5 h-5 rounded ${c}`} />)}</span>Higher</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1.5" role="grid">
            <thead><tr><th className="w-24" />{DAYS.map((d) => <th key={d} scope="col" className="text-sm font-semibold text-muted pb-1">{d}</th>)}</tr></thead>
            <tbody>
              {PARTS.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="text-left pr-2"><span className="block text-sm font-semibold text-ink">{p.id}</span><span className="block text-xs text-muted">{p.hours}</span></th>
                  {DAYS.map((d) => {
                    const m = grid.get(`${d}-${p.id}`);
                    const score = m?.score ?? 0; const n = m?.sampleCount ?? 0;
                    return (
                      <td key={d} className="p-0">
                        <button type="button" onMouseEnter={() => setHover({ day: d, part: p.id, score, n })} onFocus={() => setHover({ day: d, part: p.id, score, n })} onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}
                          aria-label={`${d} ${p.id}: ${n === 0 ? 'no posts' : `score ${score}, ${n} posts`}`}
                          className={`w-full h-14 rounded-xl text-sm transition-transform hover:scale-[1.04] ${cell(score, n)}`}>{n === 0 ? '–' : score}</button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm min-h-5 text-body" aria-live="polite">
          {hover ? (hover.n === 0 ? `${hover.day} ${hover.part.toLowerCase()}: you haven’t posted in this slot yet.` : `${hover.day} ${hover.part.toLowerCase()}: score ${hover.score} out of 100, based on ${hover.n} ${hover.n === 1 ? 'post' : 'posts'}.`) : 'Hover or focus a cell for details.'}
        </p>
      </section>

      <div className="card-flat bg-canvas-soft/60 p-4 text-sm text-body flex gap-3"><Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" /><p>These are patterns in your own past posts, not a guarantee. Slots with only one or two posts are weak evidence, so test a window a few times before committing.</p></div>
    </div>
  );
};
