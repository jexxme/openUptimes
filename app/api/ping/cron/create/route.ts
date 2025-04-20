import { NextRequest, NextResponse } from 'next/server';
import { createCronJob } from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

/**
 * POST /api/ping/cron/create
 * Create a new cron job
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
    
    // Validate required fields
    if (!body.name || !body.cronExpression) {
      return NextResponse.json(
        { error: 'Name and cron expression are required' },
        { status: 400 }
      );
    }
    
    // Create new job
    const job = await createCronJob({
      name: body.name,
      description: body.description || '',
      cronExpression: body.cronExpression,
      enabled: body.enabled !== undefined ? body.enabled : false,
      status: 'stopped'
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/ping/cron/create:', error);
    return NextResponse.json(
      { error: 'Failed to create cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
} 