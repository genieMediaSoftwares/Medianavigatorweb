import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, PlugZap, Rocket, TrendingDown, Lock } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api } from '../../services/api';
import { AlertItem } from '../../types';
import { Badge, PageSkeleton, timeAgo } from '../../components/ui';
import { EmptyState } from '../../components/common/EmptyState';

const iconFor = (a: AlertItem) => {
  if (a.type === 'Performance spike') return <Rocket className="w-5 h-5" />;
  if (/expired|reconnect/i.test(a.title)) return <PlugZap className="w-5 h-5" />;
  if (/permission/i.test(a.title)) return <Lock className="w-5 h-5" />;
  return <TrendingDown className="w-5 h-5" />;
};
const tint = (s: AlertItem['severity']) => (s === 'high' ? 'bg-rose-50 text-rose-600' : s === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600');

export const Alerts: React.FC = () => {
  const { setCurrentTab, connections, refreshAlerts } = useMedia();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.getAlerts().then(setAlerts).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [connections]);

  const markRead = async (id: string) => {
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, read: true } : x)));
    try { await api.dismissAlert(id); await refreshAlerts(); } catch (e) { setError((e as Error).message); }
  };

  if (loading) return <PageSkeleton />;
  if (error && alerts.length === 0) return <EmptyState type="no_data" title="We couldn’t load alerts" description={error} actionText="Try again" onAction={() => window.location.reload()} />;

  const unread = alerts.filter((a) => !a.read);
  const read = alerts.filter((a) => a.read);

  if (alerts.length === 0) {
    return (
      <div className="card px-6 py-16 text-center max-w-2xl mx-auto">
        <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto"><BellOff className="w-7 h-7" /></span>
        <h3 className="mt-5 font-display text-3xl font-medium tracking-tight">All quiet</h3>
        <p className="mt-2 text-body max-w-md mx-auto">We’ll tell you here when a post takes off, results change sharply, or a connection needs your attention.</p>
      </div>
    );
  }

  const Item: React.FC<{ a: AlertItem }> = ({ a }) => (
    <li className={`card p-5 flex gap-4 ${a.read ? 'opacity-70' : ''}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tint(a.severity)}`}>{iconFor(a)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink leading-snug">{a.title}</h3>{!a.read && a.severity === 'high' && <Badge tone="danger">Important</Badge>}</div>
        <p className="mt-1 text-sm text-body">{a.description}</p>
        {a.investigationNotes && <p className="mt-1 text-sm text-muted">{a.investigationNotes}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">{timeAgo(a.timestamp)}</span>
          {/expired|reconnect|permission/i.test(a.title) ? <button onClick={() => setCurrentTab('connections')} className="text-sm font-semibold text-brand-700 hover:underline">Fix in Connections</button>
            : <button onClick={() => setCurrentTab('content')} className="text-sm font-semibold text-brand-700 hover:underline">View posts</button>}
          {!a.read && <button onClick={() => markRead(a.id)} className="text-sm font-semibold text-body hover:text-ink inline-flex items-center gap-1"><CheckCheck className="w-4 h-4" />Mark as read</button>}
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</p>}
      <section>
        <h3 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-600" />New {unread.length > 0 && <span className="text-muted font-medium">({unread.length})</span>}</h3>
        {unread.length === 0 ? <p className="card p-6 text-body">You’re all caught up.</p> : <ul className="space-y-3">{unread.map((a) => <Item key={a.id} a={a} />)}</ul>}
      </section>
      {read.length > 0 && <section><h3 className="text-lg font-bold tracking-tight mb-3 text-body">Earlier</h3><ul className="space-y-3">{read.map((a) => <Item key={a.id} a={a} />)}</ul></section>}
    </div>
  );
};
