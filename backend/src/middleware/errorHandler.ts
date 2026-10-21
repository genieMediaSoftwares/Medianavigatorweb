import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/response.js';
import { logger } from '../lib/logger.js';
import { SystemError } from '../models/AdminTelemetry.js';

export function notFoundHandler(req: Request, res: Response) {
  fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  const serverStatus = err instanceof AppError ? err.status : (err?.name === 'MongoServerSelectionError' || err?.name === 'MongoNetworkError') ? 503 : 500;
  const expectedClientError = err instanceof ZodError || err instanceof SyntaxError || (typeof err?.type === 'string' && err.type.startsWith('entity.')) || err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE' || err?.code === 11000 || err instanceof mongoose.Error.CastError || err instanceof mongoose.Error.ValidationError;
  if (serverStatus >= 500 && !expectedClientError && mongoose.connection.readyState === 1) {
    void SystemError.create({ code: err instanceof AppError ? err.code : 'INTERNAL_ERROR', status: serverStatus, method: req.method, route: `${req.baseUrl}${req.route?.path ?? '/unmatched'}`, requestId: req.requestId }).catch(() => logger.warn('Error metadata could not be recorded'));
  }

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
