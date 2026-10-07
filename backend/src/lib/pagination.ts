import { z } from 'zod';
import { config } from '../config/env.js';
import { badRequest } from './errors.js';

export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(config.database.queryMaxLimit).optional(),
  cursor: z.string().max(300).optional(),
});

export const DEFAULT_LIMIT = Math.min(25, config.database.queryMaxLimit);
export const clampLimit = (n?: number) => Math.min(Math.max(n ?? DEFAULT_LIMIT, 1), config.database.queryMaxLimit);

export function encodeCursor(payload: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor<T extends Record<string, string | number>>(cursor?: string): T | undefined {
  if (!cursor) return undefined;
  try {
    const v = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (v && typeof v === 'object') return v as T;
  } catch { /* fallthrough */ }
  throw badRequest('Invalid cursor');
}
