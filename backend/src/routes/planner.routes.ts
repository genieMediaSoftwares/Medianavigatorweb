import { Router } from 'express';
import { plannerController as c } from '../controllers/planner.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { planner as v } from '../validators/index.js';

export const plannerRouter = Router();
plannerRouter.use(authenticate);
plannerRouter.get('/', c.list);
plannerRouter.get('/insights', c.insights);
plannerRouter.post('/', validate({ body: v.create }), c.create);
plannerRouter.delete('/:id', validate({ params: v.idParams }), c.remove);
