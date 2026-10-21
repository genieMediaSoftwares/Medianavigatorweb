import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { AppError, unauthorized } from '../lib/errors.js';
import { isStaffRole } from '../../../shared/admin.js';

/** High-risk actions need the session to have re-confirmed its credentials (POST /auth/reauth) within the last few minutes. */
export function requireRecentAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  const at = req.auth.reauthAt?.getTime() ?? 0;
  if (Date.now() - at > config.auth.stepUpMaxAgeSeconds * 1000) {
    return next(new AppError('REAUTH_REQUIRED', 'Confirm your password to continue. This keeps sensitive changes safe if a signed-in device is left unattended.'));
  }
  next();
}

/** When STAFF_MFA_REQUIRED is on, staff must enrol in two-step sign-in before using administrative endpoints. */
export function requireStaffMfa(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  if (config.auth.staffMfaRequired && isStaffRole(req.auth.role) && !req.auth.mfaEnabled) {
    return next(new AppError('MFA_ENROLLMENT_REQUIRED', 'Set up two-step sign-in in Security before using administration.'));
  }
  next();
}
