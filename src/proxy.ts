import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is authenticated by checking localStorage (handled client-side)
  // For now, this is a simple proxy that allows navigation
  // In production with Firebase, this would check for valid session

  // Allow access to auth pages
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // For dashboard routes, we'll handle auth check client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'
  ]
};
