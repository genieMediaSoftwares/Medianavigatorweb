import { logger } from '../lib/logger.js';
import { recordHeartbeat } from './heartbeat.js';

/** Immediate first run, no overlapping ticks, bounded retries at the normal interval. */
export function startPeriodic(task: string, intervalMs: number, run: () => Promise<unknown>): () => void {
  let busy = false, stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try { await run(); await recordHeartbeat(task); }
    catch { logger.error('background task iteration failed', { operation: task }); }
    finally { busy = false; }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}
