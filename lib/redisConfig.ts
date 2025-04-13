// This file is only imported on the server side
import { config, services } from './config';

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