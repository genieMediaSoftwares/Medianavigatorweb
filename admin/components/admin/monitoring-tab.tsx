'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import { ErrorState } from '@/components/ui/states';
import { Card } from '@/components/ui/card';
import { dateTime, whole } from '@/lib/format';
import { TableCard, th, td } from './shared';

interface Monitoring {
  generatedAt: string;
  ai: { configured: boolean; model: string | null; windowStart: string; calls: { _id: string; count: number; averageLatencyMs: number }[]; analyses: number; jobs: { _id: string; count: number }[]; cacheEntries: number; latestCalls: { _id: string; operation: string; model: string; status: string; latencyMs: number; reason: string | null; createdAt: string }[]; note: string };
  analytics: { snapshots: number; latestSnapshot: { platform: string; date: string; updatedAt: string } | null };
  billing: { subscriptionsImplemented: boolean; creditRules: { startingBalance: number; postAnalysis: { image: number; video: number }; freeChecks: { top: number; bottom: number } } };
}
export function MonitoringTab({ section }: { section: 'ai' | 'analytics' | 'credits' }) {
  const q = useQuery({ queryKey: ['admin', 'monitoring'], queryFn: () => apiGet<Monitoring>('/admin/monitoring'), refetchInterval: 60_000 });
  if (q.isLoading) return <p role="status">Loading monitoring data…</p>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return null;
  const { ai, analytics, billing } = q.data;
  return <div className="space-y-6"><p className="text-sm text-muted">Updated {dateTime(q.data.generatedAt)} · refreshes every minute</p>
    {section === 'analytics' && <Card><h2 className="text-xl">Shared analytics pipeline</h2><p className="mt-3">{whole(analytics.snapshots)} daily account snapshots stored in the shared database.</p><p className="mt-2 text-muted">{analytics.latestSnapshot ? `Latest update: ${analytics.latestSnapshot.platform} · ${analytics.latestSnapshot.date} · ${dateTime(analytics.latestSnapshot.updatedAt)}` : 'No analytics snapshots have been generated yet. Connect accounts and complete a sync to collect measurements.'}</p><p className="mt-4 text-sm text-muted">Snapshots are per account and date. They are not summed into misleading cumulative audience or engagement totals. Use Sync runs to inspect ingestion outcomes.</p></Card>}
    {section === 'credits' && <Card><h2 className="text-xl">Insight Credits</h2><p className="mt-3">Subscription billing is not implemented in the shared backend.</p><p className="mt-3">Starting balance: {billing.creditRules.startingBalance} credits. Image analysis: {billing.creditRules.postAnalysis.image} credits. Video analysis: {billing.creditRules.postAnalysis.video} credits.</p><p className="mt-2">Free checks: {billing.creditRules.freeChecks.top} top-performing and {billing.creditRules.freeChecks.bottom} bottom-performing.</p><p className="mt-4 text-muted">Adjust existing balances in Users. Changes affect the website and mobile app and are recorded in the audit log.</p></Card>}
    {section === 'ai' && <><Card><h2 className="text-xl">Gemini monitoring</h2><p className="mt-3">{ai.configured ? `Configured · ${ai.model}` : 'Gemini is not configured'}</p><p className="mt-3">{whole(ai.analyses)} stored content analyses · {whole(ai.cacheEntries)} unexpired cached results</p><div className="mt-4 flex flex-wrap gap-5">{ai.calls.map(c => <p key={c._id}><strong>{whole(c.count)}</strong> {c._id} attempts · average {Math.round(c.averageLatencyMs)} ms</p>)}{ai.calls.length === 0 && <p>No generation attempts recorded in the last 30 days.</p>}</div><p className="mt-3 text-sm text-muted">Window begins {dateTime(ai.windowStart)}. {ai.note}</p><p className="mt-3 text-sm">Tokens: unavailable · Billing cost: unavailable</p><p className="mt-4">Deep analysis jobs: {ai.jobs.length ? ai.jobs.map(j => `${j._id}: ${j.count}`).join(' · ') : 'None yet'}</p></Card><TableCard><table className="w-full min-w-[760px]"><caption className="p-4 text-left font-semibold">Latest generation attempts (25)</caption><thead><tr>{['Time', 'Operation', 'Model', 'Status', 'Latency', 'Reason'].map(x => <th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{ai.latestCalls.map(c => <tr key={c._id}><td className={td}>{dateTime(c.createdAt)}</td><td className={td}>{c.operation}</td><td className={td}>{c.model}</td><td className={td}>{c.status}</td><td className={td}>{c.latencyMs} ms</td><td className={td}>{c.reason ?? '—'}</td></tr>)}</tbody></table>{!ai.latestCalls.length && <p className="p-4 text-muted">No recorded calls yet.</p>}</TableCard></>}
  </div>;
}

interface Errors {
  server: { _id: string; code: string; status: number; method: string; route: string; requestId?: string; createdAt: string }[];
  sync: { _id: string; platform: string; status: string; queuedAt: string; errorKind?: string; itemsFailed: number }[];
  analysis: { _id: string; platform: string; analysisType: string; lastErrorAt: string; attempts: number }[];
  deep: { _id: string; status: string; updatedAt: string; attempts: number }[];
  note: string;
}
export function ErrorsTab() {
  const q = useQuery({ queryKey: ['admin', 'errors'], queryFn: () => apiGet<Errors>('/admin/errors'), refetchInterval: 60_000 });
  if (q.isLoading) return <p role="status">Loading error records…</p>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return null;
  const d = q.data;
  const groups = [
    { name: 'Server errors', rows: d.server.map(r => ({ id: r._id, time: r.createdAt, context: `${r.method} ${r.route}`, detail: `${r.status} ${r.code}`, reference: r.requestId ?? r._id })) },
    { name: 'Sync failures and partial results', rows: d.sync.map(r => ({ id: r._id, time: r.queuedAt, context: r.platform, detail: `${r.status} · ${r.errorKind ?? 'unspecified'} · ${r.itemsFailed} failed items`, reference: r._id })) },
    { name: 'Content analysis errors', rows: d.analysis.map(r => ({ id: r._id, time: r.lastErrorAt, context: r.platform, detail: `${r.analysisType} · ${r.attempts} attempts`, reference: r._id })) },
    { name: 'Deep analysis failures', rows: d.deep.map(r => ({ id: r._id, time: r.updatedAt, context: 'Deep analysis', detail: `${r.status} · ${r.attempts} attempts`, reference: r._id })) },
  ];
  return <div className="space-y-6"><p className="text-sm text-muted">{d.note}</p>{groups.map(g => <TableCard key={g.name}><table className="w-full min-w-[700px]"><caption className="p-4 text-left font-semibold">{g.name}</caption><thead><tr>{['Time', 'Context', 'Outcome', 'Reference'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead><tbody>{g.rows.map(r => <tr key={r.id}><td className={td}>{dateTime(r.time)}</td><td className={td}>{r.context}</td><td className={td}>{r.detail}</td><td className={`${td} font-mono text-xs`}>{r.reference}</td></tr>)}</tbody></table>{!g.rows.length && <p className="p-4 text-muted">No error records in this source.</p>}</TableCard>)}</div>;
}
export function PermissionsTab() {
  const q = useQuery({ queryKey: ['admin', 'permissions'], queryFn: () => apiGet<{ roles: { role: string; permissions: string[]; adminAccess: boolean }[]; safeguards: string[] }>('/admin/permissions') });
  if (q.isLoading) return <p role="status">Loading permissions…</p>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <div className="space-y-6"><div className="grid gap-6 md:grid-cols-2">{q.data?.roles.map(r => <Card key={r.role}><h2 className="text-xl capitalize">{r.role}</h2><p className="my-3">Admin access: {r.adminAccess ? 'Allowed' : 'Denied'}</p><ul className="list-disc space-y-2 pl-5">{r.permissions.map(p => <li key={p}>{p}</li>)}</ul></Card>)}</div><Card><h2 className="mb-4 text-xl">Enforced safeguards</h2><ul className="list-disc space-y-2 pl-5">{q.data?.safeguards.map(s => <li key={s}>{s}</li>)}</ul><p className="mt-4 text-muted">Grant or revoke the existing administrator role in Users.</p></Card></div>;
}
