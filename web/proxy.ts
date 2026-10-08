import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic route guard. It only checks whether a session cookie exists; the API verifies every request (identity,
 * role and ownership), so nothing here is trusted for authorization. Admin pages are additionally gated by the role the
 * server reports, and every /admin API call is enforced by the server.
 */
const REFRESH_COOKIE = 'mn_rt'; // keep in sync with lib/server/cookies.ts (proxy cannot import server-only modules)

const PRIVATE_PREFIXES = ['/home', '/posts', '/insights', '/best-times', '/plan', '/connections', '/settings', '/notifications', '/onboarding', '/admin'];
const GUEST_ONLY = ['/sign-in', '/create-account'];

const matches = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

  if (!signedIn && matches(pathname, PRIVATE_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && matches(pathname, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
