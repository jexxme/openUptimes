import { NextRequest, NextResponse } from 'next/server';
import { getCronJob } from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

/**
 * GET /api/ping/cron/status
 * Get status of a cron job
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Get session token from cookies
  const sessionToken = req.cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing session token.' },
      { status: 401 }
    );
  }
  
  // Validate session
  const isValid = await isSessionValid(sessionToken);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or expired session.' },
      { status: 401 }
    );
  }
  
  try {
    // Get URL parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Get job details
    const job = await getCronJob(id);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Return status information
    return NextResponse.json({
      id: job.id,
      name: job.name,
      status: job.status,
      enabled: job.enabled,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      lastRunStatus: job.lastRunStatus,
      lastRunDuration: job.lastRunDuration,
      lastRunError: job.lastRunError
    });
  } catch (error) {
    console.error('Error in GET /api/ping/cron/status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status', message: (error as Error).message },
      { status: 500 }
    );
  }
} 