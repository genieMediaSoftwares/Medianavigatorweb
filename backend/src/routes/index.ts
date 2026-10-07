import { Router } from 'express';
import { router as connections } from './connections.routes.js';
import { router as media } from './media.routes.js';
import { router as intelligence } from './intelligence.routes.js';
import { router as recommendations } from './recommendations.routes.js';
import { router as planner } from './planner.routes.js';
import { router as alerts } from './alerts.routes.js';

// All routes are mounted under /api/v1 by app.ts
export const apiRouter = Router();

apiRouter.use(connections);
apiRouter.use(media);
apiRouter.use(intelligence);
apiRouter.use(recommendations);
apiRouter.use(planner);
apiRouter.use(alerts);
