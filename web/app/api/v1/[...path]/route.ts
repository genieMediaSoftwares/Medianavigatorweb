import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies, type TokenPair } from '@/lib/server/cookies';
import { UpstreamUnreachableError, callUpstream, extractTokens, refreshTokens } from '@/lib/server/upstream';

/**
 * Backend-for-frontend. The browser calls /api/v1/* on this app; this handler calls the API at API_BASE_URL from the
 * server, attaching the access token from an httpOnly cookie. Tokens never reach page scripts:
 *  - sign-in / create-account responses have their tokens moved into cookies and stripped from the JSON;
 *  - an expired access token is refreshed once (single-flight) and the request retried; if that fails the cookies are
 *    cleared and the browser receives 401, which signs it out.
 */

/** Endpoints that never carry the user's token and never trigger a refresh. */
const PUBLIC_AUTH = new Set(['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']);
/** Endpoints that issue a session. */
const ISSUES_SESSION = new Set(['/auth/login', '/auth/register']);
/** Endpoints that end a session. */
const ENDS_SESSION = new Set(['/auth/logout', '/auth/logout-all']);

const envelopeError = (status: number, code: string, message: string, requestId: string) =>
  NextResponse.json({ success: false, error: { code, message } }, { status, headers: { 'x-request-id': requestId } });

/** Rejects cross-site writes. Cookies are SameSite=Lax as well; this is the second lock. */
function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function handle(req: NextRequest, ctx: RouteContext<'/api/v1/[...path]'>): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const { path: segments } = await ctx.params;
  // Dot or empty segments would be resolved by fetch into a different upstream path than the one checked below.
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return envelopeError(404, 'NOT_FOUND', 'Resource not found', requestId);
  }
  const path = `/${segments.map(encodeURIComponent).join('/')}`;
  // The API matches routes case-insensitively, so every policy decision uses a lower-cased copy. The path forwarded
  // upstream keeps its case, because ids (e.g. YouTube media ids) are case-sensitive.
  const policyPath = path.toLowerCase();
  const method = req.method.toUpperCase();

  // The refresh token never leaves the server, and internal job triggers are not for browsers.
  if (policyPath === '/auth/refresh' || policyPath === '/internal' || policyPath.startsWith('/internal/')) {
    return envelopeError(404, 'NOT_FOUND', 'Resource not found', requestId);
  }
  if (method !== 'GET' && method !== 'HEAD' && !isSameOrigin(req)) {
    return envelopeError(403, 'FORBIDDEN', 'Cross-site requests are not allowed', requestId);
  }

  const headers: Record<string, string> = { 'x-request-id': requestId };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  const userAgent = req.headers.get('user-agent');
  if (userAgent) headers['user-agent'] = userAgent;
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  const isPublic = PUBLIC_AUTH.has(policyPath);
  let accessToken = isPublic ? undefined : req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = isPublic ? undefined : req.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: TokenPair | null = null;
  let signOut = false;

  const tryRefresh = async (): Promise<boolean> => {
    if (!refreshToken) return false;
    const outcome = await refreshTokens(refreshToken);
    if (!outcome.ok) {
      signOut = true;
      return false;
    }
    rotated = outcome.tokens;
    accessToken = outcome.tokens.accessToken;
    return true;
  };

  let upstream: Response;
  try {
    if (!isPublic && !accessToken) await tryRefresh();
    const send = () => callUpstream({ method, path, search: req.nextUrl.search, headers, body, accessToken });
    upstream = await send();
    if (upstream.status === 401 && !isPublic && !rotated && !signOut && (await tryRefresh())) upstream = await send();
  } catch (err) {
    if (err instanceof UpstreamUnreachableError) {
      return envelopeError(502, 'API_UNREACHABLE', "We couldn't reach Media Navigator. Check your connection, and that the API address is configured.", requestId);
    }
    throw err;
  }

  const upstreamId = upstream.headers.get('x-request-id') ?? requestId;
  const upstreamType = upstream.headers.get('content-type') ?? 'application/json';
  let text = await upstream.text();
  let status = upstream.status;
  let issued: TokenPair | null = null;

  if (ISSUES_SESSION.has(policyPath) && upstream.ok) {
    const json = JSON.parse(text) as { data?: Record<string, unknown> };
    issued = extractTokens(json);
    if (json.data) delete json.data.tokens;
    text = JSON.stringify(json);
  }
  if (ENDS_SESSION.has(policyPath)) {
    signOut = true;
    // Already signed out upstream (expired session) is still a successful sign-out for the browser.
    if (status === 401) {
      status = 200;
      text = JSON.stringify({ success: true, data: { loggedOut: true } });
    }
  }
  if (policyPath === '/users/me' && method === 'DELETE' && upstream.ok) signOut = true;
  if (status === 401 && !isPublic) signOut = true;

  const res = new NextResponse(status === 204 || status === 304 ? null : text, {
    status,
    headers: { 'content-type': upstreamType, 'x-request-id': upstreamId, 'cache-control': 'no-store' },
  });
  if (signOut) clearAuthCookies(res);
  else if (issued) setAuthCookies(res, issued);
  else if (rotated) setAuthCookies(res, rotated);
  return res;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
