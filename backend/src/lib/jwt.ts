import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { Role } from '../types/auth.js';

export interface AccessClaims {
  sub: string;
  sessionId: string;
  role: Role;
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, config.auth.jwtSecret, { algorithm: 'HS256', expiresIn: config.auth.accessTtlSeconds });
}

/** Throws on any invalid, expired or wrongly-signed token. */
export function verifyAccessToken(token: string): AccessClaims {
  const decoded = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.sub || !decoded.sessionId || !decoded.role) throw new Error('Malformed token');
  return { sub: String(decoded.sub), sessionId: String(decoded.sessionId), role: decoded.role as Role };
}
