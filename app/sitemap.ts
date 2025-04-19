import { MetadataRoute } from 'next';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

// Generate dynamic sitemap
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://openuptimes.app';
  let client = null;
  
  // Basic routes that are always available
  const staticRoutes = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ] as MetadataRoute.Sitemap;

  // Try to get status page configuration to determine if it's enabled
  try {
    client = await getRedisClient();
    
    // Check status page settings
    const configStr = await client.get('config:statuspage');
    const statusPageConfig = configStr ? JSON.parse(configStr) : {};
    
    // Get service info for additional routes if status page is enabled
    if (statusPageConfig?.settings?.enabled !== false) {
      // Add service-specific routes if status page is enabled
      const servicesStr = await client.get('services');
      const services = servicesStr ? JSON.parse(servicesStr) : [];
      
      // Get visible services
      const visibleServices = services.filter((service: any) => {
        // Check if service is visible on status page
        const serviceVisibility = statusPageConfig?.services?.find((s: any) => s.name === service.name);
        return serviceVisibility?.visible !== false;
      });
      
      // Add routes for each visible service
      for (const service of visibleServices) {
        staticRoutes.push({
          url: `${baseUrl}/#service-${encodeURIComponent(service.name.toLowerCase().replace(/\s+/g, '-'))}`,
          lastModified: new Date(),
          changeFrequency: 'hourly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {

    // Continue with basic routes if there's an error
  } finally {
    // Close Redis connection if client was initialized
    if (client) {
      await closeRedisConnection();
    }
  }

  return staticRoutes;
} 