import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Search } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { adminApi, AdminPage, AdminSystem } from '../../services/api';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Badge, PageSkeleton, StatCard, TabBar, compact, timeAgo } from '../../components/ui';

type Tab = 'system' | 'users' | 'connections' | 'syncs' | 'audit';
const TABS = [{ id: 'system', label: 'System' }, { id: 'users', label: 'Users' }, { id: 'connections', label: 'Connected accounts' }, { id: 'syncs', label: 'Sync runs' }, { id: 'audit', label: 'Audit log' }];
const tone = (s: string) => (['succeeded', 'sync_complete', 'active', 'connected', 'ok'].includes(s) ? 'success' : ['failed', 'sync_failed', 'connection_expired', 'disabled'].includes(s) ? 'danger' : ['partial', 'permission_required', 'queued', 'running', 'syncing'].includes(s) ? 'warning' : 'neutral') as 'success' | 'danger' | 'warning' | 'neutral';

/** Loads a cursor-paginated admin list and appends further pages on demand. */
function usePaged<T>(load: (cursor?: string) => Promise<AdminPage<T>>, deps: unknown[]) {
  const [rows, setRows] = useState<T[]>([]); const [next, setNext] = useState<string | null>(null); const [total, setTotal] = useState<number | undefined>();
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const fetchPage = useCallback((cursor?: string) => {
    setLoading(true); setError(null);
    load(cursor).then((p) => { setRows((r) => (cursor ? [...r, ...p.items] : p.items)); setNext(p.nextCursor); setTotal(p.total); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { fetchPage(); }, [fetchPage]);
  return { rows, setRows, next, total, loading, error, more: () => next && fetchPage(next), reload: () => fetchPage() };
}

const Table: React.FC<{ head: string[]; children: React.ReactNode; state: { loading: boolean; error: string | null; next: string | null; more: () => void; empty: boolean } }> = ({ head, children, state }) => (
  <div className="card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead><tr className="bg-canvas-soft/60 text-left text-xs uppercase tracking-wider text-muted">{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
    {state.error && <p role="alert" className="p-4 text-sm text-rose-800 bg-rose-50">{state.error}</p>}
    {!state.loading && !state.error && state.empty && <p className="p-8 text-center text-muted">Nothing here yet.</p>}
    {(state.loading || state.next) && <div className="p-3 text-center border-t border-line">{state.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted" aria-label="Loading" /> : <button onClick={state.more} className="btn btn-secondary btn-sm">Load more</button>}</div>}
  </div>
);

const System: React.FC = () => {
  const [s, setS] = useState<AdminSystem | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { adminApi.system().then(setS).catch((e: Error) => setErr(e.message)); }, []);
  if (err) return <p role="alert" className="card p-5 text-rose-800">{err}</p>;
  if (!s) return <PageSkeleton />;
  const flag = (on: boolean, label: string) => <div key={label} className="flex items-center justify-between py-2.5"><span>{label}</span><Badge tone={on ? 'success' : 'neutral'} dot>{on ? 'On' : 'Not configured'}</Badge></div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={compact(s.counts.users)} />
        <StatCard label="Active sessions" value={compact(s.counts.activeSessions)} />
        <StatCard label="Stored posts" value={compact(s.counts.contentItems)} />
        <StatCard label="Files" value={compact(s.storage.files)} hint={`${(s.storage.bytes / 1048576).toFixed(1)} MB`} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5"><h3 className="font-bold">Service</h3><div className="mt-2 divide-y divide-line text-sm">
          <div className="flex justify-between py-2.5"><span>Database</span><Badge tone={tone(s.database.status === 'connected' ? 'ok' : 'failed')} dot>{s.database.status}</Badge></div>
          <div className="flex justify-between py-2.5"><span>Environment</span><span className="font-semibold">{s.app.environment}</span></div>
          <div className="flex justify-between py-2.5"><span>Uptime</span><span className="font-semibold tabular">{Math.round(s.app.uptimeSeconds / 60)} min</span></div>
          <div className="flex justify-between py-2.5"><span>Node</span><span className="font-semibold">{s.app.node}</span></div>
        </div></section>
        <section className="card p-5"><h3 className="font-bold">Integrations</h3><div className="mt-2 divide-y divide-line text-sm">
          {flag(s.features.ai.configured, `AI analysis${s.features.ai.model ? ` (${s.features.ai.model})` : ''}`)}
          {flag(s.features.email.configured, 'Email delivery')}
          {flag(s.storage.configured, 'File storage')}
          {flag(s.features.syncWorker, 'Sync worker')}
          {flag(s.features.syncScheduler, 'Sync scheduler')}
          {Object.entries(s.features.oauth).map(([p, on]) => flag(on, `${p[0].toUpperCase()}${p.slice(1)} sign-in`))}
        </div></section>
        <section className="card p-5"><h3 className="font-bold">Connected accounts by status</h3><div className="mt-3 flex flex-wrap gap-2">{Object.entries(s.connectedAccountsByStatus).map(([k, n]) => <Badge key={k} tone={tone(k)}>{k.replace(/_/g, ' ')}: {n}</Badge>)}{Object.keys(s.connectedAccountsByStatus).length === 0 && <span className="text-sm text-muted">None yet.</span>}</div></section>
        <section className="card p-5"><h3 className="font-bold">Sync runs by status</h3><div className="mt-3 flex flex-wrap gap-2">{Object.entries(s.syncRunsByStatus).map(([k, n]) => <Badge key={k} tone={tone(k)}>{k}: {n}</Badge>)}{Object.keys(s.syncRunsByStatus).length === 0 && <span className="text-sm text-muted">None yet.</span>}</div></section>
      </div>
    </div>
  );
};

const Users: React.FC = () => {
  const { user } = useMedia();
  const [q, setQ] = useState(''); const [search, setSearch] = useState(''); const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const p = usePaged((c) => adminApi.users(c, search || undefined), [search]);
  const act = async (id: string, fn: () => Promise<unknown>) => { setBusy(id); setMsg(null); try { await fn(); p.reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); } };
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} className="relative max-w-sm">
        <Search className="w-4 h-4 text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-10 !h-10" placeholder="Search by email" aria-label="Search users" />
      </form>
      {msg && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{msg}</p>}
      <p className="text-sm text-muted">{p.total !== undefined ? `${p.total} users in total` : ''}</p>
      <Table head={['Email', 'Role', 'Status', 'Last sign-in', 'Actions']} state={{ loading: p.loading, error: p.error, next: p.next, more: p.more, empty: p.rows.length === 0 }}>
        {p.rows.map((u) => { const me = u.email === user?.email; return (
          <tr key={u.id}>
            <td className="px-4 py-3 font-medium">{u.email}{me && <span className="ml-2 text-xs text-muted">(you)</span>}</td>
            <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>{u.role}</Badge></td>
            <td className="px-4 py-3"><Badge tone={tone(u.status)} dot>{u.status}</Badge></td>
            <td className="px-4 py-3 text-muted">{timeAgo(u.lastLoginAt)}</td>
            <td className="px-4 py-3"><div className="flex gap-2">
              <button disabled={me || busy === u.id} onClick={() => act(u.id, () => adminApi.setRole(u.id, u.role === 'admin' ? 'user' : 'admin'))} className="btn btn-secondary btn-sm">{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
              <button disabled={me || busy === u.id} onClick={() => act(u.id, () => adminApi.setStatus(u.id, u.status === 'active' ? 'disabled' : 'active'))} className="btn btn-ghost btn-sm">{u.status === 'active' ? 'Disable' : 'Enable'}</button>
            </div></td>
          </tr>); })}
      </Table>
    </div>
  );
};

const Connections: React.FC = () => {
  const p = usePaged((c) => adminApi.connections(c), []); const [note, setNote] = useState<string | null>(null);
  const sync = async (id: string) => { try { const r = await adminApi.syncConnection(id); setNote(r.alreadyQueued ? 'A sync is already queued for that account.' : 'Sync queued.'); } catch (e) { setNote((e as Error).message); } };
  return (
    <div className="space-y-4">
      {note && <p role="status" className="rounded-xl bg-canvas-soft text-sm p-3">{note}</p>}
      <p className="text-sm text-muted">Provider tokens are never shown here.</p>
      <Table head={['Platform', 'Account', 'Status', 'Posts', 'Last synced', 'Last error', '']} state={{ loading: p.loading, error: p.error, next: p.next, more: p.more, empty: p.rows.length === 0 }}>
        {p.rows.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium capitalize">{c.platform}</td><td className="px-4 py-3">{c.handle}</td>
            <td className="px-4 py-3"><Badge tone={tone(c.status)} dot>{c.status.replace(/_/g, ' ')}</Badge></td>
            <td className="px-4 py-3 tabular">{c.dataPointsCount}</td><td className="px-4 py-3 text-muted">{timeAgo(c.lastSyncedAt)}</td>
            <td className="px-4 py-3 text-muted max-w-[220px] truncate" title={c.lastSyncError ?? ''}>{c.lastSyncError ?? '—'}</td>
            <td className="px-4 py-3"><button disabled={!c.active} onClick={() => sync(c.id)} className="btn btn-secondary btn-sm"><RefreshCw className="w-4 h-4" />Sync</button></td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

const Syncs: React.FC = () => {
  const p = usePaged((c) => adminApi.syncRuns(c), []);
  return (
    <Table head={['Queued', 'Platform', 'Type', 'Status', 'Fetched / new / updated / skipped / failed', 'Duration', 'Error']} state={{ loading: p.loading, error: p.error, next: p.next, more: p.more, empty: p.rows.length === 0 }}>
      {p.rows.map((r) => (
        <tr key={r.id}>
          <td className="px-4 py-3 text-muted">{timeAgo(r.queuedAt)}</td><td className="px-4 py-3 capitalize font-medium">{r.platform}</td><td className="px-4 py-3">{r.type}</td>
          <td className="px-4 py-3"><Badge tone={tone(r.status)} dot>{r.status}</Badge></td>
          <td className="px-4 py-3 tabular">{r.items.fetched} / {r.items.created} / {r.items.updated} / {r.items.skipped} / {r.items.failed}</td>
          <td className="px-4 py-3 text-muted tabular">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}</td>
          <td className="px-4 py-3 text-muted max-w-[240px] truncate" title={r.errorSummary ?? ''}>{r.errorSummary ?? '—'}</td>
        </tr>
      ))}
    </Table>
  );
};

const Audit: React.FC = () => {
  const p = usePaged((c) => adminApi.audit(c), []);
  return (
    <Table head={['When', 'Action', 'Target', 'Actor', 'Request ID']} state={{ loading: p.loading, error: p.error, next: p.next, more: p.more, empty: p.rows.length === 0 }}>
      {p.rows.map((a) => (
        <tr key={a.id}>
          <td className="px-4 py-3 text-muted whitespace-nowrap" title={a.createdAt}>{timeAgo(a.createdAt)}</td><td className="px-4 py-3 font-medium">{a.action}</td>
          <td className="px-4 py-3 text-muted">{a.targetType ? `${a.targetType} ${a.targetId ?? ''}` : '—'}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{a.actorId ?? '—'}</td><td className="px-4 py-3 text-muted font-mono text-xs">{a.requestId ?? '—'}</td>
        </tr>
      ))}
    </Table>
  );
};

export const AdminConsole: React.FC = () => {
  const { setAppView, isAdmin } = useMedia();
  const [tab, setTab] = useState<Tab>('system');
  if (!isAdmin) return null;
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-line"><div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4"><BrandLogo /><Badge tone="brand">Admin</Badge></div>
        <button onClick={() => setAppView('app')} className="btn btn-secondary btn-sm"><ArrowLeft className="w-4 h-4" />Back to app</button>
      </div></header>
      <main className="max-w-7xl mx-auto px-5 py-8 space-y-6">
        <div><h1 className="font-display text-3xl font-medium tracking-tight">Admin console</h1><p className="text-body mt-1">Live data from the API. Every action here is recorded in the audit log.</p></div>
        <TabBar tabs={TABS} value={tab} onChange={(t) => setTab(t as Tab)} />
        {tab === 'system' && <System />}{tab === 'users' && <Users />}{tab === 'connections' && <Connections />}{tab === 'syncs' && <Syncs />}{tab === 'audit' && <Audit />}
      </main>
    </div>
  );
};
