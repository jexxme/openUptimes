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
      // Removed theme object completely
      // Add any other appearance settings here
      customCSS: siteConfig.customCSS || '',
      customHeader: siteConfig.customHeader || '',
      logo: siteConfig.logo || null,
      favicon: siteConfig.favicon || null,
      logoUrl: siteConfig.logoUrl || "",
      showServiceUrls: siteConfig.showServiceUrls !== undefined ? siteConfig.showServiceUrls : true,
      showServiceDescription: siteConfig.showServiceDescription !== undefined ? siteConfig.showServiceDescription : true,
      historyDays: siteConfig.historyDays || 90, // Get historyDays or default to 90
      copyrightUrl: siteConfig.copyrightUrl || "", // Get copyright URL or default to empty string
      copyrightText: siteConfig.copyrightText || "" // Get copyright text or default to empty string
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
      historyDays: 90, // Default history days
      // Removed theme object
    };
    
    // Removed theme colors update
    
    // Update other appearance settings if provided
    if (updatedAppearance.customCSS !== undefined) {
      siteConfig.customCSS = updatedAppearance.customCSS;
    }
    
    // Update custom header HTML if provided
    if (updatedAppearance.customHeader !== undefined) {
      siteConfig.customHeader = updatedAppearance.customHeader;
    }
    
    if (updatedAppearance.logo !== undefined) {
      // Convert empty string to null for logo
      siteConfig.logo = updatedAppearance.logo === "" ? null : updatedAppearance.logo;
    }
    
    if (updatedAppearance.favicon !== undefined) {
      siteConfig.favicon = updatedAppearance.favicon;
    }
    
    if (updatedAppearance.logoUrl !== undefined) {
      // Convert empty string to null for logoUrl
      siteConfig.logoUrl = updatedAppearance.logoUrl === "" ? null : updatedAppearance.logoUrl;
    }
    
    // Update show service URLs flag
    if (updatedAppearance.showServiceUrls !== undefined) {
      siteConfig.showServiceUrls = updatedAppearance.showServiceUrls;
    }
    
    // Update show service description flag
    if (updatedAppearance.showServiceDescription !== undefined) {
      siteConfig.showServiceDescription = updatedAppearance.showServiceDescription;
    }
    
    // Update history days setting
    if (updatedAppearance.historyDays !== undefined) {
      siteConfig.historyDays = updatedAppearance.historyDays;
    }
    
    // Update copyright URL setting
    if (updatedAppearance.copyrightUrl !== undefined) {
      siteConfig.copyrightUrl = updatedAppearance.copyrightUrl;
    }
    
    // Update copyright text setting
    if (updatedAppearance.copyrightText !== undefined) {
      siteConfig.copyrightText = updatedAppearance.copyrightText;
    }
    
    await client.set('config:site', JSON.stringify(siteConfig));
    
    return NextResponse.json({ 
      success: true,
      // Removed theme from response
      customCSS: siteConfig.customCSS,
      customHeader: siteConfig.customHeader,
      logo: siteConfig.logo,
      favicon: siteConfig.favicon,
      logoUrl: siteConfig.logoUrl,
      showServiceUrls: siteConfig.showServiceUrls,
      showServiceDescription: siteConfig.showServiceDescription,
      historyDays: siteConfig.historyDays, // Return historyDays in response
      copyrightUrl: siteConfig.copyrightUrl, // Return copyright URL in response
      copyrightText: siteConfig.copyrightText // Return copyright text in response
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to update appearance settings' },
      { status: 500 }
    );
  }
} 