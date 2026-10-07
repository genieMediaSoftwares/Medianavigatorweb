import { Router } from 'express';
import { connectionsController as c } from '../controllers/connections.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { syncLimiter, authLimiter } from '../middleware/rateLimit.js';
import { connections as v } from '../validators/index.js';

export const connectionsRouter = Router();

// Public: the provider redirects the browser here. Identity comes from the single-use state, not from a header.
connectionsRouter.get('/oauth/:platform/callback', authLimiter, validate({ params: v.platformParams, query: v.oauthCallback }), c.oauthCallback);

connectionsRouter.use(authenticate);
connectionsRouter.get('/', c.list);
connectionsRouter.post('/sync-all', syncLimiter, c.syncAll);
connectionsRouter.get('/sync-runs/:id', validate({ params: v.runParams }), c.syncRun);
connectionsRouter.get('/:platform/capabilities', validate({ params: v.platformParams }), c.capabilities);
connectionsRouter.post('/:platform/oauth/start', syncLimiter, validate({ params: v.platformParams }), c.oauthStart);
connectionsRouter.post('/:platform/connect', syncLimiter, validate({ params: v.platformParams, body: v.connect }), c.connect);
connectionsRouter.post('/:platform/sync', syncLimiter, validate({ params: v.platformParams }), c.sync);
connectionsRouter.post('/:platform/disconnect', validate({ params: v.platformParams }), c.disconnect);
connectionsRouter.delete('/:platform', validate({ params: v.platformParams }), c.disconnect);
