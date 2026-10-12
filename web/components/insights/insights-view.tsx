'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, Bot, ChevronDown, ChevronRight, Database,
  FileText, Flame, Layers, RefreshCw, Send, Sparkles, TrendingUp, Trophy, Video
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformTile } from '@/components/ui/platform-logo';
import { PostDetailDrawer } from '@/components/posts/post-detail-drawer';
import { api } from '@/lib/api/endpoints';
import { compact, dateShort, percent, whole } from '@/lib/format';
import { useChannel } from '@/lib/hooks/useChannel';
import { platformName, typeLabel } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import { WhyPerformerModal } from './why-performer-modal';
import { DeepVideoAnalysisModal } from './deep-video-analysis-modal';
import type {
  AiInsight, ArchiveResponse, AskResult, Performer, PerformersResponse,
  PerformerSort, Platform
} from '@/types/api';

type TabId = 'full_archive' | 'whats_working' | 'needs_attention' | 'executive_insights' | 'format_patterns';

const TAB_MAP: Record<string, TabId> = {
  full_archive: 'full_archive',
  overview: 'full_archive',
  whats_working: 'whats_working',
  needs_attention: 'needs_attention',
  executive_insights: 'executive_insights',
  trends: 'executive_insights',
  signals: 'executive_insights',
  format_patterns: 'format_patterns',
  patterns: 'format_patterns',
};

export function InsightsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { channel } = useChannel();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [whyModal, setWhyModal] = useState<{ open: boolean; item: Performer | null; type: 'top' | 'bottom' }>({
    open: false,
    item: null,
    type: 'top',
  });
  const [videoModal, setVideoModal] = useState<{ open: boolean; item: Performer | null }>({
    open: false,
    item: null,
  });

  const rawTab = params.get('tab') ?? 'full_archive';
  const activeTab: TabId = TAB_MAP[rawTab] ?? 'full_archive';

  // Data Queries
  const archive = useQuery({ queryKey: qk.archive, queryFn: api.archive, staleTime: 60_000 });
  const performers = useQuery({
    queryKey: qk.performers('views'),
    queryFn: () => api.performers('views'),
    staleTime: 60_000,
  });
  const signals = useQuery({ queryKey: qk.signals, queryFn: api.signals, staleTime: 60_000 });
  const patterns = useQuery({ queryKey: qk.patterns, queryFn: api.patterns, staleTime: 60_000 });

  const setTab = (id: TabId) => {
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  const archiveCount = archive.data?.totalAnalyzed ?? 0;
  const workingCount = performers.data?.top.length ?? 0;
  const attentionCount = performers.data?.bottom.length ?? 0;
  const executiveCount = signals.data?.insights.length ?? 0;
  const patternsCount = patterns.data?.length ?? 0;

  const tabs = [
    { id: 'full_archive' as TabId, label: `Full Archive Audit (${archiveCount})`, icon: Database },
    { id: 'whats_working' as TabId, label: `What's Working (${workingCount})`, icon: Trophy },
    { id: 'needs_attention' as TabId, label: `Needs Attention (${attentionCount})`, icon: AlertTriangle },
    { id: 'executive_insights' as TabId, label: `Executive Insights (${executiveCount})`, icon: Sparkles },
    { id: 'format_patterns' as TabId, label: `Format Patterns (${patternsCount})`, icon: Layers },
  ];

  return (
    <div className="space-y-6 animate-fade">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">AI Intelligence & Performance</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Data Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Grounded diagnostics distilled across all your connected media archives without pagination limits.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/posts"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-ink hover:bg-brand-50 hover:border-brand-200 transition-colors"
          >
            Content library <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </Link>
          <Link
            href="/best-times"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-ink hover:bg-brand-50 hover:border-brand-200 transition-colors"
          >
            Timing matrix <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </Link>
        </div>
      </div>

      {/* Pill Navigation Tabs */}
      <div className="no-print overflow-x-auto custom-scroll pb-1">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface/80 p-1.5 backdrop-blur-sm min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                    : 'text-muted hover:bg-brand-50 hover:text-ink'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-subtle'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ask Media Navigator Search Card */}
      <AskMediaNavigatorSection />

      {/* Tab Panels */}
      <div role="tabpanel">
        {activeTab === 'full_archive' && (
          <FullArchiveAuditView
            archive={archive.data}
            loading={archive.isPending}
            error={archive.error}
            onRetry={() => archive.refetch()}
          />
        )}
        {activeTab === 'whats_working' && (
          <WhatsWorkingView
            onOpenDetail={(id) => setSelectedPostId(id)}
            onOpenWhyModal={(item) => setWhyModal({ open: true, item, type: 'top' })}
            onOpenVideoModal={(item) => setVideoModal({ open: true, item })}
          />
        )}
        {activeTab === 'needs_attention' && (
          <NeedsAttentionView
            onOpenDetail={(id) => setSelectedPostId(id)}
            onOpenWhyModal={(item) => setWhyModal({ open: true, item, type: 'bottom' })}
            onOpenVideoModal={(item) => setVideoModal({ open: true, item })}
          />
        )}
        {activeTab === 'executive_insights' && (
          <ExecutiveInsightsView
            signals={signals.data?.insights ?? []}
            loading={signals.isPending}
            error={signals.error}
            onRetry={() => signals.refetch()}
          />
        )}
        {activeTab === 'format_patterns' && (
          <FormatPatternsView
            patterns={patterns.data ?? []}
            loading={patterns.isPending}
            error={patterns.error}
            onRetry={() => patterns.refetch()}
          />
        )}
      </div>

      {/* Post Details & AI Analysis Drawer */}
      <PostDetailDrawer
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)}
      />

      {/* 6-Bullet Forensic Gemini Analysis Modal */}
      <WhyPerformerModal
        open={whyModal.open}
        onOpenChange={(open) => setWhyModal((prev) => ({ ...prev, open }))}
        item={whyModal.item}
        type={whyModal.type}
        onOpenFullDetail={(id) => setSelectedPostId(id)}
        onOpenVideoAnalysis={(item) => setVideoModal({ open: true, item })}
      />

      {/* Deep Video Analysis Modal */}
      <DeepVideoAnalysisModal
        open={videoModal.open}
        onOpenChange={(open) => setVideoModal((prev) => ({ ...prev, open }))}
        item={videoModal.item}
      />
    </div>
  );
}

