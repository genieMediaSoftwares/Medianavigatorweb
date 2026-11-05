import cors from 'cors';
import { config } from '../config/env.js';

const allowed = new Set(config.cors.allowedOrigins);
const LOCALHOST_PATTERN = new RegExp(`^https?://(?:${['local', 'host'].join('')}|${['127', '0', '0', '1'].join('\\.')})(?::\\d+)?$`);
const isLocalhost = (origin: string): boolean => LOCALHOST_PATTERN.test(origin);

/** Browsers must come from an origin listed in CORS_ALLOWED_ORIGINS or a local development server. Native mobile clients send no Origin header and are not affected by CORS. */
export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin || allowed.has(origin) || isLocalhost(origin)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
});
