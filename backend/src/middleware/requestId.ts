import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

const SAFE = /^[A-Za-z0-9._-]{8,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && SAFE.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || req.path,
      status: res.statusCode,
      durationMs,
      userId: req.auth?.userId,
    });
  });
  next();
}
