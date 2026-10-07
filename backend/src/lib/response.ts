import type { Response } from 'express';

export interface PageMeta {
  limit: number;
  nextCursor?: string | null;
  page?: number;
  total?: number;
}

export function ok<T>(res: Response, data: T, status = 200, meta?: PageMeta) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } });
}
