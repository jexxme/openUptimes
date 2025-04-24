import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

/**
 * GET /api/ping-history/ttl - Get current TTL setting
 */
export async function GET() {
  try {
    const client = await getRedisClient();
    
    // Get current site config
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {
      historyTTL: 24 * 60 * 60 // Default to 24 hours
    };
    
    // Use 0 to represent unlimited TTL
    const ttl = siteConfig.historyTTL !== undefined ? siteConfig.historyTTL : 24 * 60 * 60;
    
    return NextResponse.json({ 
      ttl,
      unlimited: ttl === 0
    });
  } catch (error) {
    console.error('Failed to get history TTL:', error);
    
    return NextResponse.json(
      { error: 'Failed to get history TTL', message: (error as Error).message },
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
    
    return NextResponse.json({ 
      success: true, 
      ttl,
      unlimited: ttl === 0,
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