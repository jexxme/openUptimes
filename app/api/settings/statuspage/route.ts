import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * GET /api/settings/statuspage - Get status page settings and service visibility
 */
export async function GET() {
  let client = null;
  
  try {
    client = await getRedisClient();
    
    // Get site config for status page settings
    const configStr = await client.get('config:site');
    const siteConfig = configStr ? JSON.parse(configStr) : {};
    
    // Get services config to extract visibility settings
    const servicesStr = await client.get('config:services');
    const services = servicesStr ? JSON.parse(servicesStr) : [];
    
    // Create a simplified response with just the status page settings and service visibility
    const statusPageConfig = {
      settings: siteConfig.statusPage || {
        enabled: true,
        title: 'Service Status',
        description: 'Current status of our services'
      },
      services: services.map((service: any) => ({
        name: service.name,
        visible: service.visible !== undefined ? service.visible : true
      }))
    };
    
    return NextResponse.json(statusPageConfig);
  } catch (error) {
    console.error('Error fetching status page settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch status page settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/statuspage - Update status page settings
 */
export async function PUT(request: NextRequest) {
  let client = null;
  
  try {
    const updatedConfig = await request.json();
    client = await getRedisClient();
    
    // Update status page settings in the site config
    if (updatedConfig.settings) {
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
      
      siteConfig.statusPage = {
        ...siteConfig.statusPage,
        ...updatedConfig.settings
      };
      
      await client.set('config:site', JSON.stringify(siteConfig));
    }
    
    // Update service visibility settings
    if (updatedConfig.services && Array.isArray(updatedConfig.services)) {
      const servicesStr = await client.get('config:services');
      let services = servicesStr ? JSON.parse(servicesStr) : [];
      
      // Create a map of service visibility updates
      const visibilityUpdates = updatedConfig.services.reduce((acc: Record<string, boolean>, item: any) => {
        if (item.name && typeof item.visible === 'boolean') {
          acc[item.name] = item.visible;
        }
        return acc;
      }, {});
      
      // Update the visibility property for each service
      services = services.map((service: any) => {
        if (visibilityUpdates.hasOwnProperty(service.name)) {
          return {
            ...service,
            visible: visibilityUpdates[service.name]
          };
        }
        return service;
      });
      
      await client.set('config:services', JSON.stringify(services));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status page settings:', error);
    
    return NextResponse.json(
      { error: 'Failed to update status page settings' },
      { status: 500 }
    );
  }
} 