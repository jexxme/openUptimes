import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * Simple test endpoint to verify Redis connection
 */
export async function GET() {
  try {
    console.log('Testing Redis connection...');
    console.log('Redis URL:', process.env.REDIS_URL);
    
    const client = await getRedisClient();
    
    // Try a simple PING command
    const pingResult = await client.ping();
    console.log('Redis PING result:', pingResult);
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Redis connection successful',
      pingResult
    });
  } catch (err) {
    console.error('Redis connection test failed:', err);
    
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
} 