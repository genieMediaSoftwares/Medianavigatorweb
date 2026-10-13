import { useCallback, useEffect, useRef, useState } from 'react';

import type { Platform, SyncRun } from '@/types/api';

import { fetchSyncRun, syncAllPlatforms, syncPlatform } from './api';

const TERMINAL: SyncRun['status'][] = ['succeeded', 'partial', 'failed', 'cancelled'];
const POLL_MS = 2000;

/**
 * Starts syncs and polls GET /connections/sync-runs/:id until each run finishes.
 * `onFinished` receives the final runs so the screen can reload what depends on the data.
 */
export function useSync(onFinished: (runs: SyncRun[]) => void) {
  const [active, setActive] = useState<Platform[]>([]);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const finished = useRef(onFinished);

  useEffect(() => {
    finished.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const follow = useCallback(async (run: SyncRun): Promise<SyncRun> => {
    let current = run;
    while (alive.current && !TERMINAL.includes(current.status)) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (!alive.current) break;
      current = await fetchSyncRun(run.id);
    }
    return current;
  }, []);

  const start = useCallback(
    async (target: Platform | 'all') => {
      setError(null);
      try {
        const runs = target === 'all' ? (await syncAllPlatforms()).syncRuns : [(await syncPlatform(target)).syncRun];
        if (runs.length === 0) {
          setError('Connect an account first, then sync.');
          return;
        }
        setActive((current) => [...new Set([...current, ...runs.map((r) => r.platform)])]);
        const done = await Promise.all(runs.map(follow));
        if (!alive.current) return;
        const failed = done.filter((r) => r.status === 'failed' || r.status === 'cancelled');
        if (failed.length) setError(failed.map((r) => r.errorSummary).filter(Boolean).join(' ') || 'The update did not finish.');
        finished.current(done);
      } catch (e) {
        if (alive.current) setError(e instanceof Error ? e.message : 'We could not start the update.');
      } finally {
        if (alive.current) setActive([]);
      }
    },
    [follow],
  );

  return { active, error, start };
}
