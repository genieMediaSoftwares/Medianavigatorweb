'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { isRunFinished, PLATFORM_LABEL } from '@/lib/copy';
import { connectedOnly, useConnections, useMe } from '@/lib/hooks';
import { useToast } from '@/components/ui/Toast';
import { createPref } from '@/lib/prefs';
import { PLATFORMS } from '@/lib/api/schemas';
import type { Platform, SyncRun } from '@/types/api';

// ---------------------------------------------------------------- channel filter

type Channel = Platform | 'all';
const ChannelContext = createContext<{ channel: Channel; setChannel: (c: Channel) => void; connected: Platform[] } | null>(null);
const channelPref = createPref<Channel>('mn-channel', (v): v is Channel => v === 'all' || (PLATFORMS as readonly string[]).includes(v), 'all');

/** "All channels / one channel" filter. Only connected channels can be chosen; remembered per device. */
export function ChannelProvider({ children }: { children: ReactNode }) {
  const { data } = useConnections();
  const connected = useMemo(() => connectedOnly(data).map((c) => c.platform), [data]);
  const stored = channelPref.use();
  const setChannel = useCallback((c: Channel) => channelPref.set(c), []);

  // A channel that is no longer connected is never shown on its own.
  const channel: Channel = stored !== 'all' && data && !connected.includes(stored) ? 'all' : stored;
  return <ChannelContext value={{ channel, setChannel, connected }}>{children}</ChannelContext>;
}

export function useChannel() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error('useChannel must be used within ChannelProvider');
  return ctx;
}

// ---------------------------------------------------------------- sync runs

interface SyncState {
  /** Latest known state of every run started in this visit (most recent first). */
  runs: SyncRun[];
  active: SyncRun[];
  track: (runs: SyncRun[]) => void;
  clearFinished: () => void;
}
const SyncContext = createContext<SyncState | null>(null);

/**
 * Polls GET /connections/sync-runs/:id for each run started here until it finishes, then refreshes everything that
 * depends on synced content. Polling stops on its own when a run reaches a final state.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const toast = useToast();
  const [tracked, setTracked] = useState<SyncRun[]>([]);
  // Runs whose result was already announced; a ref, because it only guards side effects.
  const announced = useRef(new Set<string>());

  const results = useQueries({
    queries: tracked.map((run) => ({
      queryKey: qk.syncRun(run.id),
      queryFn: () => connectionsApi.syncRun(run.id),
      initialData: run,
      staleTime: 0,
      refetchInterval: (q: { state: { data?: SyncRun } }) => (q.state.data && isRunFinished(q.state.data.status) ? false : 2000),
    })),
  });

  const runs = useMemo(() => results.map((r, i) => r.data ?? tracked[i]), [results, tracked]);

  useEffect(() => {
    const done = runs.filter((r) => isRunFinished(r.status) && !announced.current.has(r.id));
    if (done.length === 0) return;
    for (const r of done) announced.current.add(r.id);
    void client.invalidateQueries({ queryKey: qk.connections });
    void client.invalidateQueries({ queryKey: qk.intelligence });
    void client.invalidateQueries({ queryKey: ['media'] });
    void client.invalidateQueries({ queryKey: qk.notifications });
    for (const r of done) {
      const name = PLATFORM_LABEL[r.platform];
      if (r.status === 'succeeded') toast(`${name} import finished: ${r.items.created} new, ${r.items.updated} updated.`);
      else if (r.status === 'partial') toast(`${name} import finished, but the platform didn't return everything. Some results may be missing.`, 'error');
      else if (r.status === 'failed') toast(`${name} import failed. ${r.errorSummary ?? 'Please try again later.'}`, 'error');
    }
  }, [runs, client, toast]);

  const track = useCallback((incoming: SyncRun[]) => {
    setTracked((prev) => [...incoming, ...prev.filter((p) => !incoming.some((i) => i.id === p.id))].slice(0, 12));
  }, []);
  const clearFinished = useCallback(() => setTracked((prev) => prev.filter((r) => !isRunFinished(r.status))), []);

  const value = useMemo(() => ({ runs, active: runs.filter((r) => !isRunFinished(r.status)), track, clearFinished }), [runs, track, clearFinished]);
  return <SyncContext value={value}>{children}</SyncContext>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

// ---------------------------------------------------------------- user

/** The signed-in user's saved time zone (null until they set one). */
export function useTimezone(): string | null {
  return useMe().data?.profile?.timezone ?? null;
}
