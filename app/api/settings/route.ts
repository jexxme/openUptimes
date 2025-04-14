import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * Read the current site configuration from Redis
 */
async function getSiteConfigFromRedis() {
  try {
    const client = await getRedisClient();
    const configStr = await client.get('config:site');
    
    if (!configStr) {
      // Return default config if not found in Redis
      return {
        siteName: 'OpenUptimes',
        description: 'Service Status Monitor',
        refreshInterval: 60000,
        historyLength: 1440,
        theme: {
          up: '#10b981',
          down: '#ef4444',
          unknown: '#6b7280'
        }
      };
    }
    
    return JSON.parse(configStr);
  } catch (error) {
    console.error('Error reading site config from Redis:', error);
    throw error;
  }
}

/**
 * Write updated site configuration to Redis
 */
async function saveSiteConfigToRedis(config: any): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set('config:site', JSON.stringify(config));
  } catch (error) {
    console.error('Error writing site config to Redis:', error);
    throw error;
  }
}

/**
 * GET /api/settings - Get site settings
 */
export async function GET() {
  try {
    const config = await getSiteConfigFromRedis();
    
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(config);
  } catch (error) {
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - Update site settings
 */
export async function PUT(request: NextRequest) {
  try {
    const updatedConfig = await request.json();
    
    // Get current config 
    const currentConfig = await getSiteConfigFromRedis();
    
    // Merge updated settings with current config
    // This ensures we don't lose properties that weren't updated
    const newConfig = {
      ...currentConfig,
      ...updatedConfig
    };
    
    await saveSiteConfigToRedis(newConfig);
    
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(newConfig);
  } catch (error) {
    console.error('Error updating settings:', error);
    
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 