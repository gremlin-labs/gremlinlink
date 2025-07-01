import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants';

const ADMIN_PATH = '/admin';

/**
 * Middleware for GremlinLink - ADMIN AUTH ONLY
 * - Protects /admin routes with basic session validation
 * - Uses cookie presence check (detailed validation happens in API routes)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (excluding auth pages to prevent redirect loop)
  if (pathname.startsWith(ADMIN_PATH) && 
      !pathname.startsWith('/admin/auth') && 
      pathname !== '/admin/login') {
    
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      const loginUrl = new URL('/admin/auth', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Basic validation - just check if cookie exists and has content
    // Detailed session validation will happen in the actual page/API routes
    if (sessionCookie.value.length < 10) { // Basic sanity check
      const loginUrl = new URL('/admin/auth', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // For all other routes, continue without changes
  return NextResponse.next();
}

// Configure matcher to apply middleware ONLY to admin routes
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};