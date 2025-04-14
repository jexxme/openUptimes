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
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      console.error('REDIS_URL environment variable is not set');
      throw new Error('REDIS_URL environment variable is not set');
    }
    
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            return Math.min(retries * 100, 3000); // Increasing delay up to 3s
          }
        }
      });
      
      // Handle connection events
      redisClient.on('connect', () => {
        console.log('Redis client connecting...');
      });
      
      redisClient.on('ready', () => {
        console.log('Redis client ready and connected');
      });
      
      // Handle connection errors
      redisClient.on('error', (err) => {
        console.error('Redis connection error:', err);
      });
      
      redisClient.on('end', () => {
        console.log('Redis connection ended, client will be reinitialized on next request');
        redisClient = null;
      });
      
      await redisClient.connect();
      console.log('Redis client connected successfully');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      redisClient = null;
      throw error;
    }
  }
  
  return redisClient;
};

// Close Redis connection - important for serverless environments
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    } finally {
      redisClient = null;
    }
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

/**
 * Check if initial setup has been completed
 */
export async function isSetupComplete(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const setupComplete = await client.get('setup:complete');
    return setupComplete === 'true';
  } catch (err) {
    console.error('Error checking setup status:', err);
    return false;
  }
}

/**
 * Mark setup as complete
 */
export async function markSetupComplete(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.set('setup:complete', 'true');
    return true;
  } catch (err) {
    console.error('Error marking setup as complete:', err);
    return false;
  }
}

/**
 * Store admin password hash
 */
export async function setAdminPassword(passwordHash: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.set('admin:password', passwordHash);
    return true;
  } catch (err) {
    console.error('Error setting admin password:', err);
    return false;
  }
}

/**
 * Get admin password hash
 */
export async function getAdminPassword(): Promise<string | null> {
  try {
    const client = await getRedisClient();
    return await client.get('admin:password');
  } catch (err) {
    console.error('Error getting admin password:', err);
    return null;
  }
}

/**
 * Store a session token in Redis with expiration
 */
export async function storeSession(token: string, expirySeconds: number = 86400): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.set(`session:${token}`, 'active', {
      EX: expirySeconds // Expires in 24 hours by default
    });
    return true;
  } catch (err) {
    console.error('Error storing session:', err);
    return false;
  }
}

/**
 * Check if a session token exists and is valid
 */
export async function isSessionValid(token: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const session = await client.get(`session:${token}`);
    return session === 'active';
  } catch (err) {
    console.error('Error checking session:', err);
    return false;
  }
}

/**
 * Delete a session token from Redis
 */
export async function deleteSession(token: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.del(`session:${token}`);
    return true;
  } catch (err) {
    console.error('Error deleting session:', err);
    return false;
  }
} 