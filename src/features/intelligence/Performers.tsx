import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { NormalizedMedia, PerformerAnalysis } from '../../types';
import { PostAIDiagnosisModal } from '../../components/modals/PostAIDiagnosisModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge, PageSkeleton, Segmented, Thumb, compact, platformName, typeLabel } from '../../components/ui';

type SortBy = 'views' | 'engagement' | 'likes' | 'comments';

/** The modal analyses by media id, so rebuild a minimal media object from the performer row. */
const toMedia = (p: PerformerAnalysis): NormalizedMedia => ({
  id: p.mediaId, workspaceId: '', platform: p.platform, platformContentId: p.mediaId, contentType: (p.contentType as NormalizedMedia['contentType']) || 'post',
  title: p.title, caption: p.caption ?? '', thumbnailUrl: p.thumbnailUrl ?? '', mediaUrl: p.mediaUrl, publishedAt: p.publishedAt,
  views: p.views, reach: p.reach, engagementRate: p.engagementRate, shares: p.shares, likes: p.likes, comments: p.comments,
  primarySignal: { label: 'Engagement', value: `${p.engagementRate}%`, status: 'Average' },
  explanation: { observedFact: p.baselineComparison, possibleReason: p.patternToReplicateOrImprove, whatToRepeat: p.possibleFactors },
});

export const Performers: React.FC<{ mode: 'top' | 'bottom' }> = ({ mode }) => {
  const { connections, setCurrentTab } = useMedia();
  const [sortBy, setSortBy] = useState<SortBy>('views');
  const [rows, setRows] = useState<PerformerAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnose, setDiagnose] = useState<NormalizedMedia | null>(null);
  const isTop = mode === 'top';
  const connected = connections.some((c) => c.connected);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.getPerformers(sortBy).then((r) => setRows(isTop ? r.top : r.bottom)).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [sortBy, isTop]);
  useEffect(() => { load(); }, [load, connections]);
  useEffect(() => { window.addEventListener('media-synced', load); return () => window.removeEventListener('media-synced', load); }, [load]);

  if (loading && rows.length === 0) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load this list" description={error} actionText="Try again" onAction={load} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[15px] text-body max-w-xl">
          {isTop ? 'Your strongest posts compared with your own average. Repeat what they have in common.' : 'Posts that landed below your usual results. A weak post usually says more about the opening or timing than the topic.'}
        </p>
        <Segmented ariaLabel="Rank by" value={sortBy} onChange={setSortBy} options={[{ value: 'views', label: 'Views' }, { value: 'engagement', label: 'Engagement' }, { value: 'likes', label: 'Likes' }, { value: 'comments', label: 'Comments' }]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState type={connected ? 'no_data' : 'no_connection'}
          title={connected ? (isTop ? 'No top posts yet' : 'Nothing needs attention yet') : 'Connect an account to see this list'}
          description={connected ? 'This list needs at least a handful of synced posts to compare against.' : undefined}
          actionText={connected ? 'Sync your accounts' : 'Go to connections'} onAction={() => setCurrentTab('connections')} />
      ) : (
        <ol className="space-y-4">
          {rows.map((p, idx) => (
            <li key={p.id} className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
              <div className="flex sm:flex-col items-center sm:items-start gap-3 shrink-0">
                <span className="font-display text-3xl text-subtle tabular w-8">{idx + 1}</span>
                <Thumb src={p.thumbnailUrl} platform={p.platform} type={p.contentType} title={p.title} className="w-28 sm:w-40 aspect-[16/10] rounded-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{platformName(p.platform)}</Badge><Badge tone="neutral">{typeLabel(p.contentType)}</Badge>
                  <Badge tone={isTop ? 'success' : 'warning'}>{p.baselineComparison}</Badge>
                </div>
                <h3 className="mt-2 font-bold text-ink leading-snug">{p.title}</h3>
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {([['Views', compact(p.views)], ['Likes', compact(p.likes)], ['Comments', compact(p.comments)], ['Engagement', `${p.engagementRate.toFixed(1)}%`]] as const).map(([k, v]) => (
                    <div key={k} className="flex gap-1.5"><dt className="text-muted">{k}</dt><dd className="font-bold tabular">{v}</dd></div>
                  ))}
                </dl>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="eyebrow mb-1.5">{isTop ? 'What may have helped' : 'What may have held it back'}</div>
                    <ul className="space-y-1.5 text-sm text-body list-disc pl-4 marker:text-subtle">{p.possibleFactors.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                  <div className="rounded-xl bg-brand-50 border border-brand-100 p-3.5 flex gap-2.5">
                    <Lightbulb className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-ink"><span className="font-semibold">{isTop ? 'Repeat this. ' : 'Try this. '}</span>{p.patternToReplicateOrImprove}{p.alternativeApproach && <span className="block mt-1.5 text-body">{p.alternativeApproach}</span>}</div>
                  </div>
                </div>
                {p.uncertaintyNote && <p className="mt-3 text-xs text-muted">{p.uncertaintyNote}</p>}
                <button onClick={() => setDiagnose(toMedia(p))} className="btn btn-secondary btn-sm mt-4"><Sparkles className="w-4 h-4 text-brand-600" />Full breakdown</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <PostAIDiagnosisModal media={diagnose} forcedStatus={isTop ? 'working' : 'underperforming'} initialTab={isTop ? 'working' : 'not_working'} onClose={() => setDiagnose(null)} />
    </div>
  );
};
