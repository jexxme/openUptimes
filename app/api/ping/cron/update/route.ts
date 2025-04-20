import { NextRequest, NextResponse } from 'next/server';
import { updateCronJob, startJob, stopJob } from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

/**
 * PUT /api/ping/cron/update
 * Update an existing cron job
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
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
    
    // Validate updates
    if (updates.name === '') {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    
    const updatedJob = await updateCronJob(id, updates);
    
    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Error in PUT /api/ping/cron/update:', error);
    return NextResponse.json(
      { error: 'Failed to update cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
} 