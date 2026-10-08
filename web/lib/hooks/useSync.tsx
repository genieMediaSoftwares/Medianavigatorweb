'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { platformName } from '@/lib/platforms';
import { useToast } from '@/components/ui/toast';
import type { Platform, SyncRun } from '@/types/api';

const TERMINAL: SyncRun['status'][] = ['succeeded', 'partial', 'failed', 'cancelled'];
const POLL_MS = 2000;

interface SyncState {
  /** Platforms currently syncing. */
  active: Platform[];
  /** Latest known run per platform, for progress and counts. */
  runs: Partial<Record<Platform, SyncRun>>;
  start: (target: Platform | 'all') => Promise<void>;
}

const Ctx = createContext<SyncState | null>(null);

/** Starts syncs and polls their runs until they finish, then refreshes everything that depends on the data. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [runs, setRuns] = useState<Partial<Record<Platform, SyncRun>>>({});
  const [active, setActive] = useState<Platform[]>([]);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const follow = useCallback(async (run: SyncRun) => {
    let current = run;
    setActive((a) => (a.includes(run.platform) ? a : [...a, run.platform]));
    setRuns((r) => ({ ...r, [run.platform]: current }));
    while (alive.current && !TERMINAL.includes(current.status)) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (!alive.current) return;
      try { current = await api.syncRun(run.id); setRuns((r) => ({ ...r, [run.platform]: current })); } catch { break; }
    }
    setActive((a) => a.filter((p) => p !== run.platform));
    return current;
  }, []);

  const start = useCallback(async (target: Platform | 'all') => {
    try {
      const started: SyncRun[] = target === 'all' ? (await api.syncAll()).syncRuns : [(await api.sync(target)).syncRun];
      if (started.length === 0) { toast.error('Connect an account first, then sync.'); return; }
      const finished = await Promise.all(started.map(follow));
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      for (const run of finished) {
        if (!run) continue;
        const name = platformName(run.platform);
        if (run.status === 'succeeded') toast.success(`${name} is up to date.`);
        else if (run.status === 'partial') toast.error(`${name} finished, but some posts could not be read.`);
        else toast.error(run.errorSummary ? `${name}: ${run.errorSummary}` : `${name} could not be updated.`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not start the update.');
    }
  }, [follow, qc, toast]);

  const value = useMemo(() => ({ active, runs, start }), [active, runs, start]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSync must be used inside <SyncProvider>');
  return v;
}
