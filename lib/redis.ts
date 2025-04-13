import { createClient, RedisClientType } from 'redis';

// Define service status and history types
export type ServiceStatus = {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
};

// Create and initialize Redis client
let redisClient: RedisClientType | null = null;

// Initialize Redis client
const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    
    // Handle connection errors
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      redisClient = null;
    });
    
    await redisClient.connect();
  }
  
  return redisClient;
};

// Close Redis connection - important for serverless environments
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Helper function to get a status of a service
 */
export async function getServiceStatus(name: string): Promise<ServiceStatus | null> {
  try {
    const client = await getRedisClient();
    const status = await client.get(`status:${name}`);
    return status ? JSON.parse(status) : null;
  } catch (err) {
    console.error(`Error fetching status for ${name}:`, err);
    return null;
  }
}

/**
 * Helper function to set the status of a service
 */
export async function setServiceStatus(name: string, data: ServiceStatus): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.set(`status:${name}`, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Error setting status for ${name}:`, err);
    return false;
  }
}

/**
 * Helper function to append to history and maintain its size
 */
export async function appendServiceHistory(name: string, data: ServiceStatus): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.lPush(`history:${name}`, JSON.stringify(data));
    // Trim history to last 1440 entries (24h at 1-min intervals)
    await client.lTrim(`history:${name}`, 0, 1439);
    return true;
  } catch (err) {
    console.error(`Error appending history for ${name}:`, err);
    return false;
  }
}

/**
 * Helper function to get service history
 */
export async function getServiceHistory(name: string, limit: number = 1440): Promise<ServiceStatus[]> {
  try {
    const client = await getRedisClient();
    const history = await client.lRange(`history:${name}`, 0, limit - 1);
    return history.map(item => JSON.parse(item));
  } catch (err) {
    console.error(`Error fetching history for ${name}:`, err);
    return [];
  }
} 