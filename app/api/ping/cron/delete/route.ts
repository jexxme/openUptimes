import { NextRequest, NextResponse } from 'next/server';
import { deleteCronJob } from '@/lib/cron';
import { isSessionValid } from '@/lib/redis';

/**
 * DELETE /api/ping/cron/delete
 * Delete a cron job
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
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
    
    // Delete the job
    const success = await deleteCronJob(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/ping/cron/delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete cron job', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// Also support POST method for clients that can't use DELETE
export async function POST(req: NextRequest): Promise<NextResponse> {
  return DELETE(req);
} 