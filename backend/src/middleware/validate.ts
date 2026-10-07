import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Validates (and replaces) body/query/params with the parsed, typed values. Unknown keys are rejected by the schemas. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(
          new AppError('VALIDATION_ERROR', 'Request validation failed', result.error.issues.map((i) => ({ in: part, path: i.path.join('.'), message: i.message }))),
        );
      }
      (req as any)[part] = result.data;
    }
    next();
  };
}

/** Drops keys that could be interpreted as MongoDB operators ($...) or dotted paths from untrusted input. */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  for (const part of ['body', 'query', 'params'] as const) {
    if (req[part] && typeof req[part] === 'object') (req as any)[part] = strip(req[part]);
  }
  next();
}

function strip(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) return value.map((v) => strip(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = strip(v, depth + 1);
    }
    return out;
  }
  return value;
}
