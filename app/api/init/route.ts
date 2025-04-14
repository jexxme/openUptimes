import { NextResponse } from 'next/server';
import { initializeRedisWithDefaults, closeRedisConnection } from '@/lib/redis';

/**
 * API route to initialize Redis with default data
 * This can be called during app startup or manually
 */
export async function GET() {
  try {
    await initializeRedisWithDefaults();
    console.log('Redis initialized with default data');
    
    // Close Redis connection to avoid exhausting connections in serverless environment
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json({ success: true, message: 'Redis initialized with default data' });
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    
    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection after error:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to initialize Redis', message: (error as Error).message },
      { status: 500 }
    );
  }
} 