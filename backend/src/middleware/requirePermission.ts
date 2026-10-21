import type { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from '../lib/errors.js';
import { hasPermission } from '../services/permissions.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { toObjectId } from '../lib/ids.js';
import type { Permission } from '../../../shared/admin.js';

export const requirePermission = (permission: Permission) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return next(unauthorized());
    if (!hasPermission(req.auth.role, permission)) {
      await auditRepository.record({ actorId: toObjectId(req.auth.userId), action: 'admin.forbidden', targetType: 'permission', targetId: permission, requestId: req.requestId, ip: req.ip, meta: { method: req.method, route: req.route?.path } });
      return next(forbidden());
    }
    next();
  } catch (error) { next(error); }
};
