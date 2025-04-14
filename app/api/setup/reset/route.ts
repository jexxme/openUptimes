import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';
import * as fs from 'fs/promises';
import * as path from 'path';

// Default services configuration to reset to
const DEFAULT_SERVICES = [
  {
    name: 'Google',
    url: 'https://www.google.com',
    description: 'Google Search Engine'
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    description: 'GitHub Development Platform',
    expectedStatus: 200
  },
  {
    name: 'Example',
    url: 'https://example.com',
    description: 'Example Website'
  }
];

// Default site configuration to reset to
const DEFAULT_SITE_CONFIG = {
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

// Redis keys
const SERVICES_KEY = 'config:services';
const SETTINGS_KEY = 'config:settings';

export async function POST() {
  try {
    const client = await getRedisClient();
    
    // Get all Redis keys to delete everything
    const allKeys = await client.keys('*');
    
    if (allKeys.length > 0) {
      console.log(`Deleting ${allKeys.length} Redis keys for complete reset...`);
      await client.del(allKeys);
    }
    
    // Set default services and settings in Redis
    await client.set(SERVICES_KEY, JSON.stringify(DEFAULT_SERVICES));
    await client.set(SETTINGS_KEY, JSON.stringify(DEFAULT_SITE_CONFIG));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Application reset successfully',
      keysDeleted: allKeys.length
    });
  } catch (error) {
    console.error('Error performing complete reset:', error);
    return NextResponse.json(
      { error: 'Failed to reset application' },
      { status: 500 }
    );
  }
} 