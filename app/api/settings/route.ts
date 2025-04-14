import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'lib', 'config.ts');

/**
 * Read the current site configuration from config.ts
 */
async function readSiteConfig() {
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
    
    return config;
  } catch (error) {
    console.error('Error reading site config:', error);
    throw error;
  }
}

/**
 * Write updated site configuration to config.ts
 */
async function writeSiteConfig(config: any): Promise<void> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf8');
    
    // Format config object as string
    const configString = JSON.stringify(config, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // Convert "key": to key:
      .replace(/"/g, "'"); // Use single quotes
    
    // Replace the config object in the file
    const updatedContent = content.replace(
      /export const config = ({[\s\S]*?});/,
      `export const config = ${configString};`
    );
    
    await fs.writeFile(CONFIG_PATH, updatedContent, 'utf8');
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