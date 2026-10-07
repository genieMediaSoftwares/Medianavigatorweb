import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, Columns3 } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { NormalizedMedia } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { BarList, ColumnChart, PageSkeleton, Section, compact } from '../../components/ui';

type FormatRow = { platform: string; contentType: string; count: number; medianEngagementRate: number; meanEngagementRate: number; medianViews: number };

const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Median engagement per week for the last 12 weeks. */
function weekly(media: NormalizedMedia[]) {
  const weeks = 12; const now = Date.now(); const WEEK = 7 * 86_400_000;
  return Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * WEEK; const start = end - WEEK;
    const inWeek = media.filter((m) => { const t = new Date(m.publishedAt).getTime(); return t > start && t <= end; });
    return { label: new Date(end).toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: median(inWeek.map((m) => m.engagementRate)) };
  });
}

export const Analytics: React.FC = () => {
  const { selectedPlatform, setCurrentTab, connections } = useMedia();
  const [media, setMedia] = useState<NormalizedMedia[]>([]);
  const [formats, setFormats] = useState<FormatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([api.getMedia(selectedPlatform), api.getSummary({ days: 365, platform: selectedPlatform === 'all' ? undefined : selectedPlatform })])
      .then(([m, s]) => { setMedia(m); setFormats(s.contentTypePerformance as FormatRow[]); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedPlatform, connections]);

  const hasConnected = connections.some((c) => c.connected);
  const series = useMemo(() => weekly(media), [media]);
  const maxCount = Math.max(1, ...formats.map((f) => f.count));
  const totalInteractions = media.reduce((a, m) => a + m.likes + m.comments, 0);

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load analytics" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  if (media.length === 0) {
    return (
      <EmptyState
        type={hasConnected ? 'no_data' : 'no_connection'}
        title={hasConnected ? 'No posts to analyze yet' : 'Connect an account to see analytics'}
        description={hasConnected ? 'Once your first sync finishes, your formats and weekly trends will show up here.' : 'Link Instagram, YouTube, Facebook or LinkedIn and we’ll break down which formats earn the most engagement.'}
        actionText="Go to connections" onAction={() => setCurrentTab('connections')}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="card p-6 lg:col-span-3">
          <h3 className="text-lg font-bold tracking-tight">Engagement by week</h3>
          <p className="text-sm text-muted mt-0.5 mb-6">Median engagement rate of the posts published each week.</p>
          <ColumnChart points={series} unit="%" />
        </section>
        <section className="card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Your library</h3>
            <p className="text-sm text-muted mt-0.5">Across {selectedPlatform === 'all' ? 'all connected channels' : selectedPlatform}.</p>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            {[['Posts', media.length.toLocaleString()], ['Views', compact(media.reduce((a, m) => a + m.views, 0))], ['Likes + comments', compact(totalInteractions)], ['Typical engagement', `${median(media.map((m) => m.engagementRate)).toFixed(1)}%`]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-canvas p-4"><dt className="text-sm text-muted">{k}</dt><dd className="mt-1 font-display text-3xl tabular">{v}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <Section title="Which formats work best" description="Ranked by median engagement, so one viral post can’t distort the picture.">
        <div className="card p-6">
          <BarList
            rows={formats.map((f) => ({
              key: `${f.platform}-${f.contentType}`,
              label: <span className="capitalize">{f.contentType}{selectedPlatform === 'all' && <span className="text-muted font-medium"> · {f.platform}</span>}</span>,
              value: f.medianEngagementRate,
              valueLabel: `${f.medianEngagementRate.toFixed(1)}%`,
              sub: <span>{f.count} {f.count === 1 ? 'post' : 'posts'} · {Math.round((f.count / media.length) * 100)}% of library · typical views {compact(f.medianViews)} · average engagement {f.meanEngagementRate.toFixed(1)}%</span>,
            }))}
          />
          {formats.some((f) => f.count < 3) && <p className="mt-5 text-sm text-muted">Formats with fewer than 3 posts are shown but carry less weight.</p>}
          <p className="sr-only">{maxCount}</p>
        </div>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setCurrentTab('timing')} className="card card-interactive p-5 flex items-center gap-4 text-left">
          <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Clock className="w-5 h-5" /></span>
          <span className="flex-1"><span className="block font-bold">When to post</span><span className="block text-sm text-muted">See your strongest days and hours</span></span>
          <ArrowRight className="w-5 h-5 text-muted" />
        </button>
        <button onClick={() => setCurrentTab('crossplatform')} className="card card-interactive p-5 flex items-center gap-4 text-left">
          <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Columns3 className="w-5 h-5" /></span>
          <span className="flex-1"><span className="block font-bold">Compare platforms</span><span className="block text-sm text-muted">How each channel performs side by side</span></span>
          <ArrowRight className="w-5 h-5 text-muted" />
        </button>
      </div>
    </div>
  );
};
