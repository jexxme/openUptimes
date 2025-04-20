import { NextRequest, NextResponse } from 'next/server';
import { getNextRunTime, validateCronExpression } from '../../../../../lib/cron';
import { isSessionValid } from '../../../../../lib/redis';

// Debugging helper
function logDebug(message: string, data?: any) {
  console.log(`[CRON-NEXT-RUN] ${message}`, data || '');
}

// Parse the session token from cookies with multiple formats support
function parseSessionToken(req: NextRequest): string | null {
  // First try using the native cookies API
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie?.value) {
    return sessionCookie.value;
  }
  
  // If that fails, try parsing from cookie header manually
  const cookieHeader = req.headers.get('cookie') || '';
  
  // Try multiple formats (unquoted, quoted, etc.)
  const regularMatch = cookieHeader.match(/session=([^;]+)/);
  const quotedMatch = cookieHeader.match(/session="([^"]+)"/);
  const authTokenMatch = cookieHeader.match(/authToken=([^;]+)/);
  const authTokenQuotedMatch = cookieHeader.match(/authToken="([^"]+)"/);
  
  // Return the first match found
  if (regularMatch) return regularMatch[1];
  if (quotedMatch) return quotedMatch[1];
  if (authTokenMatch) return authTokenMatch[1];
  if (authTokenQuotedMatch) return authTokenQuotedMatch[1];
  
  // For debugging, log all cookies if no session found
  if (cookieHeader) {
    const allCookies = cookieHeader.split(';').map(c => c.trim());
    logDebug('All cookies in request:', allCookies);
  }
  
  return null;
}

// Common auth handler - same as in main cron route
async function handleAuth(req: NextRequest): Promise<{ isAuthorized: boolean; response?: NextResponse }> {
  // Get session token from cookies
  const sessionToken = parseSessionToken(req);
  
  if (!sessionToken) {
    logDebug('No session token found in request');
    return {
      isAuthorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized. Missing session token.' },
        { status: 401 }
      )
    };
  }
  
  logDebug('Validating session token');
  
  try {
    // Validate session
    const isValid = await isSessionValid(sessionToken);
    
    if (!isValid) {
      logDebug('Invalid session token');
      return {
        isAuthorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized. Invalid or expired session.' },
          { status: 401 }
        )
      };
    }
    
    logDebug('Session token is valid');
    return { isAuthorized: true };
  } catch (error) {
    logDebug('Error validating session', error);
    return {
      isAuthorized: false,
      response: NextResponse.json(
        { error: 'Authentication error', message: (error as Error).message },
        { status: 500 }
      )
    };
  }
}

/**
 * POST /api/ping/cron/next-run
 * Calculate the next run time for a cron expression
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const auth = await handleAuth(req);
  if (!auth.isAuthorized) {
    return auth.response!;
  }
  
  try {
    // Parse request body
    const body = await req.json();
    const { cronExpression } = body;
    
    if (!cronExpression) {
      return NextResponse.json(
        { error: 'Cron expression is required' },
        { status: 400 }
      );
    }
    
    // Validate expression
    const isValid = await validateCronExpression(cronExpression);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid cron expression' },
        { status: 400 }
      );
    }
    
    // Calculate next run time
    const nextRun = await getNextRunTime(cronExpression);
    
    return NextResponse.json({ nextRun });
  } catch (error) {
    console.error('Error in POST /api/ping/cron/next-run:', error);
    return NextResponse.json(
      { error: 'Failed to calculate next run time', message: (error as Error).message },
      { status: 500 }
    );
  }
} 