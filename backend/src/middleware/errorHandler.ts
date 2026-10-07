import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/response.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error('request failed', { requestId: req.requestId, code: err.code, error: err });
    return fail(res, err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return fail(res, 422, 'VALIDATION_ERROR', 'Request validation failed', err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  if (err?.type === 'entity.too.large') return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) return fail(res, 400, 'BAD_REQUEST', 'Malformed JSON body');
  if (err?.code === 'LIMIT_FILE_SIZE') return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'File exceeds the maximum allowed size');
  if (err?.name === 'MulterError') return fail(res, 400, 'BAD_REQUEST', 'Invalid file upload');
  if (err?.code === 11000) return fail(res, 409, 'CONFLICT', 'A record with these values already exists');
  if (err instanceof mongoose.Error.CastError) return fail(res, 400, 'BAD_REQUEST', 'Invalid identifier');
  if (err instanceof mongoose.Error.ValidationError) return fail(res, 422, 'VALIDATION_ERROR', 'Request validation failed');
  if (err?.name === 'MongoServerSelectionError' || err?.name === 'MongoNetworkError') {
    logger.error('database unavailable', { requestId: req.requestId, error: err });
    return fail(res, 503, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable');
  }

  logger.error('unhandled error', { requestId: req.requestId, error: err });
  fail(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
