import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function POST(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const redis = await getRedisClient();
    
    // Reset the setup status in Redis
    await redis.del('setup:complete');
    
    // Also clear any other setup-related keys
    await redis.del('config:site');
    await redis.del('auth:admin');
    
    // Clear any setup session state
    const keys = await redis.keys('setup:progress:*');
    if (keys && keys.length > 0) {
      for (const key of keys) {
        await redis.del(key);
      }
    }

    return NextResponse.json({ success: true, message: 'Setup status reset successfully' });
  } catch (error) {
    console.error('Error resetting setup:', error);
    return NextResponse.json(
      { error: 'Failed to reset setup status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 