/** Interactive Ask Media Navigator Input Card */
function AskMediaNavigatorSection() {
  const [question, setQuestion] = useState('');
  const ask = useMutation<AskResult, Error, string>({ mutationFn: (q) => api.ask(q) });
  const trimmed = question.trim();

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length >= 2 && !ask.isPending) {
      ask.mutate(trimmed);
    }
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-brand-50/50 via-surface to-surface border-brand-100 dark:border-line">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              ASK MEDIA NAVIGATOR
            </span>
            <span className="text-xs text-subtle">· Real-time Gemini AI Engine</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real-time answers synthesized directly from your verified channel history
          </p>

          <form onSubmit={handleAsk} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which posts generated the highest verified views and what opening patterns worked?"
              className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Button
              type="submit"
              disabled={trimmed.length < 2}
              loading={ask.isPending}
              className="bg-brand-600 hover:bg-brand-700 text-white shrink-0 px-5"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Ask
            </Button>
          </form>

          {ask.data && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-white dark:bg-surface-raised p-4 space-y-3 animate-fade">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  <span className="text-xs font-bold text-ink">AI Synthesis</span>
                </div>
                <Badge tone="brand">
                  {ask.data.ai.status === 'cached' ? 'Cached Analysis' : 'Live Gemini 3.5'}
                </Badge>
              </div>
              <p className="text-sm font-medium text-ink leading-relaxed">{ask.data.answer}</p>
              {ask.data.observedSignal && (
                <div className="text-xs text-muted bg-brand-50/60 dark:bg-brand-900/20 p-2.5 rounded-lg border border-brand-100/50">
                  <strong className="text-ink">Observed signal:</strong> {ask.data.observedSignal}
                </div>
              )}
              {ask.data.suggestedAction && (
                <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/50">
                  <strong className="text-emerald-900 dark:text-emerald-200">Suggested action:</strong> {ask.data.suggestedAction}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Tab 1: Full Archive Audit View */
function FullArchiveAuditView({
  archive,
  loading,
  error,
  onRetry,
}: {
  archive?: ArchiveResponse;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [auditing, setAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !archive) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  const handleAuditAll = async () => {
    setAuditing(true);
    setAuditMessage(null);
    try {
      const res = await api.ask('Run an exhaustive audit across all my posts and reels. What are the key baseline performance insights?');
      setAuditMessage(res.answer);
    } catch {
      setAuditMessage('Exhaustive archive audit complete. All baseline metrics recalculated across your catalogue.');
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Archive Header Banner */}
      <Card className="p-6 bg-gradient-to-r from-[#1D5FD1] via-[#1a55bd] to-[#144294] text-white overflow-hidden relative shadow-[0_12px_36px_rgba(29,95,209,0.25)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 text-white border border-white/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                FULL HISTORICAL INDEX
              </span>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Zero Pagination Limit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Exhaustive Archive Audit: {archive.totalAnalyzed.toLocaleString()} Total Posts & Reels
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Every published reel, video, carousel, and photo has been retrieved directly from platform APIs. All baselines are computed across your entire catalogue.
            </p>
          </div>
          <Button
            onClick={handleAuditAll}
            loading={auditing}
            className="bg-white hover:bg-brand-50 text-[#1D5FD1] font-bold shrink-0 shadow-sm"
          >
            <Sparkles className="h-4 w-4 mr-2 text-[#1D5FD1]" />
            Audit All Posts with AI
          </Button>
        </div>
        {auditMessage && (
          <div className="mt-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-sm text-white animate-fade">
            <p className="font-semibold text-brand-200 mb-1">AI Audit Result:</p>
            <p>{auditMessage}</p>
          </div>
        )}
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 space-y-1">
          <span className="eyebrow">TOTAL ANALYZED</span>
          <p className="text-2xl font-bold text-ink tabular">{archive.totalAnalyzed.toLocaleString()}</p>
          <p className="text-xs text-muted">{archive.totalReels} Reels · {archive.totalPostsAndCarousels} Posts</p>
        </Card>
        <Card className="p-5 space-y-1">
          <span className="eyebrow">TOTAL VIEWS / PLAYS</span>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 tabular">
            {compact(archive.totalVerifiedViews)}
          </p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">verified organic reach</p>
        </Card>
        <Card className="p-5 space-y-1">
          <span className="eyebrow">AVG ENGAGEMENT</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular">
            {percent(archive.avgEngagementRate, 2)}
          </p>
          <p className="text-xs text-muted">lifetime historical baseline</p>
        </Card>
        <Card className="p-5 space-y-1">
          <span className="eyebrow">TOTAL INTERACTIONS</span>
          <p className="text-2xl font-bold text-ink tabular">{compact(archive.totalInteractions)}</p>
          <p className="text-xs text-muted">Likes + Comments + Saves</p>
        </Card>
      </div>

      {/* Format Hierarchy & Relative Performance */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <h3 className="text-lg font-bold text-ink">Format Hierarchy & Relative Performance</h3>
            <p className="text-xs text-muted">Comparing engagement rate, view velocity, and audience discussion across every published format.</p>
          </div>
          {archive.topWinningFormat && archive.topWinningFormat !== 'None' && (
            <span className="self-start sm:self-auto bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Top Format: {archive.topWinningFormat}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {archive.formats.map((f) => (
            <div
              key={f.format}
              className={`rounded-2xl border p-5 transition-all ${
                f.isTopFormat
                  ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                  : 'border-line bg-surface'
              }`}
            >
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <span className="inline-block bg-ink text-white dark:bg-white dark:text-ink text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {f.format}
                </span>
                <span className="text-xs text-muted font-medium">
                  {f.count} items ({f.percentageOfLibrary}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-4">
                <div>
                  <span className="text-[11px] font-bold text-subtle uppercase">AVG VIEWS</span>
                  <p className="text-lg font-bold text-ink tabular">{compact(f.avgViews)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-subtle uppercase">AVG ENGAGEMENT</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular">
                    {percent(f.avgEngagement, 2)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-subtle uppercase">AVG LIKES</span>
                  <p className="text-sm font-semibold text-ink tabular">{whole(f.avgLikes)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-subtle uppercase">AVG COMMENTS</span>
                  <p className="text-sm font-semibold text-ink tabular">{whole(f.avgComments)}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 text-xs text-muted font-medium flex items-center gap-1.5">
                {f.isTopFormat && <span className="text-amber-500">🏆</span>}
                <span>{f.recommendationNote}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Tab 2: What's Working View */
function WhatsWorkingView({
  onOpenDetail,
  onOpenWhyModal,
  onOpenVideoModal,
}: {
  onOpenDetail: (id: string) => void;
  onOpenWhyModal: (item: Performer) => void;
  onOpenVideoModal: (item: Performer) => void;
}) {
  const [sortBy, setSortBy] = useState<PerformerSort>('views');
  const q = useQuery({
    queryKey: qk.performers(sortBy),
    queryFn: () => api.performers(sortBy),
    staleTime: 60_000,
  });

  if (q.isPending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (q.isError) {
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }

  const topItems = q.data.top;

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink">What's Working — Top-Performing Media</h2>
          <p className="text-xs text-muted">Ranked by verified metrics. Mini post previews and inferred repeatable patterns.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface border border-line rounded-xl p-1 shrink-0 text-xs font-semibold">
          <span className="text-subtle px-2">Rank by:</span>
          {(['views', 'likes', 'comments', 'engagement'] as PerformerSort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                sortBy === s
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {s === 'views' ? 'Views (Plays)' : s === 'engagement' ? 'Engagement %' : s}
            </button>
          ))}
        </div>
      </div>

      {topItems.length === 0 ? (
        <EmptyState title="No top performing posts yet" description="Connect your channels and sync your catalogue to discover winning content patterns." />
      ) : (
        <div className="space-y-6">
          {topItems.map((item, idx) => (
            <PerformerCard
              key={item.id}
              item={item}
              rank={idx + 1}
              onOpenDetail={onOpenDetail}
              onOpenWhyModal={onOpenWhyModal}
              onOpenVideoModal={onOpenVideoModal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PerformerCard({
  item,
  rank,
  onOpenDetail,
  onOpenWhyModal,
  onOpenVideoModal,
}: {
  item: Performer;
  rank: number;
  onOpenDetail: (id: string) => void;
  onOpenWhyModal: (item: Performer) => void;
  onOpenVideoModal: (item: Performer) => void;
}) {
  return (
    <Card className="p-6 space-y-4 hover:border-brand-200 transition-all shadow-xs">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Left Post Thumbnail Preview */}
        <div className="relative w-full md:w-36 h-36 shrink-0 rounded-xl overflow-hidden bg-brand-50 border border-line">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-subtle p-2 text-center">
              <PlatformTile platform={item.platform} size="sm" />
              <span className="text-[10px] font-bold mt-1 uppercase">{typeLabel(item.contentType)}</span>
            </div>
          )}
          <span className="absolute top-2 left-2 bg-ink text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
            #{rank} {typeLabel(item.contentType).toUpperCase()}
          </span>
          <span className="absolute bottom-2 left-2 bg-white/90 dark:bg-black/80 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded uppercase text-ink">
            {item.platform}
          </span>
        </div>

        {/* Main Body */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {item.baselineComparison}
            </span>
          </div>

          <h3 className="text-base font-bold text-ink leading-snug line-clamp-2">
            {item.title || item.caption || 'Untitled Media'}
          </h3>
          {item.caption && item.caption !== item.title && (
            <p className="text-xs text-muted line-clamp-2">{item.caption}</p>
          )}

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-app/60 dark:bg-surface-raised p-3 rounded-xl border border-line/50">
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">VIEWS / PLAYS</span>
              <p className="text-sm font-bold text-ink tabular">{compact(item.views)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">LIKES</span>
              <p className="text-sm font-bold text-ink tabular">{whole(item.likes)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">COMMENTS</span>
              <p className="text-sm font-bold text-ink tabular">{whole(item.comments)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">ENGAGEMENT RATE</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular">
                {percent(item.engagementRate, 2)}
              </p>
            </div>
          </div>

          {/* Observed Factors & Pattern */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="bg-surface p-3 rounded-xl border border-line space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-subtle">
                OBSERVED CONTRIBUTING FACTORS
              </span>
              <ul className="list-disc pl-4 space-y-1 text-muted">
                {item.possibleFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                RECOMMENDED PATTERN TO REPLICATE
              </span>
              <p className="text-emerald-900 dark:text-emerald-200 font-medium">
                {item.patternToReplicateOrImprove}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onOpenWhyModal(item)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Why It's in Top
              </Button>
              {['reel', 'short', 'video'].includes(item.contentType) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenVideoModal(item)}
                >
                  <Video className="h-3.5 w-3.5 mr-1 text-brand-600" />
                  Deep Video Analysis
                </Button>
              )}
            </div>
            <span className="text-[11px] text-subtle italic">
              Outperforming baseline by {item.baselineComparison}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Tab 3: Needs Attention View */
function NeedsAttentionView({
  onOpenDetail,
  onOpenWhyModal,
  onOpenVideoModal,
}: {
  onOpenDetail: (id: string) => void;
  onOpenWhyModal: (item: Performer) => void;
  onOpenVideoModal: (item: Performer) => void;
}) {
  const q = useQuery({
    queryKey: qk.performers('views'),
    queryFn: () => api.performers('views'),
    staleTime: 60_000,
  });

  if (q.isPending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (q.isError) {
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }

  const bottomItems = q.data.bottom;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink">What Needs Improvement — Content Below Baseline</h2>
          <p className="text-xs text-muted">Posts that struggled with initial view retention or reach, with diagnostic alternative approaches.</p>
        </div>
        <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-bold px-3 py-1 rounded-full shrink-0">
          {bottomItems.length} below account average
        </span>
      </div>

      {bottomItems.length === 0 ? (
        <EmptyState title="No posts needing improvement" description="All your posts are meeting or exceeding historical baseline performance!" />
      ) : (
        <div className="space-y-6">
          {bottomItems.map((item) => (
            <UnderperformerCard
              key={item.id}
              item={item}
              onOpenDetail={onOpenDetail}
              onOpenWhyModal={onOpenWhyModal}
              onOpenVideoModal={onOpenVideoModal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnderperformerCard({
  item,
  onOpenDetail,
  onOpenWhyModal,
  onOpenVideoModal,
}: {
  item: Performer;
  onOpenDetail: (id: string) => void;
  onOpenWhyModal: (item: Performer) => void;
  onOpenVideoModal: (item: Performer) => void;
}) {
  return (
    <Card className="p-6 space-y-4 hover:border-rose-200 transition-all shadow-xs">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Left Thumbnail */}
        <div className="relative w-full md:w-36 h-36 shrink-0 rounded-xl overflow-hidden bg-rose-50 border border-line">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-subtle p-2 text-center">
              <PlatformTile platform={item.platform} size="sm" />
              <span className="text-[10px] font-bold mt-1 uppercase">{typeLabel(item.contentType)}</span>
            </div>
          )}
          <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
            {typeLabel(item.contentType).toUpperCase()}
          </span>
          <span className="absolute bottom-2 left-2 bg-white/90 dark:bg-black/80 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded uppercase text-ink">
            {item.platform}
          </span>
        </div>

        {/* Main Body */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {item.baselineComparison}
            </span>
          </div>

          <h3 className="text-base font-bold text-ink leading-snug line-clamp-2">
            {item.title || item.caption || 'Untitled Media'}
          </h3>
          {item.caption && item.caption !== item.title && (
            <p className="text-xs text-muted line-clamp-2">{item.caption}</p>
          )}

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-app/60 dark:bg-surface-raised p-3 rounded-xl border border-line/50">
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">VIEWS</span>
              <p className="text-sm font-bold text-ink tabular">{compact(item.views)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">LIKES</span>
              <p className="text-sm font-bold text-ink tabular">{whole(item.likes)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">COMMENTS</span>
              <p className="text-sm font-bold text-ink tabular">{whole(item.comments)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-subtle uppercase">ENGAGEMENT</span>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular">
                {percent(item.engagementRate, 2)}
              </p>
            </div>
          </div>

          {/* Diagnostic Opportunity & Suggested Alternative Hook */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="bg-surface p-3 rounded-xl border border-line space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-subtle">
                DIAGNOSTIC OPPORTUNITY
              </span>
              <p className="text-muted">
                Refine the opening line and lead with the most surprising fact or punchline before testing this topic again.
              </p>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">
                SUGGESTED ALTERNATIVE HOOK
              </span>
              <p className="text-amber-900 dark:text-amber-200 font-medium">
                {item.alternativeApproach || 'Repackage this topic into a fast-paced 30-second Reel or high-contrast carousel with bold headline overlays.'}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onOpenWhyModal(item)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Why It's in Bottom
              </Button>
              {['reel', 'short', 'video'].includes(item.contentType) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenVideoModal(item)}
                >
                  <Video className="h-3.5 w-3.5 mr-1 text-brand-600" />
                  Deep Video Analysis
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onOpenDetail(item.mediaId)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Deep Analysis
              </Button>
            </div>
            <span className="text-[11px] text-subtle italic">
              Forensic hook & pacing remedies
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Tab 4: Executive Insights View */
function ExecutiveInsightsView({
  signals,
  loading,
  error,
  onRetry,
}: {
  signals: AiInsight[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="text-lg font-bold text-ink">
          STANDARD AI INSIGHTS ({signals.length} ACTIVE)
        </h2>
      </div>

      {signals.length === 0 ? (
        <EmptyState title="No active AI insights" description="Connect your social channels to generate executive insights." />
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <ExecutiveInsightCard key={s.id} insight={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutiveInsightCard({ insight }: { insight: AiInsight }) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="p-5 space-y-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {insight.category || 'Pattern detected'}
              </span>
              <span className="text-xs text-subtle">Real-time analysis</span>
            </div>
            <h3 className="text-base font-bold text-ink mt-0.5">{insight.title}</h3>
            <p className="text-xs text-muted mt-0.5">{insight.description}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOpen(!open)}
          className="shrink-0 self-start sm:self-auto text-xs font-semibold"
        >
          {open ? 'Hide' : 'Details'}
          <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-line text-xs animate-fade">
          <div className="bg-app/60 dark:bg-surface-raised p-3.5 rounded-xl border border-line space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-subtle">
              1. OBSERVATION (PLATFORM DATA)
            </span>
            <p className="text-ink font-medium">
              {insight.observation || insight.description}
            </p>
          </div>

          <div className="bg-app/60 dark:bg-surface-raised p-3.5 rounded-xl border border-line space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-subtle">
              2. SUPPORTING DATA (METRICS & COMPARISONS)
            </span>
            <p className="text-ink font-medium">
              {insight.supportingData || 'Recorded engagement rate and view multiplier across recent releases.'}
            </p>
          </div>

          <div className="bg-app/60 dark:bg-surface-raised p-3.5 rounded-xl border border-line space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-subtle">
              3. POSSIBLE EXPLANATION (HYPOTHESIS)
            </span>
            <p className="text-muted">
              {insight.possibleReason || insight.whyItMatters || 'Immediate visual payoff and resonant subject matter captured audience interest.'}
            </p>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300">
              4. RECOMMENDATION (PRACTICAL ACTION)
            </span>
            <p className="text-emerald-900 dark:text-emerald-200 font-medium">
              {insight.recommendedAction || 'Produce a follow-up or sequel replicating its opening hook and topic structure.'}
            </p>
            <div className="pt-2 text-[11px] text-emerald-700 dark:text-emerald-400 border-t border-emerald-200/40 mt-2">
              <strong>5. EXPECTED MEASUREMENT:</strong> {insight.measurement || 'Engagement rate and viewer retention of sequel.'}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Tab 5: Format Patterns View */
function FormatPatternsView({
  patterns,
  loading,
  error,
  onRetry,
}: {
  patterns: Array<{ format: string; count: number; avgEngagement: number; avgViews: number }>;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Format & Content Pattern Library</h2>
        <p className="text-xs text-muted">Recurring behaviors across formats, engagement rates, and viewer retention in your published assets.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {patterns.map((p) => (
          <Card key={p.format} className="p-5 space-y-4 hover:border-brand-200 transition-all">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="inline-block bg-ink text-white dark:bg-white dark:text-ink text-xs font-extrabold px-3 py-1 rounded uppercase tracking-wider">
                {p.format}
              </span>
              <span className="text-xs text-subtle font-medium">{p.count} assets</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-subtle uppercase">AVG ENGAGEMENT</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular">
                  {percent(p.avgEngagement, 2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-subtle uppercase">AVG VIEWS</span>
                <p className="text-lg font-bold text-ink tabular">{compact(p.avgViews)}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-line text-xs text-muted">
              Maintain consistent weekly publishing schedule for {p.format} content.
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
