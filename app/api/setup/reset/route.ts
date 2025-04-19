import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';
import * as fs from 'fs/promises';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'lib', 'config.ts');

// Default services configuration to reset to
const DEFAULT_SERVICES = `[
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
]`;

// Default site configuration to reset to
const DEFAULT_SITE_CONFIG = `{
  siteName: 'OpenUptimes',
  description: 'Service Status Monitor',
  refreshInterval: 60000,
  historyLength: 1440,
  theme: {
    up: '#10b981',
    down: '#ef4444',
    unknown: '#6b7280'
  }
}`;

/**
 * Reset the config.ts file to default values
 */
async function resetConfigFile(): Promise<void> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf8');
    
    // Replace services array with default
    let updatedContent = content.replace(
      /export const services: ServiceConfig\[] = \[([\s\S]*?)\];/,
      `export const services: ServiceConfig[] = ${DEFAULT_SERVICES};`
    );
    
    // Replace config object with default
    updatedContent = updatedContent.replace(
      /export const config = ({[\s\S]*?});/,
      `export const config = ${DEFAULT_SITE_CONFIG};`
    );
    
    await fs.writeFile(CONFIG_PATH, updatedContent, 'utf8');
  } catch (error) {

    throw error;
  }
}

export async function POST() {
  try {
    const client = await getRedisClient();
    
    // Get all Redis keys to delete everything
    const allKeys = await client.keys('*');
    
    if (allKeys.length > 0) {

      await client.del(allKeys);
    }
    
    // Reset the config.ts file to defaults
    await resetConfigFile();
    
    // Clear active sessions from middleware (if any way to access them)
    // This is a known limitation if sessions are stored in memory
    
    return NextResponse.json({ 
      success: true, 
      message: 'Application reset successfully',
      keysDeleted: allKeys.length
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to reset application' },
      { status: 500 }
    );
  }
} 