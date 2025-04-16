import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * GET /api/settings/appearance - Get appearance settings
 */
export async function GET() {
  let client = null;
  
  try {
    client = await getRedisClient();
    
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {};
    
    // Extract only appearance-related settings
    const appearanceConfig = {
      theme: siteConfig.theme || {
        up: '#10b981',
        down: '#ef4444',
        unknown: '#6b7280'
      },
      // Add any other appearance settings here
      customCSS: siteConfig.customCSS || '',
      logo: siteConfig.logo || null,
      favicon: siteConfig.favicon || null,
      primaryColor: siteConfig.primaryColor || "#0284c7",
      accentColor: siteConfig.accentColor || "#06b6d4",
      logoUrl: siteConfig.logoUrl || "",
      showServiceUrls: siteConfig.showServiceUrls !== undefined ? siteConfig.showServiceUrls : true,
      showServiceDescription: siteConfig.showServiceDescription !== undefined ? siteConfig.showServiceDescription : true
    };
    
    return NextResponse.json(appearanceConfig);
  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch appearance settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/appearance - Update appearance settings
 */
export async function PUT(request: NextRequest) {
  let client = null;
  
  try {
    const updatedAppearance = await request.json();
    client = await getRedisClient();
    
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {
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
    
    // Update theme colors if provided
    if (updatedAppearance.theme) {
      siteConfig.theme = {
        ...siteConfig.theme,
        ...updatedAppearance.theme
      };
    }
    
    // Update other appearance settings if provided
    if (updatedAppearance.customCSS !== undefined) {
      siteConfig.customCSS = updatedAppearance.customCSS;
    }
    
    if (updatedAppearance.logo !== undefined) {
      siteConfig.logo = updatedAppearance.logo;
    }
    
    if (updatedAppearance.favicon !== undefined) {
      siteConfig.favicon = updatedAppearance.favicon;
    }
    
    // Update primary and accent colors
    if (updatedAppearance.primaryColor !== undefined) {
      siteConfig.primaryColor = updatedAppearance.primaryColor;
    }
    
    if (updatedAppearance.accentColor !== undefined) {
      siteConfig.accentColor = updatedAppearance.accentColor;
    }
    
    if (updatedAppearance.logoUrl !== undefined) {
      siteConfig.logoUrl = updatedAppearance.logoUrl;
    }
    
    // Update show service URLs flag
    if (updatedAppearance.showServiceUrls !== undefined) {
      siteConfig.showServiceUrls = updatedAppearance.showServiceUrls;
    }
    
    // Update show service description flag
    if (updatedAppearance.showServiceDescription !== undefined) {
      siteConfig.showServiceDescription = updatedAppearance.showServiceDescription;
    }
    
    await client.set('config:site', JSON.stringify(siteConfig));
    
    return NextResponse.json({ 
      success: true,
      theme: siteConfig.theme,
      customCSS: siteConfig.customCSS,
      logo: siteConfig.logo,
      favicon: siteConfig.favicon,
      primaryColor: siteConfig.primaryColor,
      accentColor: siteConfig.accentColor,
      logoUrl: siteConfig.logoUrl,
      showServiceUrls: siteConfig.showServiceUrls,
      showServiceDescription: siteConfig.showServiceDescription
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to update appearance settings' },
      { status: 500 }
    );
  }
} 