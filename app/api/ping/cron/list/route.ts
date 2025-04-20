import { NextRequest, NextResponse } from 'next/server';
import { listCronJobs, getCronJob, getJobHistory } from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

/**
 * GET /api/ping/cron/list
 * List all cron jobs
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
    const historyParam = url.searchParams.get('history');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
    
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
    console.error('Error in GET /api/ping/cron/list:', error);
    return NextResponse.json(
      { error: 'Failed to get cron jobs', message: (error as Error).message },
      { status: 500 }
    );
  }
} 