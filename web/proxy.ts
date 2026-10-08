import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic route guard. It only checks that a session cookie exists; the API enforces real authorisation on every
 * request, and the admin area re-checks the role with the server.
 */
const PRIVATE = ['/home', '/posts', '/insights', '/best-times', '/plan', '/connections', '/settings', '/notifications', '/onboarding', '/admin'];
const GUEST_ONLY = ['/sign-in', '/sign-up'];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = Boolean(req.cookies.get('mn_rt')?.value || req.cookies.get('mn_at')?.value);
  const is = (list: string[]) => list.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (is(PRIVATE) && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && (is(GUEST_ONLY) || pathname === '/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|brand|icon.png|favicon.ico).*)'] };
