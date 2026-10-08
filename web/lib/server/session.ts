import 'server-only';
import type { NextRequest } from 'next/server';

export const ACCESS_COOKIE = 'mn_at';
export const REFRESH_COOKIE = 'mn_rt';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/** Cookies are `Secure` whenever the request itself arrived over HTTPS (directly or behind a proxy). */
export function isHttps(req: NextRequest): boolean {
  const forwarded = req.headers.get('x-forwarded-proto');
  return (forwarded ? forwarded.split(',')[0]?.trim() : req.nextUrl.protocol.replace(':', '')) === 'https';
}

export function cookieHeaders(tokens: Tokens, secure: boolean): string[] {
  const base = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  return [
    `${ACCESS_COOKIE}=${tokens.accessToken}; Max-Age=${tokens.expiresIn}; ${base}`,
    `${REFRESH_COOKIE}=${tokens.refreshToken}; Max-Age=${tokens.refreshExpiresIn}; ${base}`,
  ];
}

export function clearCookieHeaders(secure: boolean): string[] {
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
  return [`${ACCESS_COOKIE}=; ${base}`, `${REFRESH_COOKIE}=; ${base}`];
}
