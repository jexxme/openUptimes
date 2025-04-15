import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

// Lock duration in ms
const LOCK_DURATION = 60 * 1000; // 1 minute

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
  console.log('Ping scheduler called');
  
  try {
    const client = await getRedisClient();
    
    // Get site config for the refresh interval
    const configStr = await client.get('config:site');
    if (!configStr) {
      console.error('Site config not found');
      return NextResponse.json({ error: 'Site config not found' }, { status: 500 });
    }
    
    const config = JSON.parse(configStr);
    const refreshInterval = config.refreshInterval || 60000; // Default to 60s
    
    // Try to acquire a lock using Redis
    const now = Date.now();
    const lockKey = 'lock:ping-scheduler';
    const lockValue = `${now}`;
    
    // Check if lock exists
    const existingLock = await client.get(lockKey);
    if (existingLock) {
      // Check if lock is expired
      const lockTimestamp = parseInt(existingLock, 10);
      if (now - lockTimestamp < LOCK_DURATION) {
        console.log('Another ping scheduler is already running');
        
        // Close Redis connection
        await closeRedisConnection();
        
        return NextResponse.json({ status: 'already_running' });
      }
      // Lock is expired, so we can acquire it
      console.log('Found expired lock, acquiring it');
    }
    
    // Acquire the lock with expiration
    await client.set(lockKey, lockValue, { EX: Math.ceil(LOCK_DURATION / 1000) });
    console.log('Acquired ping scheduler lock');
    
    // Perform the actual ping by calling our ping API endpoint
    console.log('Triggering ping process');
    const pingResponse = await fetch(new URL('/api/ping', request.url).toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes Internal Scheduler'
      },
    });
    
    if (!pingResponse.ok) {
      console.error('Ping process failed:', await pingResponse.text());
    } else {
      console.log('Ping process completed successfully');
    }
    
    // Store last ping timestamp
    await client.set('stats:last-ping', now.toString());
    
    // Store next scheduled ping time for frontend reference
    const nextPing = now + refreshInterval;
    await client.set('stats:next-ping', nextPing.toString());
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json({
      status: 'completed',
      timestamp: now,
      nextPing: nextPing
    });
    
  } catch (error) {
    console.error('Error in ping scheduler:', error);
    
    // Close Redis connection
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to run ping scheduler', message: (error as Error).message },
      { status: 500 }
    );
  }
} 