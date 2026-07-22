import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/growth', '/api/growth'];
const AUTH_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('admin_session');
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));

  if (isProtected) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      if (session.exp < Date.now()) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('admin_session');
        return response;
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (isAuthRoute && sessionCookie) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      if (session.exp > Date.now()) {
        return NextResponse.redirect(new URL('/growth', request.url));
      }
    } catch {
      // continue to login
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/growth/:path*', '/login', '/api/growth/:path*'],
};
