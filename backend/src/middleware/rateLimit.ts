import type { Request } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { fail } from '../lib/response.js';
import { MongoRateLimitStore } from './mongoRateLimitStore.js';

/** Verified identities keep unrelated signed-in users behind a shared web server from sharing a bucket.
 * Anonymous/auth endpoints remain IP limited. This never replaces session authorization. */
export function rateLimitKey(req: Request, name: string): string {
  if (name !== 'auth') {
    if (req.auth?.userId) return `user:${req.auth.userId}`;
    const header = req.header('authorization');
    if (header?.startsWith('Bearer ') && header.length < 8192) {
      try { return `user:${verifyAccessToken(header.slice(7).trim()).sub}`; } catch { /* invalid tokens remain IP limited */ }
    }
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const createLimiter = (max: number, name = 'general') =>
  rateLimit({
    store: new MongoRateLimitStore(name),
    windowMs: config.rateLimit.windowMs,
    limit: max,
    keyGenerator: req => rateLimitKey(req, name),
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
