import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

// Lock duration in ms - this is a fallback for safety
const DEFAULT_LOCK_DURATION = 60 * 1000; // 1 minute

/**
 * This endpoint implements a self-sustaining ping mechanism for Vercel
 * 
 * Flow:
 * 1. Edge function calls this endpoint at regular intervals
 * 2. We check if another instance is already running using a Redis lock
 * 3. If no lock exists, we acquire the lock and trigger a ping
 * 4. We schedule the next ping by calling the same edge function
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    // Cancellation handling - mark all existing cycles as stale
    if (action === 'cancel') {
      const client = await getRedisClient();
      
      // Store cancellation timestamp to mark current cycles as stale
      await client.set('scheduler:cancel-timestamp', Date.now().toString());
      console.log('[PingScheduler] Cancellation marker set, new cycles will be created');
      
      // Close Redis connection
      await closeRedisConnection();
      
      return NextResponse.json({
        status: 'success',
        message: 'All ping cycles marked for cancellation',
        timestamp: Date.now()
      });
    }
    
    // Status check
    if (action === 'status') {
      const client = await getRedisClient();
      
      // Get cancellation timestamp
      const cancelTimestamp = await client.get('scheduler:cancel-timestamp');
      const activeCount = await client.get('scheduler:active-cycles') || '0';
      const lastPingTimestamp = await client.get('stats:last-ping');
      
      // Get additional stats
      const lastCycleId = await client.get('scheduler:last-cycle-id');
      const lastCycleTime = await client.get('scheduler:last-cycle-time');
      
      // Close Redis connection
      await closeRedisConnection();
      
      return NextResponse.json({
        status: 'success',
        lastCancelTimestamp: cancelTimestamp ? parseInt(cancelTimestamp, 10) : null,
        activeCycles: parseInt(activeCount, 10),
        lastPingTimestamp: lastPingTimestamp ? parseInt(lastPingTimestamp, 10) : null,
        lastCycleId,
        lastCycleTime: lastCycleTime ? parseInt(lastCycleTime, 10) : null,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Invalid action specified',
      timestamp: Date.now()
    }, { status: 400 });
  } catch (error) {
    console.error('Error in ping scheduler:', error);
    
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { 
        error: 'Scheduler operation failed', 
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 