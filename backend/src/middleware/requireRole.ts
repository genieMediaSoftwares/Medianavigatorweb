import type { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { Role } from '../types/auth.js';

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth) return next(unauthorized());
  if (!roles.includes(req.auth.role)) return next(forbidden());
  next();
};
