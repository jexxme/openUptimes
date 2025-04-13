/**
 * Configuration for services to monitor
 */
export type ServiceConfig = {
  name: string;
  url: string;
  description?: string;
  expectedStatus?: number;
}

/**
 * List of services to monitor
 */
export const services: ServiceConfig[] = [
  { 
    name: "Google", 
    url: "https://www.google.com",
    description: "Google Search Engine" 
  },
  { 
    name: "GitHub", 
    url: "https://github.com",
    description: "GitHub Development Platform",
    expectedStatus: 200
  },
  {
    name: "Non-existent site",
    url: "https://this-site-does-not-exist-123456789.com",
    description: "Example of a down service"
  }
];

/**
 * General configuration
 */
export const config = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "OpenUptimes",
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Service Status Monitor",
  refreshInterval: parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "60000"), // Default 1 minute refresh rate in milliseconds
  historyLength: 1440,    // Keep 24 hours of history (at 1-minute intervals)
  theme: {
    up: "#10b981",        // Green color for up status
    down: "#ef4444",      // Red color for down status
    unknown: "#6b7280",   // Gray color for unknown status
  }
};

/**
 * Helper function for server components to load Redis config if available
 */
export async function getRedisConfig() {
  if (typeof window !== 'undefined') {
    // Don't run on client-side
    return { config, services };
  }

  try {
    // Only import Redis client on the server
    const { getRedisClient, closeRedisConnection } = await import('./redis');
    const redisClient = await getRedisClient();
    
    let updatedConfig = { ...config };
    let updatedServices = [...services];
    
    // Try to get config from Redis
    const redisConfig = await redisClient.get('config:site');
    if (redisConfig) {
      updatedConfig = { ...updatedConfig, ...JSON.parse(redisConfig) };
    }
    
    // Try to get services from Redis
    const redisServices = await redisClient.get('config:services');
    if (redisServices) {
      updatedServices = JSON.parse(redisServices);
    }
    
    await closeRedisConnection();
    
    return { config: updatedConfig, services: updatedServices };
  } catch (error) {
    console.error('Error loading Redis config:', error);
    return { config, services };
  }
} 