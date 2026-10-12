'use client';

import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, ErrorState, Notice } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannel } from '@/lib/hooks/useChannel';
import { useAiReport } from '@/lib/hooks/useQueries';
import { dateShort } from '@/lib/format';
import type { AiMeta, AiReportKind, AiReportMap } from '@/types/api';

export function AiBadge({ ai }: { ai: AiMeta }) {
  const helped = ai.status === 'ran' || ai.status === 'cached';
  return (
    <Badge tone={helped ? 'brand' : 'neutral'}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {helped ? `Written by AI${ai.generatedAt ? ` · ${dateShort(ai.generatedAt)}` : ''}` : 'AI not available'}
    </Badge>
  );
}

export const Bullets = ({ items, tone = 'text-text' }: { items: string[]; tone?: string }) => (
  <ul className="space-y-2">{items.map((t, i) => <li key={i} className={`flex gap-2.5 text-[15px] ${tone}`}><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" /><span>{t}</span></li>)}</ul>
);

export const Block = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <Card className={`p-5 ${className ?? ''}`}><h3 className="mb-3 text-lg">{title}</h3>{children}</Card>
);

/** Fetches one Gemini report for the current channel and range and hands the typed result to `render`. Handles every state honestly. */
export function AiReport<K extends AiReportKind>({ kind, render, emptyTitle = 'Nothing to report yet' }: { kind: K; render: (r: AiReportMap[K]) => ReactNode; emptyTitle?: string }) {
  const { channel, days } = useChannel();
  const q = useAiReport(kind, channel, days);
  if (q.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Writing this report">
        <p className="flex items-center gap-2 text-sm text-muted"><Sparkles className="h-4 w-4 animate-pulse text-brand-500" aria-hidden="true" />Reading your numbers and writing this up…</p>
        <Skeleton className="h-28" /><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      </div>
    );
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  if (r.ai.status === 'not_needed') {
    return <EmptyState title={emptyTitle} description={`There are no posts in the last ${days} days${channel === 'all' ? '' : ' on this channel'}. Try a longer date range, or connect and update your channels.`} action={<LinkButton href="/connections">Go to Connections</LinkButton>} />;
  }
  if (!r.report) {
    return (
      <div className="space-y-4">
        <Notice tone={r.ai.status === 'failed' ? 'warn' : 'info'}>
          {r.ai.status === 'failed'
            ? 'The AI could not finish this report just now. Your numbers are fine; please try again in a moment.'
            : 'AI writing is switched off on this server, so there is no written report. Your measured numbers are still on the other pages.'}
        </Notice>
        <button onClick={() => q.refetch()} className="text-sm font-semibold text-brand-600 hover:underline">Try again</button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><AiBadge ai={r.ai} /><span className="text-sm text-subtle">Based on the last {days} days{channel === 'all' ? ' across all channels' : ''}. Written from measured numbers; reasons are possibilities, not facts.</span></div>
      {render(r.report)}
    </div>
  );
}
