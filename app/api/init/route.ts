import { NextResponse } from 'next/server';
import { initializeRedisWithDefaults, closeRedisConnection } from '@/lib/redis';

/**
 * API route to initialize Redis with default data
 * This can be called during app startup or manually
 */
export async function GET() {
  try {
    await initializeRedisWithDefaults();

    // Close Redis connection to avoid exhausting connections in serverless environment
    try {
      await closeRedisConnection();
    } catch (closeError) {

    }
    
    return NextResponse.json({ success: true, message: 'Redis initialized with default data' });
  } catch (error) {

    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {

    }
    
    return NextResponse.json(
      { error: 'Failed to initialize Redis', message: (error as Error).message },
      { status: 500 }
    );
  }
} 