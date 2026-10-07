import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { databaseHealth } from '../db/client.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ success: true, data: { service: 'Media Navigator API', status: 'running', health: '/health' } });
});

/** Truthful health: reports the database as connected only after a successful ping. Public output contains no diagnostics. */
healthRouter.get('/health', asyncHandler(async (_req, res) => {
  const database = await databaseHealth();
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({ success: healthy, data: { status: healthy ? 'ok' : 'degraded', application: 'running', database, uptimeSeconds: Math.round(process.uptime()) } });
}));
