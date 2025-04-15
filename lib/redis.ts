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
let isConnecting = false;
let connectionPromise: Promise<RedisClientType> | null = null;

// Initialize Redis client with improved connection handling
export const getRedisClient = async (): Promise<RedisClientType> => {
  // If client exists and is open, return it
  if (redisClient && redisClient.isOpen) {
    try {
      // Verify connection is alive
      await redisClient.ping();
      return redisClient;
    } catch (error) {
      console.warn('Redis client ping failed, reconnecting...', error);
      // Continue to reconnection code
    }
  }

  // If already connecting, wait for that connection instead of starting a new one
  if (isConnecting && connectionPromise) {
    try {
      return await connectionPromise;
    } catch (error) {
      console.error('Shared connection attempt failed:', error);
      // Fall through to create a new connection
    }
  }

  // Set connecting flag and create a new connection
  isConnecting = true;
  
  try {
    // Create connection promise
    connectionPromise = (async () => {
      if (!process.env.REDIS_URL) {
        console.error('REDIS_URL environment variable is not set');
        throw new Error('REDIS_URL environment variable is not set');
      }
      
      try {
        // Clean up old client if it exists
        if (redisClient) {
          try {
            await redisClient.quit().catch(() => {});
          } catch (e) {
            // Ignore cleanup errors
          }
          redisClient = null;
        }
        
        // Create new client
        const newClient = createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000, // 5s connection timeout
            reconnectStrategy: (retries) => {
              const delay = Math.min(retries * 100, 3000);
              console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
              return delay; // Increasing delay up to 3s
            }
          }
        });
        
        // Handle connection events
        newClient.on('connect', () => {
          console.log('Redis client connecting...');
        });
        
        newClient.on('ready', () => {
          console.log('Redis client ready and connected');
        });
        
        // Handle errors
        newClient.on('error', (err) => {
          console.error('Redis connection error:', err);
        });
        
        newClient.on('end', () => {
          console.log('Redis connection ended');
          // Only reset if this is the current client
          if (redisClient === newClient) {
            redisClient = null;
          }
        });
        
        await newClient.connect();
        console.log('Redis client connected successfully');
        
        // Store the new client
        redisClient = newClient;
        return newClient;
      } catch (error) {
        console.error('Failed to initialize Redis client:', error);
        throw error;
      }
    })();
    
    // Wait for the connection and return the client
    const client = await connectionPromise;
    return client;
  } catch (error) {
    throw error;
  } finally {
    // Reset connection state
    isConnecting = false;
    connectionPromise = null;
  }
};

/**
 * Close Redis connection - now implemented with a delayed closure
 * to avoid closing connections that are still in use
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    // Schedule connection closure after a delay to allow pending operations to complete
    setTimeout(async () => {
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.quit();
          console.log('Redis connection closed after timeout');
        }
      } catch (error) {
        console.error('Error in delayed Redis connection closure:', error);
      }
    }, 1000); // 1 second delay
    
    console.log('Redis connection scheduled for closure');
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
 * Helper function to get the configured history TTL in seconds
 * Returns null if no TTL is set (disabled)
 */
export async function getHistoryTTL(): Promise<number | null> {
  try {
    const client = await getRedisClient();
    const configStr = await client.get('config:site');
    if (!configStr) return 30 * 24 * 60 * 60; // Default to 30 days if no config exists
    
    const config = JSON.parse(configStr);
    return config.historyTTL === 0 ? null : (config.historyTTL || 30 * 24 * 60 * 60);
  } catch (err) {
    console.error('Error fetching history TTL:', err);
    return 30 * 24 * 60 * 60; // Default to 30 days on error
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
    
    // Apply TTL if configured
    const ttl = await getHistoryTTL();
    if (ttl !== null) {
      await client.expire(`history:${name}`, ttl);
    }
    
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

/**
 * Initialize Redis with default services from config
 */
export async function initializeRedisWithDefaults(): Promise<void> {
  try {
    const client = await getRedisClient();
    
    // Check if services config exists in Redis
    const servicesInRedis = await client.get('config:services');
    
    // If services don't exist in Redis, load them from config.ts
    if (!servicesInRedis) {
      // Dynamic import to avoid circular dependencies
      const { services, config } = await import('./config');
      
      // Store services in Redis
      await client.set('config:services', JSON.stringify(services));
      console.log('Initialized Redis with default services from config.ts');
      
      // Store site config in Redis
      await client.set('config:site', JSON.stringify(config));
      console.log('Initialized Redis with default site config from config.ts');
    }
  } catch (error) {
    console.error('Error initializing Redis with defaults:', error);
    throw error;
  }
} 