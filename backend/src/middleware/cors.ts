import cors from 'cors';
import { config } from '../config/env.js';

const allowed = new Set(config.cors.allowedOrigins);

/** Browsers must come from a configured origin. Native mobile clients send no Origin header and are not affected by CORS. */
export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin || allowed.has(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
});
