import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { fail } from '../lib/response.js';
import { MongoRateLimitStore } from './mongoRateLimitStore.js';

export const createLimiter = (max: number, name = 'general') =>
  rateLimit({
    store: new MongoRateLimitStore(name),
    windowMs: config.rateLimit.windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again later.'),
  });

// Counters live in MongoDB (shared by every API instance); each limiter has its own key prefix.
export const generalLimiter = createLimiter(config.rateLimit.general, 'general');
export const authLimiter = createLimiter(config.rateLimit.auth, 'auth');
export const syncLimiter = createLimiter(config.rateLimit.sync, 'sync');
export const aiLimiter = createLimiter(config.rateLimit.ai, 'ai');
export const uploadLimiter = createLimiter(config.rateLimit.upload, 'upload');
export const adminLimiter = createLimiter(config.rateLimit.admin, 'admin');
