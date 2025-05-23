import { createClient, RedisClientType } from 'redis';

// Define service status and history types
export type ServiceStatus = {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
};

// Create and initialize Redis client - use any to resolve type compatibility issues
let redisClient: any = null;
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;
let lastUsedTimestamp = 0;
const CONNECTION_TIMEOUT = 60000; // 60 seconds of inactivity before considering closure

// Initialize Redis client with improved connection handling
export const getRedisClient = async (): Promise<any> => {
  // Update last used timestamp
  lastUsedTimestamp = Date.now();
  
  // If client exists and is open, return it
  if (redisClient && redisClient.isOpen) {
    try {
      // Verify connection is alive with a lightweight ping
      await redisClient.ping();
      return redisClient;
    } catch (error) {

      // Continue to reconnection code
    }
  }

  // If already connecting, wait for that connection instead of starting a new one
  if (isConnecting && connectionPromise) {
    try {
      return await connectionPromise;
    } catch (error) {

      // Fall through to create a new connection
    }
  }

  // Set connecting flag and create a new connection
  isConnecting = true;
  connectionPromise = null; // Reset any failed promise
  
  try {
    // Create connection promise
    connectionPromise = createRedisConnection();
    
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

// Helper function to create a new Redis connection
async function createRedisConnection(): Promise<any> {
  if (!process.env.REDIS_URL) {

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

          return delay; // Increasing delay up to 3s
        }
      }
    });
    
    // Handle connection events
    newClient.on('connect', () => {

    });
    
    newClient.on('ready', () => {

    });
    
    // Handle errors
    newClient.on('error', (err) => {

    });
    
    newClient.on('end', () => {

      // Only reset if this is the current client
      if (redisClient === newClient) {
        redisClient = null;
      }
    });
    
    await newClient.connect();

    // Store the new client
    redisClient = newClient;
    
    // Set up automatic connection management
    setupConnectionManagement();
    
    return newClient;
  } catch (error) {

    throw error;
  }
}

// Set up connection management to automatically close idle connections
let connectionManagementInterval: NodeJS.Timeout | null = null;

