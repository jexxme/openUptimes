import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseTokenFromCookie } from './lib/edge-auth';

// Active sessions (in memory for simplicity)
// This is a problematic approach for production as it doesn't persist across deploys/restarts
// TODO: In a future update, move sessions to Redis for persistence
export const activeSessions = new Set<string>();

// Make dev token available in all environments for easier testing/debugging
// This is enabled only when ENABLE_DEV_TOKEN=true
if (process.env.ENABLE_DEV_TOKEN === 'true') {
  const DEV_TOKEN = 'dev-token-for-testing-purposes-only';
  activeSessions.add(DEV_TOKEN);
  console.log('Added development token for auth testing');
}

// Debug: Print all active sessions
console.log('Current active sessions count:', activeSessions.size);

export function addSession(token: string) {
  console.log('Adding session token');
  activeSessions.add(token);
  console.log('Session count:', activeSessions.size);
}

export function removeSession(token: string) {
  activeSessions.delete(token);
  console.log('Session removed. Remaining sessions:', activeSessions.size);
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
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    // Skip auth in development unless explicitly disabled
    if (process.env.NODE_ENV === 'development' && process.env.REQUIRE_AUTH_IN_DEV !== 'true') {
      return NextResponse.next();
    }
    
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    if (!activeSessions.has(token)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }
  
  // Special handling for setup wizard
  if (pathname === '/') {
    // This is just a check for API - the actual redirect happens in the page
    // because we need to check Redis which can't be done in Edge middleware
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)'],
}; 