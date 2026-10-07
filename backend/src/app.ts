import express from 'express';
import './config/env.js';
import { vercelPath } from './middleware/vercelPath.js';
import { cors } from './middleware/cors.js';
import { healthCheck } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

const app = express();

app.use(express.json());
app.use(vercelPath);
app.use(healthCheck);
app.use(cors);

// REST APIs (/api/v1)
app.use('/api/v1', apiRouter);

export default app;
export { app };
