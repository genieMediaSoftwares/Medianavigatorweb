import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  TrendingUp, 
  Lightbulb, 
  ChevronRight, 
  Sparkles, 
  Send, 
  Bot, 
  RotateCw, 
  Trophy, 
  AlertTriangle, 
  Layers, 
  HelpCircle, 
  ExternalLink, 
  Target, 
  BarChart3, 
  Bookmark, 
  Database,
  Eye,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { AIInsight, PerformerAnalysis, NormalizedMedia } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { PostAIDiagnosisModal } from '../components/modals/PostAIDiagnosisModal';

type SortPerformerBy = 'views' | 'likes' | 'comments' | 'engagement';

export const Intelligence: React.FC<{ defaultSubTab?: 'archive' | 'insights' | 'top' | 'bottom' | 'patterns' }> = ({ defaultSubTab }) => {
  const { setCurrentTab, connections } = useMedia();
  const [activeSubTab, setActiveSubTab] = useState<'archive' | 'insights' | 'top' | 'bottom' | 'patterns'>(defaultSubTab || 'archive');
  const [diagnoseMedia, setDiagnoseMedia] = useState<NormalizedMedia | null>(null);

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [topPerformers, setTopPerformers] = useState<PerformerAnalysis[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<PerformerAnalysis[]>([]);
  const [performerSortBy, setPerformerSortBy] = useState<SortPerformerBy>('views');
  const [contentPatterns, setContentPatterns] = useState<any[]>([]);
  const [archiveAudit, setArchiveAudit] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPerformers, setLoadingPerformers] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    answer: string;
    observedSignal: string;
    suggestedAction: string;
    source: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getIntelligence().catch(() => ({ insights: [] })),
      api.getPerformers(performerSortBy).catch(() => ({ top: [], bottom: [] })),
      api.getContentPatterns().catch(() => []),
      api.getArchiveAudit().catch(() => null),
    ])
      .then(([intelRes, perfRes, patRes, archRes]) => {
        setInsights(intelRes.insights || []);
        if (intelRes.insights && intelRes.insights.length > 0) {
          setExpandedId(intelRes.insights[0].id);
        }
        setTopPerformers(perfRes.top || []);
        setBottomPerformers(perfRes.bottom || []);
        setContentPatterns(patRes || []);
        setArchiveAudit(archRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const handleSortChange = async (newSort: SortPerformerBy) => {
    setPerformerSortBy(newSort);
    setLoadingPerformers(true);
    try {
      const perfRes = await api.getPerformers(newSort);
      setTopPerformers(perfRes.top || []);
      setBottomPerformers(perfRes.bottom || []);
    } catch (e) {
      console.error('Failed to resort performers:', e);
    } finally {
      setLoadingPerformers(false);
    }
  };

  const handleDiagnosePerformer = (item: PerformerAnalysis) => {
    setDiagnoseMedia({
      id: item.id,
      workspaceId: 'default',
      platform: item.platform,
      platformContentId: item.id,
      contentType: (item.contentType as any) || 'post',
      title: item.title,
      caption: item.caption || '',
      thumbnailUrl: item.thumbnailUrl || '',
      mediaUrl: item.mediaUrl,
      publishedAt: item.publishedAt,
      views: item.views,
      reach: item.reach,
      engagementRate: item.engagementRate,
      shares: item.shares,
      likes: item.likes,
      comments: item.comments,
      primarySignal: {
        label: 'Performance',
        value: item.baselineComparison,
        status: 'Strong',
      },
      explanation: {
        observedFact: item.baselineComparison,
        possibleReason: item.patternToReplicateOrImprove,
        whatToRepeat: item.possibleFactors,
      },
    });
  };

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || asking) return;

    if (!hasConnectedPlatforms) {
      setQueryResult({
        answer: 'No active platform connection detected. Media Navigator cannot formulate insights or answers without verified platform data.',
        observedSignal: '0 active connections',
        suggestedAction: 'Connect Platform in Connections Tab',
        source: 'Security & Integrity Guardrail',
      });
      return;
    }

    setAsking(true);
    try {
      const res = await api.askAI(query);
      setQueryResult(res);
    } catch (err) {
      console.error('Ask AI error:', err);
    } finally {
      setAsking(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Pattern detected':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'Timing signal':
        return <Clock className="w-4 h-4 text-[#0284C7]" />;
      case 'Growth signal':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'Opportunity':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#0284C7]" />;
    }
  };

  return (
    <div id="intelligence-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
              AI Intelligence &amp; Performance
            </h1>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Verified Data Engine
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Grounded diagnostics distilled across all your connected media archives without pagination limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('content')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0B132B] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Content library →
          </button>
          <button
            onClick={() => setCurrentTab('timing')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0B132B] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Timing matrix →
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('archive')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            activeSubTab === 'archive'
              ? 'bg-[#0B132B] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Full Archive Audit ({archiveAudit?.totalAnalyzed || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            activeSubTab === 'top'
              ? 'bg-[#0B132B] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>What's Working ({topPerformers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bottom')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            activeSubTab === 'bottom'
              ? 'bg-[#0B132B] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Needs Attention ({bottomPerformers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('insights')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            activeSubTab === 'insights'
              ? 'bg-[#0B132B] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>Executive Insights ({insights.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('patterns')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            activeSubTab === 'patterns'
              ? 'bg-[#0B132B] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Format Patterns ({contentPatterns.length})</span>
        </button>
      </div>

      {/* Interactive "Ask Media Navigator" AI Query Bar */}
      <section className="p-4 md:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 border border-[#0284C7]/20 flex items-center justify-center text-[#0284C7]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0B132B] uppercase tracking-wider">
              Ask Media Navigator
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Real-time answers synthesized directly from your verified channel history
            </p>
          </div>
        </div>

        <form onSubmit={handleAskAI} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Which posts generated the highest verified views and what opening patterns worked?"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0B132B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7] transition-colors"
          />
          <button
            type="submit"
            disabled={asking || !query.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            {asking ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Ask</span>
          </button>
        </form>

        {queryResult && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 mt-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] border-b border-[#E2E8F0] pb-2">
              <span className="font-semibold text-[#0284C7] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Grounded in verified channel records
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">
                {queryResult.source}
              </span>
            </div>

            <p className="text-xs text-[#0B132B] leading-relaxed">
              {queryResult.answer}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-[11px]">
              <div className="text-[#64748B]">
                <strong className="text-[#0B132B]">Supporting data:</strong> {queryResult.observedSignal}
              </div>
              <div className="text-emerald-700 font-medium">
                <strong className="text-[#0B132B]">Recommended action:</strong> {queryResult.suggestedAction}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Evaluating cross-channel intelligence signals...
        </div>
      ) : (
        <>
          {/* TAB 0: ALL REELS & POSTS ARCHIVE AUDIT */}
          {activeSubTab === 'archive' && (
            <section className="space-y-5">
              {!archiveAudit || !archiveAudit.hasData ? (
                <EmptyState
                  type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
                  title={hasConnectedPlatforms ? 'Awaiting Published Posts and Reels' : 'Connect Platform to Analyze All Posts'}
                  description="Connect your Instagram, YouTube, or Facebook account. Media Navigator will fetch and analyze every single post and reel without pagination limits."
                  actionText="Manage Connections"
                  onAction={() => setCurrentTab('connections')}
                />
              ) : (
                <>
                  {/* Full Archive Overview Banner */}
                  <div className="p-5 md:p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0B132B] text-white flex items-center gap-1">
                            <Database className="w-3 h-3 text-cyan-400" />
                            Full Historical Index
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                            Zero Pagination Limit
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-[#0B132B] tracking-tight">
                          Exhaustive Archive Audit: {archiveAudit.totalAnalyzed} Total Posts &amp; Reels
                        </h2>
                        <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                          Every published reel, video, carousel, and photo has been retrieved directly from platform APIs. All baselines are computed across your entire catalogue.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setQuery('Provide an exhaustive diagnostic audit of all our published reels and posts. Detail exact format advantages, hook effectiveness, and a step-by-step roadmap to scale reach based on our full history.');
                          handleAskAI({ preventDefault: () => {} } as any);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-2 shrink-0 shadow-2xs"
                      >
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Audit All Posts with AI</span>
                      </button>
                    </div>

                    {/* 4 Core Aggregate KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          Total Analyzed
                        </div>
                        <div className="text-xl font-extrabold text-[#0B132B] font-mono">
                          {archiveAudit.totalAnalyzed}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {archiveAudit.totalReels} Reels · {archiveAudit.totalPostsAndCarousels} Posts
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          Total Views / Plays
                        </div>
                        <div className="text-xl font-extrabold text-[#0284C7] font-mono">
                          {archiveAudit.totalVerifiedViews.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Verified Organic Reach
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          Avg Engagement
                        </div>
                        <div className="text-xl font-extrabold text-emerald-700 font-mono">
                          {archiveAudit.avgEngagementRate}%
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Lifetime Historical Baseline
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          Total Interactions
                        </div>
                        <div className="text-xl font-extrabold text-[#0B132B] font-mono">
                          {archiveAudit.totalInteractions.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Likes + Comments + Saves
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Format Performance Hierarchy */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B132B]">
                          Format Hierarchy &amp; Relative Performance
                        </h3>
                        <p className="text-[11px] text-[#64748B]">
                          Comparing engagement rate, view velocity, and audience discussion across every published format.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                        Top Format: {archiveAudit.topWinningFormat?.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {archiveAudit.formats?.map((fmt: any, idx: number) => (
                        <div
                          key={fmt.format}
                          className={`p-4 rounded-2xl bg-white border shadow-2xs space-y-3 transition-all ${
                            idx === 0
                              ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                              : 'border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0B132B] text-white">
                              {fmt.format}
                            </span>
                            <span className="text-xs font-semibold text-[#64748B]">
                              {fmt.count} items ({fmt.percentageOfLibrary}%)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Views</div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {fmt.avgViews.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Engagement</div>
                              <div className="text-sm font-bold text-emerald-700 font-mono">
                                {fmt.avgEngagement}%
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Likes</div>
                              <div className="text-xs font-bold text-[#0B132B] font-mono">
                                {fmt.avgLikes}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Comments</div>
                              <div className="text-xs font-bold text-[#0B132B] font-mono">
                                {fmt.avgComments}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                            {idx === 0
                              ? '🏆 Highest organic distribution. Scale weekly volume in this format.'
                              : 'Secondary format. Experiment with sharper opening hooks.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* TAB 1: WHAT'S WORKING (TOP PERFORMERS RANKED BY VIEWS) */}
          {activeSubTab === 'top' && (
            <section className="space-y-4">
              {/* Header with Sort By Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
                <div>
                  <h2 className="text-sm font-bold text-[#0B132B]">
                    What's Working — Top-Performing Media
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Ranked by verified metrics. Mini post previews and inferred repeatable patterns.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[#64748B] text-xs font-semibold">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Rank by:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs">
                    <button
                      onClick={() => handleSortChange('views')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        performerSortBy === 'views'
                          ? 'bg-[#0284C7] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#0B132B]'
                      }`}
                    >
                      Views (Plays)
                    </button>
                    <button
                      onClick={() => handleSortChange('likes')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        performerSortBy === 'likes'
                          ? 'bg-[#0284C7] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#0B132B]'
                      }`}
                    >
                      Likes
                    </button>
                    <button
                      onClick={() => handleSortChange('comments')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        performerSortBy === 'comments'
                          ? 'bg-[#0284C7] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#0B132B]'
                      }`}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => handleSortChange('engagement')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        performerSortBy === 'engagement'
                          ? 'bg-[#0284C7] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#0B132B]'
                      }`}
                    >
                      Engagement %
                    </button>
                  </div>
                </div>
              </div>

              {loadingPerformers ? (
                <div className="flex items-center justify-center p-16 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
                  <RotateCw className="w-4 h-4 animate-spin text-[#0284C7] mr-2" />
                  Sorting performers by {performerSortBy}...
                </div>
              ) : topPerformers.length === 0 ? (
                <EmptyState
                  type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
                  title="No top performers detected yet"
                  description="Publish or sync more media assets to establish an audience baseline and identify top-ranking posts."
                  actionText="Manage Connections"
                  onAction={() => setCurrentTab('connections')}
                />
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 md:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs hover:border-[#0284C7]/40 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Mini image of the post itself */}
                        <div className="w-full sm:w-32 h-36 sm:h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#E2E8F0] relative">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#0B132B]/85 text-white text-[9px] font-bold uppercase tracking-wider">
                            #{idx + 1} {item.contentType}
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 text-[#0B132B] text-[9px] font-bold uppercase tracking-wider shadow-xs">
                            {item.platform}
                          </div>
                        </div>

                        {/* Details & Metrics */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {item.baselineComparison}
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-[#0B132B] leading-snug group-hover:text-[#0284C7] transition-colors">
                                {item.title}
                              </h3>

                              {item.caption && (
                                <p className="text-xs text-[#64748B] line-clamp-2">
                                  {item.caption}
                                </p>
                              )}
                            </div>

                            {item.mediaUrl && (
                              <a
                                href={item.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50 transition-colors shrink-0"
                                title="Open on platform"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* 4 Core Verified Metrics Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold flex items-center gap-1">
                                <Eye className="w-3 h-3 text-[#0284C7]" />
                                Views / Plays
                              </div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.views > 0 ? item.views.toLocaleString() : 'N/A'}
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">
                                Likes
                              </div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.likes.toLocaleString()}
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">
                                Comments
                              </div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.comments.toLocaleString()}
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">
                                Engagement Rate
                              </div>
                              <div className="text-sm font-bold text-emerald-700 font-mono">
                                {item.engagementRate}%
                              </div>
                            </div>
                          </div>

                          {/* Contributing Factors & Pattern to Replicate */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
                            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                                Observed Contributing Factors
                              </div>
                              <ul className="space-y-0.5 list-disc list-inside text-[#64748B] text-[11px]">
                                {item.possibleFactors.map((fac, i) => (
                                  <li key={i}>{fac}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Recommended Pattern to Replicate
                              </div>
                              <p className="text-xs text-[#0B132B] font-medium leading-relaxed">
                                {item.patternToReplicateOrImprove}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0]">
                            <button
                              id={`analyze-top-${item.id}`}
                              onClick={() => handleDiagnosePerformer(item)}
                              className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0284C7] to-[#06B6D4] hover:from-[#0369a1] hover:to-[#0891b2] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-sky-100" />
                              <span>Forensic AI Breakdown: Why It's Working</span>
                            </button>
                            <span className="text-[11px] text-[#64748B] font-medium">
                              Outperforming baseline by {item.baselineComparison}
                            </span>
                          </div>

                          {item.uncertaintyNote && (
                            <div className="text-[10px] text-[#94A3B8] italic pt-1 border-t border-[#E2E8F0]">
                              * {item.uncertaintyNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: NEEDS ATTENTION (BOTTOM PERFORMERS RANKED BY VIEWS) */}
          {activeSubTab === 'bottom' && (
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
                <div>
                  <h2 className="text-sm font-bold text-[#0B132B]">
                    What Needs Improvement — Content Below Baseline
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Posts that struggled with initial view retention or reach, with diagnostic alternative approaches.
                  </p>
                </div>
                <span className="text-xs font-semibold text-rose-700 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 self-start md:self-auto">
                  {bottomPerformers.length} below account average
                </span>
              </div>

              {bottomPerformers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] text-center space-y-2">
                  <div className="text-sm font-bold text-[#0B132B]">No underperforming content detected</div>
                  <p className="text-xs text-[#64748B]">
                    Your synchronized assets all perform near or above your channel distribution baseline.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bottomPerformers.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 md:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs hover:border-rose-300 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Mini image of the post itself */}
                        <div className="w-full sm:w-32 h-36 sm:h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#E2E8F0] relative">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#0B132B]/85 text-white text-[9px] font-bold uppercase tracking-wider">
                            {item.contentType}
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 text-[#0B132B] text-[9px] font-bold uppercase tracking-wider shadow-xs">
                            {item.platform}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {item.baselineComparison}
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-[#0B132B] leading-snug">
                                {item.title}
                              </h3>

                              {item.caption && (
                                <p className="text-xs text-[#64748B] line-clamp-2">
                                  {item.caption}
                                </p>
                              )}
                            </div>

                            {item.mediaUrl && (
                              <a
                                href={item.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50 transition-colors shrink-0"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* 4 Core Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Views</div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.views > 0 ? item.views.toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Likes</div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.likes}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Comments</div>
                              <div className="text-sm font-bold text-[#0B132B] font-mono">
                                {item.comments}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Engagement</div>
                              <div className="text-sm font-bold text-rose-600 font-mono">
                                {item.engagementRate}%
                              </div>
                            </div>
                          </div>

                          {/* Improvement Suggestions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
                            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                                Diagnostic Opportunity
                              </div>
                              <p className="text-xs text-[#0B132B] leading-relaxed">
                                {item.patternToReplicateOrImprove}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                Suggested Alternative Hook
                              </div>
                              <p className="text-xs text-[#0B132B] font-medium leading-relaxed">
                                {item.alternativeApproach || 'Repackage this topic into a 30-second fast-paced Reel with a high-contrast opening title.'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0]">
                            <button
                              id={`analyze-bottom-${item.id}`}
                              onClick={() => handleDiagnosePerformer(item)}
                              className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                              <span>Forensic AI Breakdown: Why It Wasn't Working</span>
                            </button>
                            <span className="text-[11px] text-[#64748B] font-medium">
                              Forensic hook &amp; pacing remedies
                            </span>
                          </div>

                          {item.uncertaintyNote && (
                            <div className="text-[10px] text-[#94A3B8] italic pt-1 border-t border-[#E2E8F0]">
                              * {item.uncertaintyNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: EXECUTIVE INSIGHTS */}
          {activeSubTab === 'insights' && (
            <section className="space-y-4">
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Standard AI Insights ({insights.length} active)
              </div>

              {insights.length === 0 ? (
                <EmptyState
                  type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
                  title={hasConnectedPlatforms ? 'Profile connected. Awaiting published media assets.' : 'Connect your account to generate insights.'}
                  description="Media Navigator analyzes published assets to identify proven patterns, growth velocity, and timing windows."
                  actionText="Manage Connections"
                  onAction={() => setCurrentTab('connections')}
                />
              ) : (
                <div className="space-y-3">
                  {insights.map((ins) => {
                    const isExpanded = expandedId === ins.id;

                    return (
                      <div
                        key={ins.id}
                        id={`insight-${ins.id}`}
                        className="rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs overflow-hidden transition-all hover:border-[#0284C7]/40"
                      >
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : ins.id)}
                          className="p-5 flex items-start justify-between cursor-pointer gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="p-2 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/20 shrink-0 mt-0.5">
                              {getCategoryIcon(ins.category)}
                            </span>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#0284C7]">
                                  {ins.category}
                                </span>
                                <span className="text-[10px] text-[#64748B]">
                                  {ins.detectedAt}
                                </span>
                              </div>

                              <h2 className="text-sm font-bold text-[#0B132B] tracking-tight">
                                {ins.title}
                              </h2>

                              <p className="text-xs text-[#64748B] leading-relaxed">
                                {ins.observation || ins.description}
                              </p>
                            </div>
                          </div>

                          <button className="text-xs font-semibold text-[#0284C7] shrink-0 flex items-center gap-1 hover:text-[#0369A1]">
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-0 border-t border-[#E2E8F0] mt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 text-xs">
                              {/* 1. Observation */}
                              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3 text-[#0284C7]" />
                                  1. Observation (Platform Data)
                                </div>
                                <div className="text-[#0B132B] text-xs">
                                  {ins.observation || ins.description}
                                </div>
                              </div>

                              {/* 2. Supporting Data */}
                              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                                  <Target className="w-3 h-3 text-emerald-600" />
                                  2. Supporting Data (Metrics &amp; Comparisons)
                                </div>
                                <div className="text-[#0B132B] text-xs font-medium">
                                  {ins.supportingData || ins.whyItMatters}
                                </div>
                              </div>

                              {/* 3. Possible Explanation */}
                              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3 text-amber-500" />
                                  3. Possible Explanation (Hypothesis)
                                </div>
                                <div className="text-[#64748B] text-xs italic">
                                  {ins.possibleReason || 'Inferred pattern from baseline distribution variance.'}
                                </div>
                              </div>

                              {/* 4. Recommendation & Measurement */}
                              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                                <div>
                                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-[#0284C7]" />
                                    4. Recommendation (Practical Action)
                                  </div>
                                  <div className="text-[#0B132B] text-xs font-medium mt-0.5">
                                    {ins.recommendedAction || 'Schedule follow-up post in this format.'}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-[#E2E8F0]">
                                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                    5. Expected Measurement
                                  </div>
                                  <div className="text-[11px] text-[#64748B]">
                                    {ins.measurement || 'Monitor 48-hour engagement velocity vs profile median.'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: CONTENT PATTERNS */}
          {activeSubTab === 'patterns' && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#0B132B]">
                  Format &amp; Content Pattern Library
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Recurring behaviors across formats, engagement rates, and viewer retention in your published assets.
                </p>
              </div>

              {contentPatterns.length === 0 ? (
                <EmptyState
                  type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
                  title="Patterns require published content"
                  description="Once multiple posts are synced, Media Navigator computes format benchmarks, caption trends, and retention patterns."
                  actionText="Manage Connections"
                  onAction={() => setCurrentTab('connections')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contentPatterns.map((pat) => (
                    <div
                      key={pat.format}
                      className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[#0B132B] text-white">
                          {pat.format}
                        </span>
                        <span className="text-xs font-semibold text-[#64748B]">
                          {pat.sampleCount} assets
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2E8F0]">
                        <div>
                          <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Engagement</div>
                          <div className="text-sm font-bold text-emerald-700 font-mono">
                            {pat.avgEngagement}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#64748B] uppercase font-semibold">Avg Views</div>
                          <div className="text-sm font-bold text-[#0B132B] font-mono">
                            {pat.avgViews?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                        {pat.recommendation || 'Maintain consistent weekly publishing schedule.'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Deep AI Post Diagnosis Modal */}
      <PostAIDiagnosisModal
        media={diagnoseMedia}
        onClose={() => setDiagnoseMedia(null)}
      />
    </div>
  );
};
