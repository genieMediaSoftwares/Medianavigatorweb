import React, { useCallback, useEffect, useState } from 'react';
import { Printer, Copy, Check, Loader2 } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { Delta, PageSkeleton, Segmented, compact, platformName, typeLabel } from '../../components/ui';

type Post = { id: string; title: string; platform: string; contentType: string; engagementRate: number; views: number; vsMedianEngagementPct: number | null };
type Report = {
  dataPeriod: { days: number; current: { from: string; to: string; count: number; medianEngagementRate: number; meanEngagementRate: number; totalViews: number; medianViews: number }; previous: { count: number } };
  periodComparison: { engagementRateMedianChangePct: number | null; viewsMedianChangePct: number | null; comparable: boolean };
  contentTypePerformance: Array<{ platform: string; contentType: string; count: number; medianEngagementRate: number }>;
  topContent: Post[]; needsImprovement: Post[];
  platformsIncluded: string[]; timezone: string; lastSyncedAt: string | null; classificationMethod: string;
  contentIdeas: { generatedBy: string; items: Array<{ idea: string; basedOn: string }> };
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

export const Reports: React.FC = () => {
  const { connections, selectedPlatform, user } = useMedia();
  const [days, setDays] = useState<'7' | '30' | '90' | '365'>('30');
  const [scope, setScope] = useState<string>(selectedPlatform);
  const [report, setReport] = useState<Report | null>(null);
  const [window_, setWindow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const live = connections.filter((c) => c.connected);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([api.getSummary({ days: Number(days), platform: scope === 'all' ? undefined : scope }), api.getTiming().catch(() => null)])
      .then(([r, t]) => { setReport(r); setWindow(t?.strongestWindow ? `${t.strongestWindow.label}, ${t.strongestWindow.timeSlot}` : null); })
      .catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [days, scope]);
  useEffect(() => { load(); }, [load, connections]);

  const text = () => {
    if (!report) return '';
    const c = report.dataPeriod.current;
    return [
      `Media Navigator report · ${fmtDate(c.from)} – ${fmtDate(c.to)}`,
      `Posts: ${c.count} · Views: ${c.totalViews.toLocaleString()} · Typical engagement: ${c.medianEngagementRate}% (median)`,
      ...report.topContent.slice(0, 3).map((p, i) => `Top ${i + 1}: ${p.title} (${p.engagementRate}%)`),
    ].join('\n');
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text()); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };

  if (live.length === 0) return <EmptyState type="no_connection" title="Connect an account to build reports" description="Reports summarize your synced posts for any period." />;

  const c = report?.dataPeriod.current;
  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Segmented ariaLabel="Period" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: 'Year' }]} />
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="input !h-10 !w-auto" aria-label="Platform">
            <option value="all">All connected channels</option>
            {live.map((p) => <option key={p.platform} value={p.platform}>{platformName(p.platform)}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={copy} disabled={!report} className="btn btn-secondary btn-sm">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy summary'}</button>
          <button onClick={() => window.print()} disabled={!report} className="btn btn-primary btn-sm"><Printer className="w-4 h-4" />Print or save as PDF</button>
        </div>
      </div>

      {loading && !report ? <PageSkeleton /> : error ? (
        <EmptyState type="no_data" title="We couldn’t build the report" description={error} actionText="Try again" onAction={load} />
      ) : report && c ? (
        <article className="card p-6 md:p-10 print:shadow-none print:border-0 print:p-0" aria-busy={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-600 float-right" />}
          <header className="border-b border-line pb-6">
            <div className="eyebrow">Performance report</div>
            <h2 className="mt-1 font-display text-4xl font-medium tracking-tight">{user.organization || user.fullName || 'Your content'}</h2>
            <p className="mt-2 text-body">{fmtDate(c.from)} – {fmtDate(c.to)} · {report.platformsIncluded.length ? report.platformsIncluded.map(platformName).join(', ') : 'no posts in this scope'}</p>
          </header>

          <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6" aria-label="Summary">
            {[
              { k: 'Posts published', v: String(c.count), d: null as number | null },
              { k: 'Views', v: compact(c.totalViews), d: report.periodComparison.comparable ? report.periodComparison.viewsMedianChangePct : null },
              { k: 'Typical engagement', v: `${c.medianEngagementRate.toFixed(1)}%`, d: report.periodComparison.comparable ? report.periodComparison.engagementRateMedianChangePct : null },
              { k: 'Typical views per post', v: compact(c.medianViews), d: null },
            ].map((s) => (
              <div key={s.k}><div className="text-sm text-muted">{s.k}</div><div className="mt-1 font-display text-4xl tabular">{s.v}</div><div className="mt-1 min-h-5">{s.d !== null && <Delta value={s.d} />}</div></div>
            ))}
          </section>
          {!report.periodComparison.comparable && <p className="mt-4 text-sm text-muted">Comparison with the previous period needs at least 3 posts in each period.</p>}

          {c.count === 0 ? <p className="mt-8 text-body">No posts were published in this period.</p> : (
            <>
              {report.contentTypePerformance.length > 0 && (
                <section className="mt-10"><h3 className="text-lg font-bold">Formats</h3>
                  <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-muted border-b border-line"><th className="py-2 font-semibold">Format</th><th className="py-2 font-semibold">Posts</th><th className="py-2 font-semibold text-right">Typical engagement</th></tr></thead>
                    <tbody>{report.contentTypePerformance.map((f) => <tr key={`${f.platform}-${f.contentType}`} className="border-b border-line last:border-0"><td className="py-2.5 font-semibold">{typeLabel(f.contentType)} <span className="text-muted font-normal">· {platformName(f.platform)}</span></td><td className="py-2.5 tabular">{f.count}</td><td className="py-2.5 text-right font-bold tabular">{f.medianEngagementRate.toFixed(1)}%</td></tr>)}</tbody></table>
                </section>
              )}
              {(['topContent', 'needsImprovement'] as const).map((key) => report[key].length > 0 && (
                <section key={key} className="mt-10"><h3 className="text-lg font-bold">{key === 'topContent' ? 'Top posts' : 'Needs attention'}</h3>
                  <ol className="mt-3 divide-y divide-line">{report[key].slice(0, 5).map((p) => (
                    <li key={p.id} className="py-3 flex items-center gap-4"><span className="flex-1 min-w-0"><span className="block font-semibold truncate">{p.title}</span><span className="block text-sm text-muted">{platformName(p.platform)} · {typeLabel(p.contentType)} · {compact(p.views)} views</span></span><span className="text-right"><span className="block font-bold tabular">{p.engagementRate.toFixed(1)}%</span>{p.vsMedianEngagementPct !== null && <Delta value={p.vsMedianEngagementPct} />}</span></li>
                  ))}</ol>
                </section>
              ))}
              {window_ && <section className="mt-10"><h3 className="text-lg font-bold">Best time to post</h3><p className="mt-2 text-body">{window_} ({report.timezone}).</p></section>}
              {report.contentIdeas.items.length > 0 && (
                <section className="mt-10"><h3 className="text-lg font-bold">Suggested next steps</h3><p className="text-sm text-muted">Rule-based suggestions from the numbers above, not AI.</p>
                  <ul className="mt-3 space-y-3">{report.contentIdeas.items.map((i, n) => <li key={n}><span className="font-semibold">{i.idea}</span><span className="block text-sm text-muted">{i.basedOn}</span></li>)}</ul>
                </section>
              )}
            </>
          )}

          <footer className="mt-10 pt-5 border-t border-line text-xs text-muted space-y-1">
            <p>Typical values are medians. Top posts and posts needing attention are judged against your own history on the same platform ({report.classificationMethod.split(':')[0].toLowerCase()}).</p>
            <p>Data last synced {report.lastSyncedAt ? new Date(report.lastSyncedAt).toLocaleString() : 'never'} · times in {report.timezone}.</p>
          </footer>
        </article>
      ) : null}
    </div>
  );
};
