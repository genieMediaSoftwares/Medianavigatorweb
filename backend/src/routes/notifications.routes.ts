import { Router } from 'express';
import { notificationsController as c } from '../controllers/notifications.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { notifications as v } from '../validators/index.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);
notificationsRouter.get('/', validate({ query: v.list }), c.list);
notificationsRouter.get('/unread-count', c.unreadCount);
notificationsRouter.post('/read-all', c.markAllRead);
notificationsRouter.post('/:id/read', validate({ params: v.idParams }), c.markRead);
