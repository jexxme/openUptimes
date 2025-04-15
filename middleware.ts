import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseTokenFromCookie } from './lib/edge-auth';

// This is a temporary compatibility layer during transition to Redis-based sessions
// It's kept for development mode and will be removed in the future
export const activeSessions = new Set<string>();

// Make dev token available in development for easier testing
if (process.env.NODE_ENV === 'development') {
  const DEV_TOKEN = 'dev-token-for-testing-purposes-only';
  activeSessions.add(DEV_TOKEN);
  console.log('Added development token for auth testing');
}

// Compatibility functions for transition period
export function addSession(token: string) {
  // Only used in dev environment now
  if (process.env.NODE_ENV === 'development') {
    activeSessions.add(token);
    console.log('Session added to memory store (dev only)');
  }
}

export function removeSession(token: string) {
  // Only used in dev environment now
  if (process.env.NODE_ENV === 'development') {
    activeSessions.delete(token);
    console.log('Session removed from memory store (dev only)');
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API endpoints (handled separately)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Always allow access to public pages
  if (pathname === '/reset' || pathname === '/' || pathname === '/login' || pathname === '/setup') {
    return NextResponse.next();
  }

  // For admin routes, check authentication
  if (pathname.startsWith('/admin')) {
    // In development, bypass auth check if not required
    if (process.env.NODE_ENV === 'development' && process.env.REQUIRE_AUTH_IN_DEV !== 'true') {
      return NextResponse.next();
    }
    
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      // Redirect to login if no token found
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    // In development, we can use the in-memory session check
    if (process.env.NODE_ENV === 'development') {
      if (!activeSessions.has(token)) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
    
    // In production, we'll rely on the API route to validate the session
    // Since we can't directly access Redis from Edge middleware
    return NextResponse.next();
  }
  
  // Protect debug routes in all environments
  if (pathname.startsWith('/debug')) {
    // In development, bypass auth check if not required
    if (process.env.NODE_ENV === 'development' && process.env.REQUIRE_AUTH_IN_DEV !== 'true') {
      return NextResponse.next();
    }
    
    // Check if user is authenticated
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      // Redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    // In development, check against in-memory session
    if (process.env.NODE_ENV === 'development') {
      if (!activeSessions.has(token)) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
    
    // For production, allow the request to continue to be checked by API route
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)'],
}; 