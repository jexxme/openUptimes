import { NextRequest, NextResponse } from 'next/server';
import {
  createCronJob,
  updateCronJob,
  deleteCronJob,
  getCronJob,
  listCronJobs,
  startJob,
  stopJob,
  getJobHistory,
  CronJob
} from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

// Debugging helper
function logDebug(message: string, data?: any) {
  console.log(`[CRON-API] ${message}`, data || '');
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

// Common auth handler
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
 * GET /api/ping/cron
 * List all cron jobs
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const auth = await handleAuth(req);
  if (!auth.isAuthorized) {
    return auth.response!;
  }
  
  // Get URL parameters
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const historyParam = url.searchParams.get('history');
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
  
  try {
    // If ID is provided, get a specific job
    if (id) {
      // If history param is provided, get job history
      if (historyParam) {
        const history = await getJobHistory(id, limit);
        return NextResponse.json({ history });
      }
      
      // Otherwise get job details
      const job = await getCronJob(id);
      
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      return NextResponse.json(job);
    }
    
    // Otherwise list all jobs
    const jobs = await listCronJobs();
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error in GET /api/ping/cron:', error);
    return NextResponse.json(
      { error: 'Failed to get cron jobs', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ping/cron
 * Create a new cron job
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
    
    // Create new job
    const job = await createCronJob(body);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/ping/cron:', error);
    return NextResponse.json(
      { error: 'Failed to create cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ping/cron
 * Update an existing cron job
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const auth = await handleAuth(req);
  if (!auth.isAuthorized) {
    return auth.response!;
  }
  
  try {
    // Parse request body
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Special actions handling
    const action = body.action;
    if (action) {
      switch (action) {
        case 'start':
          const startResult = await startJob(body.id);
          return NextResponse.json({ success: startResult });
        
        case 'stop':
          const stopResult = await stopJob(body.id);
          return NextResponse.json({ success: stopResult });
        
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    }
    
    // Otherwise update the job
    const { id, ...updates } = body;
    
    const updatedJob = await updateCronJob(id, updates);
    
    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Error in PUT /api/ping/cron:', error);
    return NextResponse.json(
      { error: 'Failed to update cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ping/cron
 * Delete a cron job
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const auth = await handleAuth(req);
  if (!auth.isAuthorized) {
    return auth.response!;
  }
  
  try {
    // Get URL parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Delete the job
    const success = await deleteCronJob(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/ping/cron:', error);
    return NextResponse.json(
      { error: 'Failed to delete cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
} 