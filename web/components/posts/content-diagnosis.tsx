'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ChevronDown, CircleHelp, Eye, Gauge,
  Hash, Layers, Lightbulb, MessageCircle, Palette, Play, Quote, RefreshCw, Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/states';
import { api } from '@/lib/api/endpoints';
import { compact, percent, whole } from '@/lib/format';
import type {
  ContentType, DiagnosisAlternative, DiagnosisClass, DiagnosisDiagnostic, DiagnosisInsight, DiagnosisResponse, DiagnosisSignal, Platform,
} from '@/types/api';
import { PostThumb } from './post-card';

/**
 * A diagnosis adapts to how the post actually performed:
 * a top performer gets insights first, a bottom performer gets a recovery plan first.
 * Colours are never the only signal: every status also carries a label and an icon.
 */
const SIGNAL: Record<DiagnosisSignal, { label: string; dot: string; text: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  positive: { label: 'Strength', dot: 'bg-good', text: 'text-good', bg: 'bg-good-bg', border: 'border-good/25', Icon: CheckCircle2 },
  mixed: { label: 'Mixed', dot: 'bg-warn', text: 'text-warn', bg: 'bg-warn-bg', border: 'border-warn/25', Icon: CircleHelp },
  negative: { label: 'Weakness', dot: 'bg-bad', text: 'text-bad', bg: 'bg-bad-bg', border: 'border-bad/25', Icon: AlertTriangle },
  unknown: { label: 'Not available', dot: 'bg-subtle', text: 'text-muted', bg: 'bg-app', border: 'border-line', Icon: CircleHelp },
};

const INSIGHT_ICON: Record<DiagnosisInsight['key'], typeof Zap> = {
  hook: Zap,
  relevance: Target,
  visual: Palette,
  storytelling: Layers,
  engagement: MessageCircle,
  signals: BarChart3,
};

const CLASS_LABEL: Record<DiagnosisClass, string> = {
  TOP: 'Top performer',
  AVERAGE: 'Average performer',
  BOTTOM: 'Bottom performer',
  INSUFFICIENT_DATA: 'Not enough data yet',
};

const CLASS_TONE: Record<DiagnosisClass, 'good' | 'neutral' | 'bad'> = {
  TOP: 'good', AVERAGE: 'neutral', BOTTOM: 'bad', INSUFFICIENT_DATA: 'neutral',
};

