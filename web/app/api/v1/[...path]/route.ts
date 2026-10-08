import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearCookieHeaders, cookieHeaders, isHttps, type Tokens } from '@/lib/server/session';
import { UpstreamUnreachable, callApi, refreshTokens } from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

/**
 * Backend-for-frontend. The browser only talks to this route; it forwards to the API with the access token taken from
 * an httpOnly cookie, refreshes it once on a 401, and never lets a token reach page JavaScript.
 */

const FORWARD_RESPONSE_HEADERS = ['content-type', 'x-request-id', 'retry-after', 'content-disposition'];
const BLOCKED = new Set(['auth/refresh']);

function errorBody(code: string, message: string) {
  return JSON.stringify({ success: false, error: { code, message } });
}

function respond(status: number, body: string, headers: Headers, cookies: string[]) {
  const res = new NextResponse(body, { status, headers });
  for (const c of cookies) res.headers.append('set-cookie', c);
  return res;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const path = segments.join('/');
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const secure = isHttps(req);
  const json = (status: number, body: string, cookies: string[] = []) => respond(status, body, new Headers({ 'content-type': 'application/json', 'x-request-id': requestId }), cookies);

  if (BLOCKED.has(path)) return json(404, errorBody('NOT_FOUND', 'Not found'));

  const bodyBuf = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
  const baseHeaders: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) baseHeaders['content-type'] = contentType;
  const search = req.nextUrl.search;

  const isLogin = req.method === 'POST' && (path === 'auth/login' || path === 'auth/register');
  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let newCookies: string[] = [];

  try {
    if (!isLogin && !access && refresh && !path.startsWith('auth/forgot') && !path.startsWith('auth/reset')) {
      const tokens = await refreshTokens(refresh, requestId);
      if (tokens) { access = tokens.accessToken; newCookies = cookieHeaders(tokens, secure); }
    }

    const send = (token?: string) => callApi(`/${path}${search}`, { method: req.method, headers: baseHeaders, body: bodyBuf, accessToken: token, requestId, userAgent: req.headers.get('user-agent') });
    let upstream = await send(access);

    if (upstream.status === 401 && !isLogin && refresh && newCookies.length === 0) {
      const tokens = await refreshTokens(refresh, requestId);
      if (tokens) { newCookies = cookieHeaders(tokens, secure); upstream = await send(tokens.accessToken); }
    }

    // A 401 that survives the refresh means the session is over.
    if (upstream.status === 401 && !isLogin) {
      return json(401, errorBody('UNAUTHORIZED', 'Your session has ended. Please sign in again.'), clearCookieHeaders(secure));
    }

    const text = await upstream.text();
    const headers = new Headers();
    for (const h of FORWARD_RESPONSE_HEADERS) { const v = upstream.headers.get(h); if (v) headers.set(h, v); }
    if (!headers.has('x-request-id')) headers.set('x-request-id', requestId);

    // Login/registration: move the tokens into cookies and keep them out of the response body.
    if (isLogin && upstream.ok) {
      const parsed = JSON.parse(text) as { success: boolean; data: { tokens: Tokens } & Record<string, unknown> };
      const { tokens, ...rest } = parsed.data;
      return respond(upstream.status, JSON.stringify({ success: true, data: rest }), headers, cookieHeaders(tokens, secure));
    }

    // Signing out (or deleting the account) always ends the browser session, even if the API call failed.
    const endsSession = req.method !== 'GET' && (path === 'auth/logout' || path === 'auth/logout-all' || (path === 'users/me' && req.method === 'DELETE' && upstream.ok));
    if (endsSession) return respond(upstream.ok ? upstream.status : 200, upstream.ok ? text : JSON.stringify({ success: true, data: { signedOut: true } }), headers, clearCookieHeaders(secure));

    return respond(upstream.status, text, headers, newCookies);
  } catch (err) {
    if (err instanceof UpstreamUnreachable) {
      return json(503, errorBody('API_UNREACHABLE', "We couldn't reach Media Navigator. Check your connection, and that the API address is configured."));
    }
    return json(500, errorBody('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
