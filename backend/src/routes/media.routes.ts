import { Router } from 'express';
import { mediaController as c } from '../controllers/media.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { media as v } from '../validators/index.js';

export const mediaRouter = Router();
mediaRouter.use(authenticate);
mediaRouter.get('/', validate({ query: v.list }), c.list);
mediaRouter.get('/:id', validate({ params: v.params }), c.get);
