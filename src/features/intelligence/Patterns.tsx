import React, { useEffect, useState } from 'react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { PageSkeleton, Section, compact, typeLabel } from '../../components/ui';

interface Pattern { format: string; count: number; avgEngagement: number; avgViews: number }
interface Archive { hasData: boolean; captionAnalysis?: { questionHook: { countWithQuestion: number; avgEngagementWithQuestion: number; countWithoutQuestion: number; avgEngagementWithoutQuestion: number; delta: number }; captionLength: { shortCount: number; shortAvgEngagement: number; longCount: number; longAvgEngagement: number } } }

export const Patterns: React.FC = () => {
  const { connections, setCurrentTab } = useMedia();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const connected = connections.some((c) => c.connected);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([api.getContentPatterns(), api.getArchiveAudit()])
      .then(([p, a]) => { setPatterns(p as Pattern[]); setArchive(a as Archive); })
      .catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load patterns" description={error} actionText="Try again" onAction={() => window.location.reload()} />;
  if (patterns.length === 0) return <EmptyState type={connected ? 'no_data' : 'no_connection'} title="Patterns need more posts" description="Once several posts are synced, we compare formats and caption habits here." actionText="Go to connections" onAction={() => setCurrentTab('connections')} />;

  const best = patterns[0];
  const q = archive?.captionAnalysis?.questionHook;
  const l = archive?.captionAnalysis?.captionLength;

  return (
    <div className="space-y-8 max-w-5xl">
      <Section title="Formats" description="Average results by format (means). The Analytics page ranks them by median, which resists outliers.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map((p) => {
            const lift = best.avgEngagement > 0 ? ((p.avgEngagement - best.avgEngagement) / best.avgEngagement) * 100 : 0;
            return (
              <article key={p.format} className="card p-5">
                <div className="flex items-center justify-between"><h4 className="font-bold capitalize">{typeLabel(p.format)}</h4><span className="text-sm text-muted">{p.count} {p.count === 1 ? 'post' : 'posts'}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div><div className="text-sm text-muted">Engagement</div><div className="font-display text-3xl tabular text-brand-700">{p.avgEngagement.toFixed(1)}%</div></div>
                  <div><div className="text-sm text-muted">Views per post</div><div className="font-display text-3xl tabular">{compact(p.avgViews)}</div></div>
                </div>
                <p className="mt-4 pt-4 border-t border-line text-sm text-body">
                  {p === best ? 'Your best-performing format on average.' : `${Math.abs(lift).toFixed(0)}% ${lift < 0 ? 'below' : 'above'} your best format.`}{p.count < 3 ? ' Few posts, so treat this as a hint.' : ''}
                </p>
              </article>
            );
          })}
        </div>
      </Section>

      {q && l && (q.countWithQuestion > 0 || l.shortCount + l.longCount > 0) && (
        <Section title="Caption habits" description="Simple comparisons from your own posts. Correlation, not proof.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="card p-5">
              <h4 className="font-bold">Asking a question</h4>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div><div className="text-sm text-muted">With “?” ({q.countWithQuestion})</div><div className="font-display text-3xl tabular">{q.avgEngagementWithQuestion.toFixed(1)}%</div></div>
                <div><div className="text-sm text-muted">Without ({q.countWithoutQuestion})</div><div className="font-display text-3xl tabular">{q.avgEngagementWithoutQuestion.toFixed(1)}%</div></div>
              </div>
              <p className="mt-4 text-sm text-body">{q.countWithQuestion === 0 || q.countWithoutQuestion === 0 ? 'Needs posts both with and without a question to compare.' : q.delta > 0 ? `Posts with a question averaged ${q.delta.toFixed(1)} points more engagement.` : `Posts with a question averaged ${Math.abs(q.delta).toFixed(1)} points less engagement.`}</p>
            </article>
            <article className="card p-5">
              <h4 className="font-bold">Caption length</h4>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div><div className="text-sm text-muted">Short, under 120 chars ({l.shortCount})</div><div className="font-display text-3xl tabular">{l.shortAvgEngagement.toFixed(1)}%</div></div>
                <div><div className="text-sm text-muted">Long ({l.longCount})</div><div className="font-display text-3xl tabular">{l.longAvgEngagement.toFixed(1)}%</div></div>
              </div>
              <p className="mt-4 text-sm text-body">{l.shortCount === 0 || l.longCount === 0 ? 'Needs both short and long captions to compare.' : l.shortAvgEngagement >= l.longAvgEngagement ? 'Shorter captions did a little better on average.' : 'Longer captions did a little better on average.'}</p>
            </article>
          </div>
        </Section>
      )}
    </div>
  );
};
