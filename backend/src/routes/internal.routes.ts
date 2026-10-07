import { Router } from 'express';
import { config } from '../config/env.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, unavailable } from '../lib/errors.js';
import { timingSafeEqualStr } from '../lib/crypto.js';
import { ok } from '../lib/response.js';
import { enqueueDueSyncs } from '../jobs/sync/scheduler.js';
import { processBatch } from '../jobs/sync/worker.js';

/**
 * Trigger for an external scheduler (e.g. a Render Cron Job) when no always-on worker is available.
 * Protected by a shared secret from configuration; it is not a user-facing endpoint.
 */
export const internalRouter = Router();
internalRouter.post('/jobs/run', asyncHandler(async (req, res) => {
  const secret = config.sync.triggerSecret;
  if (!secret) throw unavailable('External job trigger is not enabled (JOBS_TRIGGER_SECRET is not set)');
  const given = req.header('x-jobs-secret') ?? '';
  if (!timingSafeEqualStr(given, secret)) throw forbidden();
  const queued = await enqueueDueSyncs();
  const processed = await processBatch(config.sync.timeoutMs);
  ok(res, { queued, processed });
}));
