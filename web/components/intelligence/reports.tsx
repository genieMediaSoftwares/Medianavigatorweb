'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AiReport, Block, Bullets } from './ai-report';

const grid = 'grid grid-cols-1 gap-5 md:grid-cols-2';

export const ExecutiveReport = () => (
  <AiReport kind="executive" render={(r) => (
    <>
      <Card className="border-brand-200 bg-brand-50/60"><p className="text-xs font-bold uppercase tracking-wider text-brand-600">The short version</p><h2 className="mt-1 text-2xl">{r.headline}</h2></Card>
      <div className={grid}>
        <Block title="What happened"><Bullets items={r.whatHappened} /></Block>
        <Block title="What it may mean"><Bullets items={r.whyItMayHaveHappened} /></Block>
        <Block title="What to do next"><Bullets items={r.whatToDoNext} /></Block>
        {r.watchOut.length > 0 && <Block title="Keep in mind"><Bullets items={r.watchOut} tone="text-muted" /></Block>}
      </div>
    </>
  )} />
);

export const AuditReport = () => (
  <AiReport kind="audit" emptyTitle="Nothing to audit yet" render={(r) => (
    <>
      <Card><p className="text-[15px] text-text">{r.summary}</p></Card>
      <div className={grid}>
        <Block title="What is working"><Bullets items={r.strengths} /></Block>
        <Block title="What needs attention"><Bullets items={r.weaknesses} /></Block>
      </div>
      {r.priorityActions.length > 0 && (
        <Block title="Do these first">
          <ol className="space-y-3">{r.priorityActions.map((a, i) => (
            <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span><div><p className="font-semibold text-ink">{a.action}</p><p className="text-sm text-muted">{a.reason}</p></div></li>
          ))}</ol>
        </Block>
      )}
    </>
  )} />
);

export const TrendsReport = () => (
  <AiReport kind="trends" render={(r) => (
    <>
      <Card><p className="text-[15px] text-text">{r.summary}</p></Card>
      {r.trends.length > 0 && <div><h3 className="mb-3 text-lg">What is changing</h3><div className={grid}>{r.trends.map((t, i) => (
        <Card key={i} className="p-5"><h4 className="font-display text-base font-bold text-ink">{t.title}</h4><p className="mt-2 text-sm text-muted">{t.evidence}</p><p className="mt-2 text-[15px] text-text">{t.meaning}</p></Card>
      ))}</div></div>}
      {r.ideas.length > 0 && <div><h3 className="mb-3 text-lg">Post ideas from your own results</h3><div className={grid}>{r.ideas.map((t, i) => (
        <Card key={i} className="p-5"><div className="flex items-start justify-between gap-2"><h4 className="font-display text-base font-bold text-ink">{t.title}</h4><Badge tone="brand">{t.format}</Badge></div><p className="mt-2 text-sm text-muted">{t.why}</p><p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-ink"><span className="font-semibold">Opening line: </span>{t.hook}</p></Card>
      ))}</div></div>}
    </>
  )} />
);

export const StrategyReport = () => (
  <AiReport kind="strategy" render={(r) => (
    <>
      <Card><p className="text-[15px] text-text">{r.summary}</p></Card>
      <div className={grid}>
        <Block title="How often to post"><p className="text-[15px] text-text">{r.cadence}</p></Block>
        <Block title="When to post"><p className="text-[15px] text-text">{r.timing}</p></Block>
      </div>
      {r.formatMix.length > 0 && <Block title="Which formats to lean on"><ul className="space-y-3">{r.formatMix.map((f, i) => <li key={i} className="flex gap-3"><Badge tone="brand">{f.format}</Badge><span className="text-[15px] text-text">{f.advice}</span></li>)}</ul></Block>}
      {r.experiments.length > 0 && <Block title="Tests to run"><ul className="space-y-3">{r.experiments.map((e, i) => <li key={i}><p className="font-semibold text-ink">{e.test}</p><p className="text-sm text-muted">Judge it by: {e.measureBy}</p></li>)}</ul></Block>}
    </>
  )} />
);

const CONF = { Low: 'neutral', Medium: 'warn', High: 'good' } as const;
export const PatternsReport = () => (
  <AiReport kind="patterns" render={(r) => (
    <>
      <Card><p className="text-[15px] text-text">{r.summary}</p></Card>
      {r.patterns.length > 0 && <div className={grid}>{r.patterns.map((p, i) => (
        <Card key={i} className="p-5"><div className="flex items-start justify-between gap-2"><h4 className="font-display text-base font-bold text-ink">{p.title}</h4><Badge tone={CONF[p.confidence]}>{p.confidence} confidence</Badge></div><p className="mt-2 text-[15px] text-text">{p.evidence}</p></Card>
      ))}</div>}
      {r.formatNotes.length > 0 && <Block title="By format"><ul className="space-y-3">{r.formatNotes.map((f, i) => <li key={i} className="flex gap-3"><Badge tone="brand">{f.format}</Badge><span className="text-[15px] text-text">{f.note}</span></li>)}</ul></Block>}
    </>
  )} />
);
