import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * Read the current site configuration from Redis
 */
async function getSiteConfigFromRedis() {
  const client = await getRedisClient();
  const configStr = await client.get('config:site');
  
  if (!configStr) {
    // Return default config if not found in Redis
    return {
      historyLength: 1440,
      statusPage: {
        enabled: true,
        title: 'Service Status',
        description: 'Current status of our services'
      },
      githubAction: {
        enabled: true,
        schedule: '*/5 * * * *', // Every 5 minutes by default
        repository: '',
        workflow: 'ping.yml',
        secretName: 'PING_API_KEY'
      },
      lastModified: Date.now()
    };
  }
  
  return JSON.parse(configStr);
}

/**
 * Write updated site configuration to Redis
 */
async function saveSiteConfigToRedis(config: any): Promise<void> {
  const client = await getRedisClient();
  await client.set('config:site', JSON.stringify(config));
}

/**
 * GET /api/settings - Get site settings
 */
export async function GET() {
  try {
    const config = await getSiteConfigFromRedis();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching settings:', error);
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
      ...updatedConfig,
      lastModified: Date.now() // Add timestamp of when settings were last modified
    };
    
    // Deep merge for nested githubAction settings if present
    if (updatedConfig.githubAction && currentConfig.githubAction) {
      newConfig.githubAction = {
        ...currentConfig.githubAction,
        ...updatedConfig.githubAction
      };
    }
    
    // Handle API key separately (only store if provided)
    if (updatedConfig.apiKey) {
      console.log('Updating API key in configuration');
      newConfig.apiKey = updatedConfig.apiKey;
    }
    
    await saveSiteConfigToRedis(newConfig);
    
    return NextResponse.json(newConfig);
  } catch (error) {
    console.error('Error updating settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 