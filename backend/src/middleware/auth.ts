import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { unauthorized } from '../lib/errors.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { userRepository } from '../repositories/user.repository.js';

/**
 * Verifies the bearer token, then checks server-side that the session is still valid and the account active.
 * Identity ALWAYS comes from here, never from client-supplied ids.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw unauthorized();

    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const session = await sessionRepository.findActiveById(claims.sessionId);
    if (!session || String(session.userId) !== claims.sub) throw unauthorized('Session is no longer valid');

    const user = await userRepository.findById(claims.sub);
    if (!user || user.status !== 'active' || user.deletedAt) throw unauthorized('Account is not active');

    // Role is read from the database, so a demoted admin loses access immediately even with an old token.
    req.auth = { userId: claims.sub, sessionId: claims.sessionId, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}
