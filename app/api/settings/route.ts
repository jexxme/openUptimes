import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getRedisClient } from '@/lib/redis';

const CONFIG_PATH = path.join(process.cwd(), 'lib', 'config.ts');
const SETTINGS_KEY = 'config:settings';

/**
 * Read the current site configuration from Redis or file
 */
async function readSiteConfig() {
  try {
    // First try to get from Redis
    const client = await getRedisClient();
    const configJson = await client.get(SETTINGS_KEY);
    
    if (configJson) {
      return JSON.parse(configJson);
    }
    
    // Fallback to file system for initial data (will only work in dev)
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf8');
      
      // Extract config object using regex
      const match = content.match(/export const config = ({[\s\S]*?});/);
      if (!match) {
        throw new Error('Could not parse site configuration');
      }
      
      // Convert the string representation to actual object
      const configString = match[1];
      const config = eval(`(${configString})`);
      
      // Store in Redis for future use
      await client.set(SETTINGS_KEY, JSON.stringify(config));
      
      return config;
    } catch (error) {
      console.error('Error reading site config from file:', error);
      
      // Return default config if everything fails
      const defaultConfig = {
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
      
      // Store default in Redis
      await client.set(SETTINGS_KEY, JSON.stringify(defaultConfig));
      
      return defaultConfig;
    }
  } catch (error) {
    console.error('Error reading site config:', error);
    
    // Return default config if Redis fails
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
}

/**
 * Write updated site configuration to Redis
 */
async function writeSiteConfig(config: any): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(SETTINGS_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error writing site config:', error);
    throw error;
  }
}

/**
 * GET /api/settings - Get site settings
 */
export async function GET() {
  try {
    const config = await readSiteConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/settings error:', error);
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
    const currentConfig = await readSiteConfig();
    
    // Merge updated settings with current config
    // This ensures we don't lose properties that weren't updated
    const newConfig = {
      ...currentConfig,
      ...updatedConfig
    };
    
    await writeSiteConfig(newConfig);
    
    return NextResponse.json(newConfig);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 