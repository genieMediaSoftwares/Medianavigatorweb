import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { enqueueDueSyncs, schedulerIntervalMs } from './sync/scheduler.js';
import { startWorker } from './sync/worker.js';

/**
 * Starts the in-process scheduler/worker according to configuration. Both only coordinate through MongoDB
 * (unique active-run index + leases), so they can later be moved to a separate process/instance unchanged.
 * NOTE: an in-process loop only runs while the web instance is awake. See docs/deployment.md for the Render options.
 */
export function startJobs(): () => void {
  const stops: Array<() => void> = [];
  if (config.sync.schedulerEnabled) {
    const t = setInterval(() => { enqueueDueSyncs().catch((err) => logger.error('scheduler tick failed', { error: err })); }, schedulerIntervalMs());
    stops.push(() => clearInterval(t));
    logger.info('sync scheduler enabled');
  }
  if (config.sync.workerEnabled) {
    stops.push(startWorker());
    logger.info('sync worker enabled');
  }
  return () => stops.forEach((s) => s());
}
