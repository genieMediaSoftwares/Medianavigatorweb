import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ArrowDownUp } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { NormalizedMedia } from '../../types';
import { ContentDetailModal } from '../../components/modals/ContentDetailModal';
import { PostAIDiagnosisModal, DiagnosisTab } from '../../components/modals/PostAIDiagnosisModal';
import { EmptyState } from '../../components/common/EmptyState';
import { PostCard } from '../../components/ui/PostCard';
import { PageSkeleton, Segmented, compact, platformName, typeLabel } from '../../components/ui';

type Sort = 'views' | 'likes' | 'comments' | 'engagement' | 'date';
const PAGE = 24;

const SORTS: Record<Sort, (a: NormalizedMedia, b: NormalizedMedia) => number> = {
  views: (a, b) => b.views - a.views || (b.likes + b.comments) - (a.likes + a.comments),
  likes: (a, b) => b.likes - a.likes || b.views - a.views,
  comments: (a, b) => b.comments - a.comments || b.views - a.views,
  engagement: (a, b) => b.engagementRate - a.engagementRate || b.views - a.views,
  date: (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
};

export const ContentIntelligence: React.FC = () => {
  const { selectedPlatform, setSelectedPlatform, connections, setCurrentTab } = useMedia();
  const [media, setMedia] = useState<NormalizedMedia[]>([]);
  const [selected, setSelected] = useState<NormalizedMedia | null>(null);
  const [diagnose, setDiagnose] = useState<{ media: NormalizedMedia; tab: DiagnosisTab; status?: 'working' | 'underperforming' | 'average' } | null>(null);
  const [tags, setTags] = useState<{ top: Set<string>; low: Set<string> }>({ top: new Set(), low: new Set() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('date');
  const [type, setType] = useState<string>('all');
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      api.getMedia(selectedPlatform),
      api.getSummary({ days: 365, platform: selectedPlatform === 'all' ? undefined : selectedPlatform }).catch(() => null),
    ])
      .then(([m, s]) => {
        setMedia(m);
        setTags({ top: new Set((s?.topContent ?? []).map((p: { id: string }) => p.id)), low: new Set((s?.needsImprovement ?? []).map((p: { id: string }) => p.id)) });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedPlatform]);

  useEffect(() => { load(); }, [load, connections]);
  useEffect(() => { setShown(PAGE); }, [query, sort, type, selectedPlatform]);
  useEffect(() => {
    window.addEventListener('media-synced', load);
    return () => window.removeEventListener('media-synced', load);
  }, [load]);

  const hasConnected = connections.some((c) => c.connected);
  const types = useMemo(() => ['all', ...Array.from(new Set(media.map((m) => m.contentType)))], [media]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media
      .filter((m) => (type === 'all' || m.contentType === type) && (!q || m.title.toLowerCase().includes(q) || (m.caption ?? '').toLowerCase().includes(q)))
      .sort(SORTS[sort]);
  }, [media, query, sort, type]);

  const platformOptions = [{ value: 'all', label: 'All' }, ...connections.filter((c) => c.connected).map((c) => ({ value: c.platform as string, label: platformName(c.platform) }))];

  if (loading && media.length === 0) return <PageSkeleton />;
  if (error) return <EmptyState type="no_data" title="We couldn’t load your posts" description={error} actionText="Try again" onAction={load} />;
  if (media.length === 0) {
    return (
      <EmptyState
        type={hasConnected ? 'no_data' : 'no_connection'}
        title={hasConnected ? (selectedPlatform !== 'all' ? `No ${platformName(selectedPlatform)} posts yet` : 'No posts yet') : 'Connect an account to see your posts'}
        description={hasConnected ? 'Make sure the posts are published and that the connection has permission to read them, then sync again.' : 'Your library fills in after your first sync.'}
        actionText={hasConnected ? 'Manage connections' : 'Connect an account'} onAction={() => setCurrentTab('connections')}
      />
    );
  }

  return (
    <div id="content-intelligence-page" className="space-y-6">
      <div className="card p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input !pl-10 !h-10" placeholder="Search titles and captions" aria-label="Search posts" />
        </div>
        {platformOptions.length > 2 && <Segmented ariaLabel="Platform" value={selectedPlatform as string} onChange={(v) => setSelectedPlatform(v as never)} options={platformOptions} />}
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="input !h-10 !w-auto !pr-8 capitalize" aria-label="Format">
            {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All formats' : typeLabel(t)}</option>)}
          </select>
          <label className="relative flex items-center">
            <ArrowDownUp className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input !h-10 !w-auto !pl-9 !pr-8" aria-label="Sort by">
              <option value="date">Newest</option><option value="views">Most views</option><option value="engagement">Highest engagement</option><option value="likes">Most likes</option><option value="comments">Most comments</option>
            </select>
          </label>
        </div>
      </div>

      <p className="text-sm text-muted px-1">
        {items.length === media.length ? <>{media.length} posts</> : <>{items.length} of {media.length} posts</>} · {compact(items.reduce((a, m) => a + m.views, 0))} total views
      </p>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-body">No posts match “{query}”.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.slice(0, shown).map((m) => (
              <PostCard
                key={m.id} item={m}
                tag={tags.top.has(m.id) ? 'top' : tags.low.has(m.id) ? 'low' : undefined}
                onDetails={() => setSelected(m)}
                onAnalyze={() => setDiagnose({ media: m, tab: tags.low.has(m.id) ? 'not_working' : 'working', status: tags.top.has(m.id) ? 'working' : tags.low.has(m.id) ? 'underperforming' : undefined })}
              />
            ))}
          </div>
          {shown < items.length && (
            <div className="text-center pt-2"><button onClick={() => setShown((n) => n + PAGE)} className="btn btn-secondary">Show {Math.min(PAGE, items.length - shown)} more</button></div>
          )}
        </>
      )}

      <ContentDetailModal media={selected} onClose={() => setSelected(null)} />
      <PostAIDiagnosisModal media={diagnose?.media ?? null} forcedStatus={diagnose?.status} initialTab={diagnose?.tab} onClose={() => setDiagnose(null)} />
    </div>
  );
};
