import { startPollLoop } from './pollLoop.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { enqueueDueSyncs, schedulerIntervalMs } from './sync/scheduler.js';
import { startWorker } from './sync/worker.js';
import { startDeepV2Worker } from '../services/ai/deepV2.jobs.js';
import { sendDueReminders } from './planner/reminders.js';

/**
 * Starts the in-process scheduler/worker according to configuration. Both only coordinate through MongoDB
 * (unique active-run index + leases), so they can later be moved to a separate process/instance unchanged.
 * NOTE: an in-process loop only runs while the web instance is awake. See docs/deployment.md for the Render options.
 */
export function startJobs(): () => Promise<void> {
  const stops: Array<() => Promise<void>> = [];
  if (config.ai.workerEnabled) stops.push(startDeepV2Worker());
  if (config.sync.schedulerEnabled) {
    stops.push(startPollLoop(() => enqueueDueSyncs(), schedulerIntervalMs(), error => logger.error('scheduler tick failed', { error })));
    logger.info('sync scheduler enabled');
    // Plan reminders ride on the same scheduler switch: one instance with the scheduler on delivers them.
    stops.push(startPollLoop(() => sendDueReminders(), 60_000, error => logger.error('plan reminder tick failed', { error })));
    logger.info('plan reminders enabled');
  }
  if (config.sync.workerEnabled) {
    stops.push(startWorker());
    logger.info('sync worker enabled');
  }
  return async () => { await Promise.all(stops.map(stop => stop())); };
}
