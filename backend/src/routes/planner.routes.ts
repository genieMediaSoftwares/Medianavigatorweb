import { Router } from 'express';
import { plannerController as c } from '../controllers/planner.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { planner as v } from '../validators/index.js';

export const plannerRouter = Router();
plannerRouter.use(authenticate);
plannerRouter.get('/', c.list);
plannerRouter.get('/insights', c.insights);
plannerRouter.get('/best-times', validate({ query: v.bestTimes }), c.bestTimes);
// Planner V2: dated plans by range, or undated ideas/drafts.
plannerRouter.get('/plans', validate({ query: v.list }), c.listPlans);
plannerRouter.post('/', validate({ body: v.create }), c.create);
plannerRouter.get('/:id', validate({ params: v.idParams }), c.get);
plannerRouter.patch('/:id', validate({ params: v.idParams, body: v.update }), c.update);
plannerRouter.post('/:id/status', validate({ params: v.idParams, body: v.status }), c.setStatus);
plannerRouter.post('/:id/publish', validate({ params: v.idParams, body: v.publish }), c.publish);
plannerRouter.get('/:id/matches', validate({ params: v.idParams }), c.matches);
plannerRouter.get('/:id/review', validate({ params: v.idParams }), c.review);
plannerRouter.delete('/:id', validate({ params: v.idParams }), c.remove);
