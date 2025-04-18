import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseTokenFromCookie } from './lib/edge-auth';

// We're removing the in-memory session management completely
// All session management will be handled by Redis

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = Date.now().toString().substring(8);
  
  console.log(`[Middleware:${requestId}] Path: ${pathname}`);
  
  // Debug cookie details
  const cookieHeader = request.headers.get('cookie') || '';
  console.log(`[Middleware:${requestId}] Cookie header exists: ${!!cookieHeader}`);
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    console.log(`[Middleware:${requestId}] Found ${cookies.length} cookies`);
    
    // Log if authToken is present
    const hasAuthToken = cookies.some(cookie => cookie.startsWith('authToken='));
    console.log(`[Middleware:${requestId}] Has authToken cookie: ${hasAuthToken}`);
  }
  
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
    console.log(`[Middleware:${requestId}] Public page, allowed: ${pathname}`);
    return NextResponse.next();
  }

  // For admin and debug routes, check authentication
  if (pathname.startsWith('/admin') || pathname.startsWith('/debug')) {
    console.log(`[Middleware:${requestId}] Protected route detected: ${pathname}`);
    
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      console.log(`[Middleware:${requestId}] No auth token found, redirecting to login`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    // We can't directly check Redis from middleware (Edge runtime), 
    // so we'll allow the request to continue to the page where
    // client-side validation will check with the /api/auth/validate endpoint
    console.log(`[Middleware:${requestId}] Auth token found, allowing request to continue for API validation`);
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)'],
}; 