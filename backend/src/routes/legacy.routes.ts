import { Router } from 'express';
import { connectionsController as conn } from '../controllers/connections.controller.js';
import { intelligenceController as intel } from '../controllers/intelligence.controller.js';
import { plannerController as plan } from '../controllers/planner.controller.js';
import { notificationsController as notif } from '../controllers/notifications.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { syncLimiter } from '../middleware/rateLimit.js';
import { connections as cv, planner as pv, notifications as nv } from '../validators/index.js';

/**
 * Compatibility paths used by the existing web client (/api/v1/workspaces, /analytics/overview, /timing, /trends, ...).
 * They call the same controllers as the canonical resource routes, and they are authenticated like everything else.
 */
export const legacyRouter = Router();
legacyRouter.get('/workspaces', authenticate, intel.workspace);
legacyRouter.get('/analytics/overview', authenticate, intel.overview);
legacyRouter.get('/timing', authenticate, intel.timing);
legacyRouter.get('/recommendations', authenticate, intel.recommendations);
legacyRouter.post('/recommendations/:id/plan', authenticate, validate({ params: pv.recParams, body: pv.plan }), plan.planRecommendation);
legacyRouter.get('/trends', authenticate, intel.trends);
legacyRouter.get('/alerts', authenticate, notif.alerts);
legacyRouter.post('/alerts/:id/dismiss', authenticate, validate({ params: nv.idParams }), notif.dismissAlert);
legacyRouter.post('/youtube/fetch-channel', authenticate, syncLimiter, validate({ body: cv.lookup }), conn.youtubeLookup);
