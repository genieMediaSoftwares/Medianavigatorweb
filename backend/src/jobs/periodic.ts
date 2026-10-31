import { logger } from '../lib/logger.js';
import { recordHeartbeat } from './heartbeat.js';
import { startPollLoop } from './pollLoop.js';

/** Immediate first run, no overlapping ticks, bounded retries at the normal interval. */
export function startPeriodic(task: string, intervalMs: number, run: () => Promise<unknown>): () => Promise<void> {
  return startPollLoop(async () => { await run(); await recordHeartbeat(task); }, intervalMs,
    () => logger.error('background task iteration failed', { operation: task }));
}
