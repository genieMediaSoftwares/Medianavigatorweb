import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { corsMiddleware } from './middleware/cors.js';
import { sanitizeInput } from './middleware/validate.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

/** Builds the Express app. No side effects: nothing connects or listens until server.ts says so. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.server.trustProxyHops); // number of reverse proxies in front (Render = 1)

  app.use(requestId);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: config.server.bodyLimit }));
  app.use(sanitizeInput);

  app.use('/', healthRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
