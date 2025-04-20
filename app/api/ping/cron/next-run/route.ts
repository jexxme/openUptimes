import { NextRequest, NextResponse } from 'next/server';
import { validateCronExpression } from '../../../../../lib/cron';
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

// Helper to check if a cron time matches a date
function cronMatches(cronExpression: string, date: Date): boolean {
  // Split cron into parts
  const parts = cronExpression.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Get date components
  const dateMinute = date.getMinutes();
  const dateHour = date.getHours();
  const dateDayOfMonth = date.getDate();
  const dateMonth = date.getMonth() + 1; // JS months are 0-based
  const dateDayOfWeek = date.getDay(); // 0 is Sunday in JS
  
  // Check each part
  const minuteMatch = matchCronPart(dateMinute, minute, 0, 59);
  const hourMatch = matchCronPart(dateHour, hour, 0, 23);
  const dayOfMonthMatch = matchCronPart(dateDayOfMonth, dayOfMonth, 1, 31);
  const monthMatch = matchCronPart(dateMonth, month, 1, 12);
  const dayOfWeekMatch = matchCronPart(dateDayOfWeek, dayOfWeek, 0, 6);
  
  return minuteMatch && hourMatch && dayOfMonthMatch && monthMatch && dayOfWeekMatch;
}

// Helper to match a specific part of a cron expression
function matchCronPart(value: number, cronPart: string, min: number, max: number): boolean {
  // Handle asterisk
  if (cronPart === '*') return true;
  
  // Handle exact number
  if (!isNaN(parseInt(cronPart)) && parseInt(cronPart) === value) return true;
  
  // Handle ranges (e.g., 1-5)
  if (cronPart.includes('-')) {
    const [start, end] = cronPart.split('-').map(Number);
    return value >= start && value <= end;
  }
  
  // Handle lists (e.g., 1,3,5)
  if (cronPart.includes(',')) {
    return cronPart.split(',').map(Number).includes(value);
  }
  
  // Handle step values (e.g., */5)
  if (cronPart.startsWith('*/')) {
    const step = parseInt(cronPart.substring(2));
    return value % step === 0;
  }
  
  return false;
}

/**
 * Calculate next run time directly
 */
async function calculateNextRunTime(cronExpression: string): Promise<number | null> {
  try {
    const now = new Date();
    let nextDate = new Date(now);
    
    // Look ahead up to a week to find the next match
    for (let i = 1; i <= 10080; i++) { // 10080 minutes = 1 week
      nextDate = new Date(now.getTime() + i * 60000); // Add i minutes
      if (cronMatches(cronExpression, nextDate)) {
        logDebug(`Next run for "${cronExpression}" will be at: ${nextDate.toISOString()}`);
        return nextDate.getTime();
      }
    }
    
    logDebug(`No match found for "${cronExpression}" in the next week`);
    return null;
  } catch (error) {
    console.error(`Error calculating next run time for "${cronExpression}":`, error);
    return null;
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
    
    // Calculate next run time directly
    const nextRun = await calculateNextRunTime(cronExpression);
    
    logDebug(`Calculated next run time for "${cronExpression}": ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    
    return NextResponse.json({ nextRun });
  } catch (error) {
    console.error('Error in POST /api/ping/cron/next-run:', error);
    return NextResponse.json(
      { error: 'Failed to calculate next run time', message: (error as Error).message },
      { status: 500 }
    );
  }
} 