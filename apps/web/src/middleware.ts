import { NextRequest, NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/cadastro'];

export function middleware(request: NextRequest): NextResponse {
  const refreshToken = request.cookies.get('refreshToken');
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (!refreshToken && !isAuthPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (refreshToken && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
