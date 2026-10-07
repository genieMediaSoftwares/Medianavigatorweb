import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { connectionRepository } from '../../repositories/connection.repository.js';
import { syncService } from '../../services/sync.service.js';

/** Queues a `scheduled` run for every live account whose nextSyncAt has passed. Safe to call from many instances at once. */
export async function enqueueDueSyncs(limit = 200): Promise<number> {
  const due = await connectionRepository.findDue(new Date(), limit);
  let queued = 0;
  for (const acc of due) {
    const { created } = await syncService.enqueue(acc, 'scheduled');
    if (created) queued++;
  }
  if (queued) logger.info('scheduled syncs queued', { operation: 'scheduler', queued });
  return queued;
}

export const schedulerIntervalMs = () => Math.min(config.sync.intervalMinutes * 60_000, 60_000);
