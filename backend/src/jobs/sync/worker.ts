import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { syncService } from '../../services/sync.service.js';

let running = false;

/** Drains the queue until empty or the time budget is used. */
export async function processBatch(budgetMs: number): Promise<number> {
  const deadline = Date.now() + budgetMs;
  let n = 0;
  while (Date.now() < deadline && (await syncService.runOne())) n++;
  return n;
}

/** Long-poll loop. Durable: the queue is in MongoDB, so a restart only delays work; expired leases are re-claimed. */
export function startWorker(): () => void {
  running = true;
  const loop = async () => {
    while (running) {
      try {
        const did = await syncService.runOne();
        if (!did) await new Promise((r) => setTimeout(r, config.sync.workerPollMs));
      } catch (err) {
        logger.error('sync worker iteration failed', { error: err });
        await new Promise((r) => setTimeout(r, config.sync.workerPollMs));
      }
    }
  };
  void loop();
  return () => { running = false; };
}
