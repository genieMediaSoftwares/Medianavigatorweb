'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, ChevronDown, Clock, Database, Flame, Layers, Send, Sparkles } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BestTimesView } from './best-times-view';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api/endpoints';
import { compact, percent, whole } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import type { AiInsight, ArchiveResponse, AskResult } from '@/types/api';

type TabId = 'full_archive' | 'executive_insights' | 'format_patterns' | 'best_times';

const TAB_MAP: Record<string, TabId> = {
  full_archive: 'full_archive',
  overview: 'full_archive',
  executive_insights: 'executive_insights',
  trends: 'executive_insights',
  signals: 'executive_insights',
  format_patterns: 'format_patterns',
  patterns: 'format_patterns',
  best_times: 'best_times',
  timing: 'best_times',
};

export function InsightsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rawTab = params.get('tab') ?? 'full_archive';
  // Ranked posts live on the Posts page now; keep old links working.
  const moved = rawTab === 'whats_working' ? 'working' : rawTab === 'needs_attention' ? 'attention' : null;
  useEffect(() => { if (moved) router.replace(`/posts?tab=${moved}`); }, [moved, router]);
  const activeTab: TabId = TAB_MAP[rawTab] ?? 'full_archive';

  // Data Queries
  const archive = useQuery({ queryKey: qk.archive, queryFn: api.archive, staleTime: 60_000 });
  const signals = useQuery({ queryKey: qk.signals, queryFn: api.signals, staleTime: 60_000 });
  const patterns = useQuery({ queryKey: qk.patterns, queryFn: api.patterns, staleTime: 60_000 });

  const setTab = (id: TabId) => {
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  const archiveCount = archive.data?.totalAnalyzed ?? 0;
  const executiveCount = signals.data?.insights.length ?? 0;
  const patternsCount = patterns.data?.length ?? 0;

  const tabs = [
    { id: 'full_archive' as TabId, label: 'Overview', count: archiveCount, icon: Database },
    { id: 'executive_insights' as TabId, label: 'Key takeaways', count: executiveCount, icon: Sparkles },
    { id: 'format_patterns' as TabId, label: 'Formats', count: patternsCount, icon: Layers },
    { id: 'best_times' as TabId, label: 'Best times', count: 0, icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader title="Insights" subtitle="What is working, what to try next, and when to post, based on your own posts." />

      <div className="no-print overflow-x-auto custom-scroll pb-1" role="tablist" aria-label="Insights sections">
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/80 p-1.5 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'text-muted hover:bg-brand-50 hover:text-ink'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-subtle'}`} aria-hidden="true" />
                <span>{t.label}</span>
                {t.count > 0 && <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-brand-50 text-brand-700'}`}>{t.count}</span>}
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
        {activeTab === 'executive_insights' && (
          <ExecutiveInsightsView
            signals={signals.data?.insights ?? []}
            loading={signals.isPending}
            error={signals.error}
            onRetry={() => signals.refetch()}
          />
        )}
        {activeTab === 'best_times' && <BestTimesView embedded />}
        {activeTab === 'format_patterns' && (
          <FormatPatternsView
            patterns={patterns.data ?? []}
            loading={patterns.isPending}
            error={patterns.error}
            onRetry={() => patterns.refetch()}
          />
        )}
      </div>
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
    <Card className="p-5 bg-brand-50/50 border-brand-100 dark:border-line">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">Ask about your posts</span>
          </div>
          <p className="text-xs text-muted mt-0.5">Get an answer based on your own post history.</p>

          <form onSubmit={handleAsk} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which posts got the most views, and how did they start?"
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
                  <span className="text-xs font-bold text-ink">Answer</span>
                </div>
                <Badge tone="brand">
                  {ask.data.ai.status === 'cached' ? 'Saved answer' : 'New answer'}
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

/** Overview */
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
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
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
      setAuditMessage('The audit could not be completed. Please try again.');
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Archive Header Banner */}
      <Card className="p-6 bg-brand-50 text-ink overflow-hidden relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              {archive.totalAnalyzed.toLocaleString()} posts analysed
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Your usual numbers are worked out from the posts we have imported. Open Posts to browse them all.
            </p>
          </div>
          <Button
            onClick={handleAuditAll}
            loading={auditing}
            className="bg-white hover:bg-brand-50 text-brand-600 font-bold shrink-0 shadow-sm"
          >
            <Sparkles className="h-4 w-4 mr-2 text-brand-600" />
            Audit All Posts with AI
          </Button>
        </div>
        {auditMessage && (
          <div className="mt-4 p-4 rounded-xl bg-surface border border-line text-sm text-ink animate-fade">
            <p className="font-semibold text-brand-700 mb-1">AI Audit Result:</p>
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
              className={`rounded-xl border p-5 transition-all ${
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

/** Key takeaways */
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
          <Skeleton key={i} className="h-44 rounded-xl" />
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
          <Skeleton key={i} className="h-44 rounded-xl" />
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
