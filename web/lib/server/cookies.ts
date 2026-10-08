import 'server-only';
import type { NextResponse } from 'next/server';
import { getEnv } from '@/env';

/**
 * Auth cookies. Both are httpOnly, so page scripts can never read a token.
 * - ACCESS: the short-lived API access token. Expires slightly before the token itself, so it is refreshed before it fails.
 * - REFRESH: the rotating refresh token. Its presence is also what proxy.ts uses to decide whether to show private pages.
 */
export const ACCESS_COOKIE = 'mn_at';
export const REFRESH_COOKIE = 'mn_rt';

/** Seconds shaved off the access cookie lifetime so a token is never sent within moments of expiring. */
const ACCESS_EARLY_EXPIRY_SECONDS = 30;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

const base = () => ({ httpOnly: true, secure: getEnv().cookieSecure, sameSite: 'lax' as const, path: '/' });

export function setAuthCookies(res: NextResponse, tokens: TokenPair): void {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...base(), maxAge: Math.max(1, tokens.expiresIn - ACCESS_EARLY_EXPIRY_SECONDS) });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base(), maxAge: tokens.refreshExpiresIn });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { ...base(), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...base(), maxAge: 0 });
}
