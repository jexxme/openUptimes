import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * GET /api/settings/general - Get general site settings
 */
export async function GET() {
  let client = null;
  
  try {
    client = await getRedisClient();
    
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {};
    
    // Extract only general settings
    const generalConfig = {
      refreshInterval: siteConfig.refreshInterval || 60000,
      historyLength: siteConfig.historyLength || 1440,
      contactEmail: siteConfig.contactEmail || '',
      timezone: siteConfig.timezone || 'UTC',
      historyTTL: siteConfig.historyTTL !== undefined ? siteConfig.historyTTL : 30 * 24 * 60 * 60 // Default 30 days
    };
    
    return NextResponse.json(generalConfig);
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch general settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/general - Update general site settings
 */
export async function PUT(request: NextRequest) {
  let client = null;
  
  try {
    const updatedGeneral = await request.json();
    client = await getRedisClient();
    
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {
      refreshInterval: 60000,
      historyLength: 1440,
      historyTTL: 30 * 24 * 60 * 60, // Default 30 days
      theme: {
        up: '#10b981',
        down: '#ef4444',
        unknown: '#6b7280'
      }
    };
    
    // Update general settings
    const validFields = [
      'refreshInterval', 'historyLength', 'contactEmail', 'timezone', 'historyTTL'
    ];
    
    validFields.forEach(field => {
      if (updatedGeneral[field] !== undefined) {
        siteConfig[field] = updatedGeneral[field];
      }
    });
    
    await client.set('config:site', JSON.stringify(siteConfig));
    
    return NextResponse.json({ 
      success: true,
      refreshInterval: siteConfig.refreshInterval,
      historyLength: siteConfig.historyLength,
      contactEmail: siteConfig.contactEmail,
      timezone: siteConfig.timezone,
      historyTTL: siteConfig.historyTTL
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to update general settings' },
      { status: 500 }
    );
  }
} 