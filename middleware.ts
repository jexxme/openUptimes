import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseTokenFromCookie } from './lib/edge-auth';
import { checkSession, storeSession, deleteSession } from './lib/redis';

// Legacy in-memory sessions approach - kept for backward compatibility
// In production, we now use Redis for session storage
export const activeSessions = new Set<string>();

// For development, let's add a default token that's always valid
// REMOVE THIS IN PRODUCTION!
if (process.env.NODE_ENV === 'development') {
  const DEV_TOKEN = 'dev-token-for-testing-purposes-only';
  activeSessions.add(DEV_TOKEN);
  console.log('Added development token for auth testing');
}

// Debug: Print all active sessions
console.log('Current active sessions count (legacy):', activeSessions.size);

// These functions are kept for backward compatibility
// But they are enhanced to also store sessions in Redis for persistence
export async function addSession(token: string) {
  console.log('Adding session token');
  activeSessions.add(token);
  // Also store in Redis for persistence across deployments
  await storeSession(token);
}

export async function removeSession(token: string) {
  activeSessions.delete(token);
  // Also remove from Redis
  await deleteSession(token);
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
    
    // Check in memory first (faster) and then in Redis if not found (persistent)
    if (!activeSessions.has(token)) {
      // Token not in memory, check Redis
      try {
        const isValidSession = await checkSession(token);
        
        if (!isValidSession) {
          console.log('Invalid token used (not in Redis)');
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('from', pathname);
          return NextResponse.redirect(url);
        }
        
        // If valid in Redis but not in memory, add it to memory for future checks
        activeSessions.add(token);
        console.log('Valid session found in Redis, added to memory cache');
      } catch (error) {
        console.error('Error checking session in Redis:', error);
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
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