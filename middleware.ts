import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseTokenFromCookie } from './lib/edge-auth';

// Active sessions (in memory for simplicity)
// This is a problematic approach for production as it doesn't persist across deploys/restarts
// We'll improve this to use Redis in a future update
export const activeSessions = new Set<string>();

// For development, let's add a default token that's always valid
// REMOVE THIS IN PRODUCTION!
if (process.env.NODE_ENV === 'development') {
  const DEV_TOKEN = 'dev-token-for-testing-purposes-only';
  activeSessions.add(DEV_TOKEN);
  console.log('Added development token for auth testing');
}

// Debug: Print all active sessions
console.log('Current active sessions count:', activeSessions.size);

export function addSession(token: string) {
  console.log('Adding session token');
  activeSessions.add(token);
}

export function removeSession(token: string) {
  activeSessions.delete(token);
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

  // Always allow access to reset page
  if (pathname === '/reset') {
    return NextResponse.next();
  }

  // For admin routes, check authentication
  if (pathname.startsWith('/admin')) {
    console.log(`Auth check for: ${pathname}`);
    
    // Debug bypass for development (temporary fix)
    if (process.env.NODE_ENV === 'development') {
      console.log('Dev mode - allowing admin access');
      return NextResponse.next();
    }
    
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      console.log('No auth token found');
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    console.log('Token found, checking session validity');
    
    if (!activeSessions.has(token)) {
      console.log('Invalid token used');
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    console.log('Valid session found, allowing access');
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