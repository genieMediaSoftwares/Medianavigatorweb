import { Router } from 'express';
import { adminController as c } from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { adminLimiter } from '../middleware/rateLimit.js';
import { admin as v } from '../validators/index.js';

export const adminRouter = Router();
adminRouter.use(adminLimiter, authenticate, requireRole('admin'));
adminRouter.get('/system', c.system);
adminRouter.get('/users', validate({ query: v.users }), c.users);
adminRouter.get('/users/:id', validate({ params: v.idParams }), c.user);
adminRouter.patch('/users/:id/role', validate({ params: v.idParams, body: v.role }), c.setRole);
adminRouter.patch('/users/:id/status', validate({ params: v.idParams, body: v.status }), c.setStatus);
adminRouter.get('/connections', validate({ query: v.connections }), c.connections);
adminRouter.post('/connections/:id/sync', validate({ params: v.idParams }), c.triggerSync);
adminRouter.get('/sync-runs', validate({ query: v.syncRuns }), c.syncRuns);
adminRouter.get('/audit-logs', validate({ query: v.audit }), c.audit);
