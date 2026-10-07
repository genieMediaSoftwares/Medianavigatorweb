import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { fail } from '../lib/response.js';

export const createLimiter = (max: number) =>
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again later.'),
  });

// Created once per process. Counters live in process memory: with several API instances each enforces its own
// window. Move to a shared store (e.g. Redis) when running more than one instance and strict global limits matter.
export const generalLimiter = createLimiter(config.rateLimit.general);
export const authLimiter = createLimiter(config.rateLimit.auth);
export const syncLimiter = createLimiter(config.rateLimit.sync);
export const aiLimiter = createLimiter(config.rateLimit.ai);
export const uploadLimiter = createLimiter(config.rateLimit.upload);
export const adminLimiter = createLimiter(config.rateLimit.admin);