function SignalTag({ signal, className = '' }: { signal: DiagnosisSignal; className?: string }) {
  const s = SIGNAL[signal];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${s.text} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/** One of the six insight buttons. Clicking reveals the detail beside the grid, in place. */
function InsightButton({ insight, active, onSelect }: { insight: DiagnosisInsight; active: boolean; onSelect: () => void }) {
  const Icon = INSIGHT_ICON[insight.key] ?? Activity;
  const s = SIGNAL[insight.signal];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-all ${
        active ? `${s.bg} ${s.border} shadow-sm` : 'border-line bg-surface hover:border-line-strong hover:bg-app'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-surface/70' : 'bg-app'}`}>
          <Icon className={`h-4 w-4 ${active ? s.text : 'text-muted'}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-ink">{insight.title || insight.key}</span>
      </div>
      <SignalTag signal={insight.signal} />
      {insight.metric && <p className="truncate text-[12px] text-muted">{insight.metric}</p>}
    </button>
  );
}

/** The detail of the selected insight, shown beside the grid rather than in a new screen. */
function InsightDetail({ insight }: { insight: DiagnosisInsight }) {
  const s = SIGNAL[insight.signal];
  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`} role="region" aria-label={`${insight.title ?? insight.key} detail`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[15px] font-bold text-ink">{insight.title || insight.key}</h4>
        <div className="flex items-center gap-3">
          <SignalTag signal={insight.signal} />
          <span className="text-[12px] font-medium text-muted">Confidence: {insight.confidence}</span>
        </div>
      </div>
      <dl className="mt-3 space-y-2.5 text-[14px]">
        <div>
          <dt className="font-semibold text-ink">What we observed</dt>
          <dd className="text-muted">{insight.observation}</dd>
        </div>
        {insight.evidence && (
          <div>
            <dt className="font-semibold text-ink">Supporting evidence</dt>
            <dd className="text-muted">{insight.evidence}</dd>
          </div>
        )}
        {insight.metric && (
          <div>
            <dt className="font-semibold text-ink">Measured</dt>
            <dd className="text-muted">{insight.metric}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-ink">Why it matters</dt>
          <dd className="text-muted">{insight.whyItMatters}</dd>
        </div>
      </dl>
    </div>
  );
}

function ThreeLineSummary({ lines }: { lines: { whatWorked: string; performanceProof: string; strategicTakeaway: string } }) {
  const rows = [
    { label: 'What worked', text: lines.whatWorked },
    { label: 'Performance proof', text: lines.performanceProof },
    { label: 'Strategic takeaway', text: lines.strategicTakeaway },
  ];
  return (
    <dl className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-3 text-[15px]">
          <dt className="w-40 shrink-0 text-[12px] font-bold uppercase tracking-wider text-brand-600">{r.label}</dt>
          <dd className="min-w-0 text-ink">{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function AlternativeCard({ alternative, index }: { alternative: DiagnosisAlternative; index: number }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-bold text-ink">{alternative.title}</h4>
          <p className="mt-1 text-[14px] text-muted">{alternative.angle}</p>
        </div>
      </div>
      <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[14px]">
        <div>
          <dt className="font-semibold text-ink">Opening hook</dt>
          <dd className="text-muted">&ldquo;{alternative.hook}&rdquo;</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Execution</dt>
          <dd className="text-muted">{alternative.execution}</dd>
        </div>
        {alternative.cta && (
          <div>
            <dt className="font-semibold text-ink">Call to action</dt>
            <dd className="text-muted">{alternative.cta}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-ink">Why it may work better</dt>
          <dd className="text-muted">{alternative.whyItMayWorkBetter}</dd>
        </div>
      </dl>
    </article>
  );
}

function DiagnosticCard({ diagnostic }: { diagnostic: DiagnosisDiagnostic }) {
  const s = SIGNAL[diagnostic.signal];
  const Icon = s.Icon;
  return (
    <article className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Icon className={`h-4 w-4 shrink-0 ${s.text}`} aria-hidden="true" />
          {diagnostic.title}
        </h4>
        <SignalTag signal={diagnostic.signal} />
      </div>
      <p className="mt-2 text-[14px] text-ink">{diagnostic.observation}</p>
      {diagnostic.metric && <p className="mt-1.5 text-[13px] font-medium text-muted">Measured: {diagnostic.metric}</p>}
      <p className="mt-1.5 text-[14px] text-muted"><span className="font-semibold text-ink">Why it may matter: </span>{diagnostic.impact}</p>
      <p className="mt-1.5 text-[14px] text-muted"><span className="font-semibold text-ink">Improvement: </span>{diagnostic.improvement}</p>
    </article>
  );
}

/** The measured numbers of this post against the account's own median. */
function EvidenceTable({ diagnosis }: { diagnosis: DiagnosisResponse }) {
  const rows = (diagnosis.baseline.rows ?? []).filter((r) => r.post !== null || r.median !== null);
  if (rows.length === 0) return null;
  const fmt = (v: number | null, key: string) => {
    if (v === null) return 'Not available';
    if (key === 'engagementRate') return percent(v);
    return whole(v);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <caption className="sr-only">Measured results compared with this account&apos;s median</caption>
        <thead>
          <tr className="text-[12px] uppercase tracking-wider text-muted">
            <th scope="col" className="py-1.5 font-semibold">Measure</th>
            <th scope="col" className="py-1.5 font-semibold">This post</th>
            <th scope="col" className="py-1.5 font-semibold">Your median</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line">
              <th scope="row" className="py-2 pr-3 font-medium text-ink">{r.label}</th>
              <td className="py-2 tabular text-ink">{fmt(r.post, r.key)}</td>
              <td className="py-2 tabular text-muted">{fmt(r.median, r.key)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The six insights and the detail of the selected one. */
function InsightGrid({ insights }: { insights: DiagnosisInsight[] }) {
  const [selected, setSelected] = useState<string>(insights[0]?.key ?? '');
  const active = insights.find((i) => i.key === selected) ?? insights[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        {insights.map((i) => (
          <InsightButton key={i.key} insight={i} active={active?.key === i.key} onSelect={() => setSelected(i.key)} />
        ))}
      </div>
      {active && <InsightDetail insight={active} />}
    </div>
  );
}

/** The detailed analysis, revealed in place. */
function DeepAnalysis({ diagnosis }: { diagnosis: DiagnosisResponse }) {
  const [open, setOpen] = useState(false);
  const r = diagnosis.result;
  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Layers className="h-4 w-4" aria-hidden="true" />
        {open ? 'Hide deep analysis' : 'Deep analysis'}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Button>
      {open && (
        <div className="mt-4 space-y-4">
          {r.insights && r.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted">Each dimension in detail</h4>
              <ul className="mt-2 space-y-3">
                {r.insights.map((i) => (
                  <li key={i.key} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15px] font-bold text-ink">{i.title || i.key}</span>
                      <SignalTag signal={i.signal} />
                    </div>
                    <p className="mt-1.5 text-[14px] text-muted">{i.observation}</p>
                    {i.evidence && <p className="mt-1 text-[13px] text-subtle">Evidence: {i.evidence}</p>}
                    <p className="mt-1 text-[14px] text-muted"><span className="font-semibold text-ink">Why it matters: </span>{i.whyItMatters}</p>
                    {i.metric && <p className="mt-1 text-[13px] font-medium text-muted">Measured: {i.metric}</p>}
                    <p className="mt-1 text-[12px] text-subtle">Confidence: {i.confidence}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.preserve && r.preserve.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted">What to preserve</h4>
              <ul className="mt-2 space-y-1.5 text-[14px] text-ink">
                {r.preserve.map((p, i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-hidden="true" />{p}</li>
                ))}
              </ul>
            </div>
          )}
          {(r.limitations ?? []).length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted">Limitations</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">{(r.limitations ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The body of the diagnosis, arranged by how the post actually performed. */
function DiagnosisBody({ diagnosis }: { diagnosis: DiagnosisResponse }) {
  const r = diagnosis.result;
  const cls = diagnosis.classification;

  if (cls === 'TOP') {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="text-[15px] font-bold uppercase tracking-wider text-brand-600">Why this worked</h3>
          <p className="mt-2 text-[15px] text-ink">{r.summary}</p>
        </Card>
        {r.threeLine && (
          <Card className="p-5">
            <h3 className="text-[15px] font-bold uppercase tracking-wider text-brand-600">What this tells you</h3>
            <div className="mt-3"><ThreeLineSummary lines={r.threeLine} /></div>
          </Card>
        )}
        {r.insights && r.insights.length > 0 && (
          <section aria-label="Success insights">
            <h3 className="mb-3 text-[15px] font-bold uppercase tracking-wider text-brand-600">Six insights</h3>
            <InsightGrid insights={r.insights} />
          </section>
        )}
        <DeepAnalysis diagnosis={diagnosis} />
      </div>
    );
  }

  if (cls === 'BOTTOM') {
    return (
      <div className="space-y-6">
        {r.nextStep && (
          <Card className="border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900/40 dark:bg-brand-950/20">
            <h3 className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />What to do next
            </h3>
            <p className="mt-2 text-[15px] font-semibold text-ink">{r.nextStep.headline}</p>
            <p className="mt-1.5 text-[15px] text-muted">{r.nextStep.body}</p>
          </Card>
        )}
        {r.alternatives && r.alternatives.length > 0 && (
          <section aria-label="Creative alternatives">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-brand-600">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />Three alternative concepts
            </h3>
            <div className="grid gap-3 lg:grid-cols-3">
              {r.alternatives.map((a, i) => <AlternativeCard key={i} alternative={a} index={i} />)}
            </div>
          </section>
        )}
        {r.diagnostics && r.diagnostics.length > 0 && (
          <section aria-label="Why it may have underperformed">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-brand-600">
              <Activity className="h-4 w-4" aria-hidden="true" />Why it may have underperformed
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {r.diagnostics.map((d, i) => <DiagnosticCard key={i} diagnostic={d} />)}
            </div>
          </section>
        )}
        <DeepAnalysis diagnosis={diagnosis} />
      </div>
    );
  }

  if (cls === 'AVERAGE') {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="text-[15px] font-bold uppercase tracking-wider text-brand-600">Where this post stands</h3>
          <p className="mt-2 text-[15px] text-ink">{r.summary}</p>
        </Card>
        <div className="grid gap-3 lg:grid-cols-3">
          {r.whatWorks && (
            <Card className="p-4">
              <h4 className="flex items-center gap-2 text-[14px] font-bold text-good"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />What&apos;s working</h4>
              <p className="mt-1.5 text-[14px] text-muted">{r.whatWorks}</p>
            </Card>
          )}
          {r.mainOpportunity && (
            <Card className="p-4">
              <h4 className="flex items-center gap-2 text-[14px] font-bold text-warn"><CircleHelp className="h-4 w-4" aria-hidden="true" />Main opportunity</h4>
              <p className="mt-1.5 text-[14px] text-muted">{r.mainOpportunity}</p>
            </Card>
          )}
          {r.nextExperiment && (
            <Card className="p-4">
              <h4 className="flex items-center gap-2 text-[14px] font-bold text-brand-600"><Target className="h-4 w-4" aria-hidden="true" />Next experiment</h4>
              <p className="mt-1.5 text-[14px] text-muted">{r.nextExperiment}</p>
            </Card>
          )}
        </div>
        {r.insights && r.insights.length > 0 && (
          <section aria-label="Analysis by dimension">
            <h3 className="mb-3 text-[15px] font-bold uppercase tracking-wider text-brand-600">Six insights</h3>
            <InsightGrid insights={r.insights} />
          </section>
        )}
        <DeepAnalysis diagnosis={diagnosis} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-muted">
          <CircleHelp className="h-4 w-4" aria-hidden="true" />Not enough data to compare
        </h3>
        <p className="mt-2 text-[15px] text-ink">{r.summary}</p>
        <p className="mt-1.5 text-[14px] text-muted">{diagnosis.baseline.method}</p>
      </Card>
      <div className="grid gap-3 lg:grid-cols-3">
        {r.whatWorks && (
          <Card className="p-4">
            <h4 className="flex items-center gap-2 text-[14px] font-bold text-good"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />What&apos;s working</h4>
            <p className="mt-1.5 text-[14px] text-muted">{r.whatWorks}</p>
          </Card>
        )}
        {r.mainOpportunity && (
          <Card className="p-4">
            <h4 className="flex items-center gap-2 text-[14px] font-bold text-warn"><CircleHelp className="h-4 w-4" aria-hidden="true" />Main opportunity</h4>
            <p className="mt-1.5 text-[14px] text-muted">{r.mainOpportunity}</p>
          </Card>
        )}
        {r.nextExperiment && (
          <Card className="p-4">
            <h4 className="flex items-center gap-2 text-[14px] font-bold text-brand-600"><Target className="h-4 w-4" aria-hidden="true" />Next experiment</h4>
            <p className="mt-1.5 text-[14px] text-muted">{r.nextExperiment}</p>
          </Card>
        )}
      </div>
      {r.insights && r.insights.length > 0 && (
        <section aria-label="Analysis by dimension">
          <h3 className="mb-3 text-[15px] font-bold uppercase tracking-wider text-brand-600">Six insights</h3>
          <InsightGrid insights={r.insights} />
        </section>
      )}
    </div>
  );
}

/**
 * The performance-adaptive diagnosis of one post. It is the single place a reader goes to
 * understand a post: the same component answers differently for a top, average or bottom performer.
 */
export function ContentDiagnosis({ mediaId, thumbnailUrl, title, platform, contentType }: { mediaId: string; thumbnailUrl?: string; title?: string; platform: Platform; contentType: ContentType }) {
  const qc = useQueryClient();
  // The API saves every diagnosis per post, so opening the same post again is served from the saved result.
  const query = useQuery({ queryKey: ['diagnosis', mediaId], queryFn: () => api.diagnosis(mediaId), staleTime: 5 * 60_000, retry: 1 });
  const refresh = useMutation({
    mutationFn: () => api.diagnosis(mediaId, true),
    onSuccess: (fresh) => {
      qc.setQueryData(['diagnosis', mediaId], fresh);
    },
  });
  const d = query.data;

  if (query.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label="Preparing the diagnosis">
        <div className="h-5 w-2/5 animate-pulse rounded bg-line" />
        <div className="h-24 animate-pulse rounded-xl bg-app" />
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-app" />)}
        </div>
      </div>
    );
  }

  if (query.isError || !d) {
    return (
      <div className="card p-5">
        <p className="text-[15px] text-muted">We couldn&apos;t build the diagnosis for this post.</p>
        <Button className="mt-4" variant="secondary" onClick={() => void query.refetch()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {thumbnailUrl && <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line"><PostThumb item={{ thumbnailUrl, platform, contentType, title: title ?? '' }} className="h-full w-full" /></span>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={CLASS_TONE[d.classification]} dot>{CLASS_LABEL[d.classification]}</Badge>
              <span className="text-[12px] text-subtle">Measured against your own history</span>
            </div>
            {title && <p className="mt-1 line-clamp-1 text-[14px] font-semibold text-ink">{title}</p>}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void refresh.mutate()} loading={query.isFetching || refresh.isPending}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh
        </Button>
      </div>

      {d.stale && <Notice tone="warn">This analysis may be out of date because the post&apos;s numbers changed.</Notice>}
      {d.refreshError && <Notice tone="warn">{d.refreshError}</Notice>}

      <DiagnosisBody diagnosis={d} />

      <section aria-label="Performance evidence" className="card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-brand-600">
          <Gauge className="h-4 w-4" aria-hidden="true" />Performance evidence
        </h3>
        <EvidenceTable diagnosis={d} />
        <p className="mt-3 text-[12px] text-subtle">{d.baseline.method}</p>
      </section>

      {(d.result.limitations ?? []).length > 0 && (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-muted">Limitations and what was not measured</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">{(d.result.limitations ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </details>
      )}

      {d.result.confidence && (
        <p className="text-[12px] text-subtle">
          Confidence in this analysis: {d.result.confidence.level}. {d.result.confidence.reason}
        </p>
      )}
    </div>
  );
}
