import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * DELETE /api/ping-history - Clear all ping history entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const client = await getRedisClient();
    
    // Delete ping history
    await client.del('ping:history');
    
    // Note: we intentionally don't close the Redis connection here to avoid
    // "client is closed" errors when making rapid API calls
    
    return NextResponse.json({ success: true, message: 'Ping history cleared' });
  } catch (error) {
    console.error('Failed to clear ping history:', error);
    
    return NextResponse.json(
      { error: 'Failed to clear ping history', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ping-history/ttl - Update history TTL setting
 */
export async function PATCH(request: NextRequest) {
  try {
    const { ttl } = await request.json();
    
    if (ttl === undefined) {
      return NextResponse.json(
        { error: 'TTL value is required' },
        { status: 400 }
      );
    }
    
    const client = await getRedisClient();
    
    // Get current site config
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {
      refreshInterval: 60000,
      historyLength: 1440,
      historyTTL: 24 * 60 * 60 // Default to 24 hours
    };
    
    // Update TTL value (0 means unlimited)
    siteConfig.historyTTL = ttl;
    
    // Save updated config
    await client.set('config:site', JSON.stringify(siteConfig));
    
    // Note: we intentionally don't close the Redis connection here to avoid
    // "client is closed" errors when making rapid API calls
    
    return NextResponse.json({ 
      success: true, 
      message: ttl === 0 ? 'History TTL set to unlimited' : `History TTL set to ${ttl} seconds`
    });
  } catch (error) {
    console.error('Failed to update history TTL:', error);
    
    return NextResponse.json(
      { error: 'Failed to update history TTL', message: (error as Error).message },
      { status: 500 }
    );
  }
}