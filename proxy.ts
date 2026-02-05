import { NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (Edge Runtime)
 *
 * Acts as network boundary layer. Authentication is handled client-side
 * in src/app/(dashboard)/layout.tsx using Zustand authStore.
 *
 * In production, this will verify JWT tokens or session cookies.
 */
export function proxy() {
  // Allow all routes - auth is handled client-side
  // This allows Zustand to hydrate from localStorage before redirecting
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'
  ]
};
