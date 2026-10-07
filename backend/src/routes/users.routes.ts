import { Router } from 'express';
import { usersController as c } from '../controllers/users.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { users as v } from '../validators/index.js';

export const usersRouter = Router();
usersRouter.use(authenticate);
usersRouter.get('/me', c.me);
usersRouter.get('/me/sessions', c.sessions);
usersRouter.delete('/me/sessions/:id', validate({ params: v.sessionParams }), c.revokeSession);
usersRouter.delete('/me', authLimiter, validate({ body: v.deleteAccount }), c.deleteAccount);

export const profilesRouter = Router();
profilesRouter.use(authenticate);
profilesRouter.get('/me', c.me);
profilesRouter.patch('/me', validate({ body: v.profile }), c.updateProfile);
