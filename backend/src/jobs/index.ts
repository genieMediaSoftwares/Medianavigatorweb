import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { enqueueDueSyncs, schedulerIntervalMs } from './sync/scheduler.js';
import { startWorker } from './sync/worker.js';
import { deepV2Jobs } from '../services/ai/deepV2.jobs.js';
import { sendDueReminders } from './planner/reminders.js';
import { accountDeletion } from '../services/accountDeletion.service.js';
import { startPeriodic } from './periodic.js';

/**
 * Starts the in-process scheduler/worker according to configuration. Both only coordinate through MongoDB
 * (unique active-run index + leases), so they can later be moved to a separate process/instance unchanged.
 * NOTE: an in-process loop only runs while the web instance is awake. See docs/deployment.md for the Render options.
 */
export function startJobs(options: { dedicated?: boolean } = {}): () => void {
  const stops: Array<() => void> = [];
  if (options.dedicated || config.sync.deepWorkerEnabled) stops.push(startPeriodic('deep_analysis', 2000, () => deepV2Jobs.runOne()));
  if (options.dedicated || config.sync.cleanupWorkerEnabled) stops.push(startPeriodic('account_cleanup', 5000, () => accountDeletion.runOne()));
  if (options.dedicated || config.sync.schedulerEnabled) {
    stops.push(startPeriodic('sync_scheduler', schedulerIntervalMs(), () => enqueueDueSyncs()));
    logger.info('sync scheduler enabled');
    // Plan reminders ride on the same scheduler switch: one instance with the scheduler on delivers them.
    stops.push(startPeriodic('planner_reminders', 60_000, () => sendDueReminders()));
    logger.info('plan reminders enabled');
  }
  if (options.dedicated || config.sync.workerEnabled) {
    stops.push(startWorker());
    logger.info('sync worker enabled');
  }
  return () => stops.forEach((s) => s());
}