function setupConnectionManagement() {
  // Clear any existing interval
  if (connectionManagementInterval) {
    clearInterval(connectionManagementInterval);
  }
  
  // Set up a new interval to check for idle connections
  connectionManagementInterval = setInterval(() => {
    const now = Date.now();
    const idleTime = now - lastUsedTimestamp;
    
    // If connection has been idle for too long and no operations are in progress
    if (idleTime > CONNECTION_TIMEOUT && redisClient && !isConnecting) {

      closeRedisConnection();
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Close Redis connection - now implemented with a delayed closure
 * to avoid closing connections that are still in use
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    // Schedule connection closure after a longer delay to allow pending operations to complete
    // This helps prevent "client is closed" errors in high-frequency API scenarios
    setTimeout(async () => {
      try {
        // Only close if no active connection requests are in progress
        // and enough time has passed since the last usage
        const idleTime = Date.now() - lastUsedTimestamp;
        if (redisClient && redisClient.isOpen && !isConnecting && idleTime > 10000) {

          await redisClient.quit();

        } else {

        }
      } catch (error) {

      }
    }, 5000); // 5 second delay (increased from 1s)

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
    if (!configStr) return 24 * 60 * 60; // Default to 24 hours if no config exists
    
    const config = JSON.parse(configStr);
    return config.historyTTL === 0 ? null : (config.historyTTL || 24 * 60 * 60);
  } catch (err) {

    return 24 * 60 * 60; // Default to 24 hours on error
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
    return history.map((item: string) => JSON.parse(item));
  } catch (err) {

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

    return null;
  }
}

/**
 * Store a session token in Redis
 */
export async function storeSession(token: string, expirySeconds: number = 86400): Promise<boolean> {
  const requestId = Date.now().toString().substring(8);
  console.log(`[${requestId}] storeSession: Storing session token with ${expirySeconds}s expiry`);
  
  try {
    if (!token || token.trim() === '') {
      console.error(`[${requestId}] storeSession: Attempted to store empty token`);
      return false;
    }
    
    const client = await getRedisClient();
    
    // Store the session with given expiry
    const sessionKey = `session:${token}`;
    console.log(`[${requestId}] storeSession: Setting key ${sessionKey} to 'active' with TTL ${expirySeconds}s`);
    
    // Set the session to 'active' with an expiry
    const result = await client.set(sessionKey, 'active', {
      EX: expirySeconds
    });
    
    const success = result === 'OK';
    console.log(`[${requestId}] storeSession: Session stored successfully: ${success}`);
    
    // Verify the session was stored correctly
    if (success) {
      const ttl = await client.ttl(sessionKey);
      console.log(`[${requestId}] storeSession: Verified session with TTL ${ttl}s`);
      
      // For debugging, check if we can retrieve the session
      const session = await client.get(sessionKey);
      console.log(`[${requestId}] storeSession: Retrieved session: ${session === 'active' ? 'active' : 'not active'}`);
    }
    
    return success;
  } catch (err) {
    console.error(`[${requestId}] storeSession: Error storing session:`, err);
    return false;
  }
}

/**
 * Check if a session token exists and is valid
 */
export async function isSessionValid(token: string): Promise<boolean> {
  const requestId = Date.now().toString().substring(8);

  try {
    if (!token || token.trim() === '') {
      console.log(`[${requestId}] isSessionValid: Empty token provided`);
      return false;
    }
    
    const client = await getRedisClient();
    
    // Get session from Redis
    const sessionKey = `session:${token}`;
    console.log(`[${requestId}] isSessionValid: Checking token in Redis at key ${sessionKey}`);
    
    const session = await client.get(sessionKey);
    const isValid = session === 'active';

    // Debug: Check TTL if session exists
    if (session) {
      const ttl = await client.ttl(sessionKey);
      console.log(`[${requestId}] isSessionValid: Session found with TTL ${ttl}s, valid=${isValid}`);
    } else {
      console.log(`[${requestId}] isSessionValid: No session found for token`);
    }
    
    return isValid;
  } catch (err) {
    console.error(`[${requestId}] isSessionValid: Error validating session:`, err);
    return false;
  }
}

/**
 * Delete a session token from Redis
 */
export async function deleteSession(token: string): Promise<boolean> {
  const requestId = Date.now().toString().substring(8);

  try {
    const client = await getRedisClient();
    
    // Check if session exists before deletion
    const sessionExists = await client.exists(`session:${token}`);

    // Delete the session
    const deleteResult = await client.del(`session:${token}`);
    const success = deleteResult === 1;

    return success;
  } catch (err) {

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

      // Store site config in Redis
      await client.set('config:site', JSON.stringify(config));

    }
    
    // Initialize last interval reset time if it doesn't exist
    const lastIntervalReset = await client.get('ping:last-interval-reset');
    if (!lastIntervalReset) {
      await client.set('ping:last-interval-reset', Date.now().toString());

    }
  } catch (error) {

    throw error;
  }
}

/**
 * Get ping statistics
 */
export async function getPingStats() {
  try {
    const client = await getRedisClient();
    
    // Get last ping and next scheduled ping
    const [lastPing, nextPing] = await Promise.all([
      client.get('stats:last-ping'),
      client.get('stats:next-ping')
    ]);
    
    return {
      lastPing: lastPing ? parseInt(lastPing, 10) : null,
      nextPing: nextPing ? parseInt(nextPing, 10) : null,
      now: Date.now()
    };
  } catch (err) {

    return {
      lastPing: null,
      nextPing: null,
      now: Date.now(),
      error: (err as Error).message
    };
  }
}

/**
 * Get the last time interval stats were reset
 */
export async function getLastIntervalReset(): Promise<number> {
  try {
    const client = await getRedisClient();
    const lastReset = await client.get('ping:last-interval-reset');
    return lastReset ? parseInt(lastReset, 10) : 0;
  } catch (err) {

    return 0;
  }
}

/**
 * Set the last time interval stats were reset
 */
export async function setLastIntervalReset(timestamp: number): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.set('ping:last-interval-reset', timestamp.toString());
    return true;
  } catch (err) {

    return false;
  }
} 