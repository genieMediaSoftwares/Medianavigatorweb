import React, { useEffect, useState } from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Minus, Quote } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { TrendItem } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge, PageSkeleton, Segmented, platformName, typeLabel } from '../../components/ui';

const CATEGORIES = [{ value: 'all', label: 'All' }, { value: 'Topics', label: 'Topics' }, { value: 'Formats', label: 'Formats' }, { value: 'Audience behaviour', label: 'Audience' }];

const STATUS = {
  Rising: { tone: 'success' as const, Icon: TrendingUp },
  Stable: { tone: 'neutral' as const, Icon: Minus },
  'Losing momentum': { tone: 'warning' as const, Icon: TrendingDown },
};

export const Trends: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    setLoading(true); setError(null);
    api.getTrends().then((d) => setTrends(d.trends)).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load trends" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  if (trends.length === 0) return <EmptyState type={connections.some((c) => c.connected) ? 'no_data' : 'no_connection'} title="Trends need a few weeks of posts" description="We compare your recent posts with earlier ones to see what is rising or fading." actionText="Go to connections" onAction={() => setCurrentTab('connections')} />;

  const shown = cat === 'all' ? trends : trends.filter((t) => t.category === cat);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[15px] text-body max-w-xl">What is changing in your own results. These come from your posts, not from outside market data.</p>
        <Segmented ariaLabel="Category" value={cat} onChange={setCat} options={CATEGORIES} />
      </div>

      {shown.length === 0 ? <div className="card p-10 text-center text-body">No trends in this category yet.</div> : (
        <ul className="space-y-5">
          {shown.map((t) => {
            const s = STATUS[t.status] ?? STATUS.Stable;
            return (
              <li key={t.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={s.tone}><s.Icon className="w-3.5 h-3.5" />{t.status}{t.changeRate && t.changeRate !== '0.0%' ? ` · ${t.changeRate}` : ''}</Badge>
                      {t.recommendedPlatform && <Badge tone="neutral">{platformName(t.recommendedPlatform)}</Badge>}
                      {t.suggestedFormat && <Badge tone="neutral">{typeLabel(t.suggestedFormat)}</Badge>}
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">{t.name}</h3>
                    <p className="mt-1.5 text-[15px] text-body leading-relaxed">{t.explanation}</p>
                  </div>
                  <button onClick={() => setCurrentTab('planner')} className="btn btn-secondary btn-sm shrink-0">Plan a post<ArrowRight className="w-4 h-4" /></button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {t.contentConcept && <div className="rounded-xl bg-canvas p-4"><div className="eyebrow mb-1">Idea</div><p className="text-sm text-ink leading-relaxed">{t.contentConcept}</p></div>}
                  {t.recommendedNextAction && <div className="rounded-xl bg-brand-50 border border-brand-100 p-4"><div className="eyebrow !text-brand-700 mb-1">Next step</div><p className="text-sm text-ink leading-relaxed">{t.recommendedNextAction}</p></div>}
                </div>
                {t.suggestedHook && <p className="mt-4 text-sm text-body flex gap-2"><Quote className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" /><span className="italic font-display text-lg leading-snug">{t.suggestedHook.replace(/^"|"$/g, '')}</span></p>}
                {t.reasonForRelevance && <p className="mt-3 text-xs text-muted">{t.reasonForRelevance}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
