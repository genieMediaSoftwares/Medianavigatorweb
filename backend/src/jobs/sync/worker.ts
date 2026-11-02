import { startPollLoop } from '../pollLoop.js';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { syncService } from '../../services/sync.service.js';
import { recordHeartbeat } from '../heartbeat.js';

/** Drains the queue until empty or the time budget is used. */
export async function processBatch(budgetMs: number): Promise<number> {
  const deadline = Date.now() + budgetMs;
  let n = 0;
  while (Date.now() < deadline && (await syncService.runOne())) n++;
  return n;
}

/** Long-poll loop. Durable: the queue is in MongoDB, so a restart only delays work; expired leases are re-claimed. */
export function startWorker(): () => Promise<void> {
  return startPollLoop(async () => { const did = await syncService.runOne(); await recordHeartbeat('social_sync'); return did; }, config.sync.workerPollMs, error => logger.error('sync worker iteration failed', { error }));
}
