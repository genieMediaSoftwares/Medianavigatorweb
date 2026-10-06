import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowRight, 
  RotateCw,
  Sparkles,
  PlaySquare,
  Layers,
  Video,
  FileText,
  Search,
  SlidersHorizontal,
  Eye,
  Heart,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Film
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { NormalizedMedia } from '../types';
import { ContentDetailModal } from '../components/modals/ContentDetailModal';
import { PostAIDiagnosisModal, DiagnosisTab } from '../components/modals/PostAIDiagnosisModal';
import { EmptyState } from '../components/common/EmptyState';

type SortCriteria = 'views' | 'likes' | 'comments' | 'engagement' | 'date';

export const ContentIntelligence: React.FC = () => {
  const { selectedPlatform, setSelectedPlatform, connections, setCurrentTab } = useMedia();
  const [mediaList, setMediaList] = useState<NormalizedMedia[]>([]);
  const [selectedItem, setSelectedItem] = useState<NormalizedMedia | null>(null);
  const [aiDiagnoseMedia, setAiDiagnoseMedia] = useState<NormalizedMedia | null>(null);
  const [aiDiagnoseStatus, setAiDiagnoseStatus] = useState<'working' | 'underperforming' | 'average' | undefined>(undefined);
  const [aiDiagnoseTab, setAiDiagnoseTab] = useState<DiagnosisTab>('working');
  const [performerIds, setPerformerIds] = useState<{ topIds: Set<string>; bottomIds: Set<string> }>({
    topIds: new Set(),
    bottomIds: new Set()
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortCriteria>('views');

  const loadMediaData = useCallback(() => {
    setLoading(true);
    api.getMedia(selectedPlatform)
      .then((data) => {
        setMediaList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load media:', err);
        setLoading(false);
      });

    api.getPerformers()
      .then((res) => {
        if (res) {
          setPerformerIds({
            topIds: new Set((res.top || []).map(p => p.id)),
            bottomIds: new Set((res.bottom || []).map(p => p.id))
          });
        }
      })
      .catch(() => {});
  }, [selectedPlatform]);

  useEffect(() => {
    loadMediaData();
  }, [loadMediaData, connections]);

  useEffect(() => {
    const handleSync = () => {
      loadMediaData();
    };
    window.addEventListener('media-synced', handleSync);
    return () => window.removeEventListener('media-synced', handleSync);
  }, [loadMediaData]);

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  const filteredAndSortedMedia = useMemo(() => {
    let items = [...mediaList];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.caption && m.caption.toLowerCase().includes(q))
      );
    }

    // Sorting
    items.sort((a, b) => {
      if (sortBy === 'views') {
        return (b.views - a.views) || ((b.likes + b.comments) - (a.likes + a.comments));
      }
      if (sortBy === 'likes') {
        return (b.likes - a.likes) || (b.views - a.views);
      }
      if (sortBy === 'comments') {
        return (b.comments - a.comments) || (b.views - a.views);
      }
      if (sortBy === 'engagement') {
        return (b.engagementRate - a.engagementRate) || (b.views - a.views);
      }
      if (sortBy === 'date') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return 0;
    });

    return items;
  }, [mediaList, searchQuery, sortBy]);

  const totalArchiveViews = useMemo(() => {
    return mediaList.reduce((acc, curr) => acc + (curr.views || 0), 0);
  }, [mediaList]);

  const avgViews = useMemo(() => {
    return mediaList.length > 0 ? totalArchiveViews / mediaList.length : 0;
  }, [mediaList, totalArchiveViews]);

  const handleOpenDiagnosis = (
    item: NormalizedMedia,
    status?: 'working' | 'underperforming' | 'average',
    tab?: DiagnosisTab
  ) => {
    setAiDiagnoseMedia(item);
    setAiDiagnoseStatus(status);
    setAiDiagnoseTab(tab || (status === 'underperforming' ? 'not_working' : 'working'));
  };

  const activeConn = connections.find((c) => selectedPlatform === 'all' ? (c.connected && c.dataPointsCount > 0) : c.platform === selectedPlatform);
  const activeAccountHandle = activeConn?.connected && activeConn.accountHandle && activeConn.accountHandle !== 'Not connected' ? activeConn.accountHandle : null;

  return (
    <div id="content-intelligence-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
              Content Library
            </h1>
            <span className="text-xs font-semibold text-[#0284C7] bg-[#0284C7]/10 px-2 py-0.5 rounded-md border border-[#0284C7]/20">
              {mediaList.length} verified assets
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Exhaustive archive retrieval from connected APIs. Every post with verified views, likes, and audience metrics.
          </p>
        </div>

        {/* Platform Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedPlatform('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              selectedPlatform === 'all'
                ? 'bg-[#0B132B] text-white shadow-xs'
                : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50'
            }`}
          >
            All Channels
          </button>
          {connections.map((c) => (
            <button
              key={c.platform}
              type="button"
              onClick={() => setSelectedPlatform(c.platform)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedPlatform === c.platform
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50'
              }`}
            >
              <span>{c.name}</span>
              {c.connected && c.accountHandle && c.accountHandle !== 'Not connected' && (
                <span className="text-[10px] opacity-75">({c.accountHandle})</span>
              )}
              {c.connected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by caption, topic or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0B132B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0284C7]" />
            <span className="font-semibold">Rank by:</span>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setSortBy('views')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                sortBy === 'views'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B132B]'
              }`}
            >
              Views
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                sortBy === 'likes'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B132B]'
              }`}
            >
              Likes
            </button>
            <button
              onClick={() => setSortBy('comments')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                sortBy === 'comments'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B132B]'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setSortBy('engagement')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                sortBy === 'engagement'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B132B]'
              }`}
            >
              Engagement
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                sortBy === 'date'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B132B]'
              }`}
            >
              Date
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Loading full post archive from connected channels...
        </div>
      ) : filteredAndSortedMedia.length === 0 ? (
        <EmptyState
          type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
          title={
            hasConnectedPlatforms
              ? searchQuery
                ? `No posts matched "${searchQuery}".`
                : selectedPlatform !== 'all'
                ? `No published assets found on ${selectedPlatform.toUpperCase()}.`
                : 'Your connected accounts have no published assets available.'
              : 'Connect your accounts to view real media performance.'
          }
          description={
            hasConnectedPlatforms
              ? 'Verify that content is publicly published and that your token has read access to your posts.'
              : 'Media Navigator evaluates your complete post archive. Connect Instagram, Facebook, YouTube, or LinkedIn to inspect audience signals.'
          }
          actionText={hasConnectedPlatforms ? 'Manage Connections' : 'Connect Platforms'}
          onAction={() => setCurrentTab('connections')}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#64748B] px-1">
            <span>
              Showing <strong>{filteredAndSortedMedia.length}</strong> posts {activeAccountHandle ? <>from <strong>{activeAccountHandle}</strong></> : null} · Total aggregate views:{' '}
              <strong className="text-[#0B132B]">{totalArchiveViews.toLocaleString()}</strong>
            </span>
            <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct platform API retrieval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredAndSortedMedia.map((item) => {
              const isTop = performerIds.topIds.has(item.id) || (avgViews > 0 && item.views >= avgViews * 1.25);
              const isBottom = !isTop && (performerIds.bottomIds.has(item.id) || (avgViews > 0 && item.views < avgViews * 0.75));
              const isVideo = item.contentType === 'reel' || item.contentType === 'video' || item.contentType === 'short';

              return (
                <div
                  key={item.id}
                  id={`content-card-${item.id}`}
                  className="rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs overflow-hidden flex flex-col justify-between hover:border-[#0284C7]/50 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Mini Image Thumbnail of Post */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to high-resolution placeholder if CDN signature expires
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <div className="px-2 py-0.5 rounded-md bg-[#0B132B]/80 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                          {item.contentType}
                        </div>
                        {isTop && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs flex items-center gap-1">
                            <TrendingUp className="w-2.5 h-2.5" /> Top
                          </span>
                        )}
                        {isBottom && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Improve
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-[#0B132B] uppercase tracking-wider shadow-xs backdrop-blur-xs">
                        {item.platform}
                      </div>

                      {/* Primary verified views callout */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-[#0B132B]/85 text-white flex items-center justify-between text-[11px] backdrop-blur-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Eye className="w-3.5 h-3.5 text-[#06B6D4]" />
                          <span>{item.views > 0 ? `${item.views.toLocaleString()} views` : `${item.likes} likes`}</span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-mono">
                          {item.engagementRate}% eng
                        </span>
                      </div>
                    </div>

                    {/* Content Info */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-sm font-bold text-[#0B132B] line-clamp-2 leading-snug group-hover:text-[#0284C7] transition-colors">
                        {item.title}
                      </h3>

                      {item.caption && (
                        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                          {item.caption}
                        </p>
                      )}

                      {/* 4 Key Verified Counts */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs">
                        <div>
                          <div className="text-[9px] text-[#64748B] font-semibold uppercase">Views</div>
                          <div className="font-bold text-[#0B132B] font-mono text-xs">
                            {item.views > 0 ? (item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views) : '0'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#64748B] font-semibold uppercase">Likes</div>
                          <div className="font-bold text-[#0B132B] font-mono text-xs">
                            {item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#64748B] font-semibold uppercase">Comments</div>
                          <div className="font-bold text-[#0B132B] font-mono text-xs">
                            {item.comments}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#64748B] font-semibold uppercase">Eng</div>
                          <div className="font-bold text-[#0284C7] font-mono text-xs">
                            {item.engagementRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Under Cell */}
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {isTop ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          id={`why-in-top-${item.id}`}
                          onClick={() => handleOpenDiagnosis(item, 'working', 'working')}
                          className="flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="Why It's in Top: 5-8 short bullet points highlighting what clicked"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Why It's in Top</span>
                        </button>

                        <button
                          id={`deep-analysis-top-${item.id}`}
                          onClick={() => handleOpenDiagnosis(item, 'working', 'video')}
                          className="flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold text-[#0B132B] bg-slate-100 hover:bg-slate-200 border border-[#CBD5E1] transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="Deep Analysis: Second-by-second retention curve & hook breakdown"
                        >
                          <Film className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>{isVideo ? 'Deep Video Analysis' : 'Deep Analysis'}</span>
                        </button>
                      </div>
                    ) : isBottom ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          id={`what-to-improve-${item.id}`}
                          onClick={() => handleOpenDiagnosis(item, 'underperforming', 'not_working')}
                          className="flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="What to Improve: 5-8 short bullet points highlighting friction & fixes"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-100" />
                          <span>What to Improve</span>
                        </button>

                        <button
                          id={`deep-analysis-bottom-${item.id}`}
                          onClick={() => handleOpenDiagnosis(item, 'underperforming', 'video')}
                          className="flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold text-[#0B132B] bg-slate-100 hover:bg-slate-200 border border-[#CBD5E1] transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                          title="Deep Analysis: Second-by-second retention curve & hook remedies"
                        >
                          <Film className="w-3.5 h-3.5 text-rose-600" />
                          <span>{isVideo ? 'Deep Video Analysis' : 'Deep Analysis'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`post-analysis-${item.id}`}
                        onClick={() => handleOpenDiagnosis(item, 'average', 'working')}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0284C7] via-[#0ea5e9] to-[#06B6D4] hover:from-[#0369a1] hover:to-[#0891b2] transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs group/btn cursor-pointer"
                        title="Post Analysis: Complete algorithmic audit"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-100 group-hover/btn:rotate-12 transition-transform" />
                        <span>Post Analysis</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        id={`view-insight-${item.id}`}
                        onClick={() => setSelectedItem(item)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 border border-[#E2E8F0] transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Metrics &amp; Details</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {item.mediaUrl && (
                        <a
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50 transition-colors"
                          title="View on platform"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ContentDetailModal
        media={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Deep AI Post Diagnosis Modal */}
      <PostAIDiagnosisModal
        media={aiDiagnoseMedia}
        forcedStatus={aiDiagnoseStatus}
        initialTab={aiDiagnoseTab}
        onClose={() => setAiDiagnoseMedia(null)}
      />
    </div>
  );
};
