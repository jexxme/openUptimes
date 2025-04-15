import { NextResponse } from 'next/server';
import { getPingStats, closeRedisConnection } from '@/lib/redis';

/**
 * GET /api/ping-stats - Get ping system statistics
 */
export async function GET() {
  try {
    const stats = await getPingStats();
    
    // Create a new object with the additional property to fix type issues
    const responseData = {
      ...stats,
      nextPingCountdown: undefined as number | undefined
    };
    
    // Calculate next ping countdown in seconds
    if (stats.nextPing) {
      responseData.nextPingCountdown = Math.max(0, Math.floor((stats.nextPing - stats.now) / 1000));
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching ping stats:', error);
    
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch ping statistics', message: (error as Error).message },
      { status: 500 }
    );
  }
} 