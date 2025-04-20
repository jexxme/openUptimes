import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection, setLastIntervalReset } from '@/lib/redis';
import { initializeServerSystems } from '@/lib/utils';

// Global state to track ping loop
let pingLoopActive = false;
let lastScheduledTime = 0;
let scheduledTimeout: NodeJS.Timeout | null = null;
let systemsInitialized = false;

// Initialize server systems on module load (runs once on first import)
(async () => {
  if (!systemsInitialized) {
    try {
      await initializeServerSystems();
      systemsInitialized = true;
      console.log('Server systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize server systems:', error);
    }
  }
})();

/**
 * Single endpoint that handles both service checking and scheduling
 * 
 * - Checks all services and updates their status in Redis
 * - Self-schedules the next ping based on configured interval
 * - Can be manually triggered or restarted via query parameters
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  // Check for API key if request comes from GitHub Actions
  const runId = url.searchParams.get('runId');
  
  // Check for API key in various header formats
  const apiKey = 
    request.headers.get('x-api-key') || 
    request.headers.get('X-API-Key') || 
    extractBearerToken(request.headers.get('Authorization'));
  
  // If run from GitHub Actions, verify API key
  if (runId) {
    if (!apiKey) {

      return NextResponse.json(
        { error: 'Unauthorized. Missing API key for GitHub Actions request.' },
        { status: 401 }
      );
    }
    
    const isValidApiKey = await validateApiKey(apiKey);
    if (!isValidApiKey) {

      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401 }
      );
    }

  }
  
  // Reset interval analysis
  if (action === 'reset_intervals') {
    try {
      const timestamp = Date.now();
      const success = await setLastIntervalReset(timestamp);
      
      return NextResponse.json({
        status: success ? 'success' : 'error',
        message: success ? 'Interval statistics reset successfully' : 'Failed to reset interval statistics',
        timestamp: timestamp
      });
    } catch (error) {

      return NextResponse.json(
        { error: 'Failed to reset interval statistics', message: (error as Error).message },
        { status: 500 }
      );
    }
  }
  
  // Status check - return current ping loop state
  if (action === 'status') {
    try {
      const client = await getRedisClient();
      const [lastPing, nextPing] = await Promise.all([
        client.get('ping:last'),
        client.get('ping:next')
      ]);
      
      await closeRedisConnection();
      
      return NextResponse.json({
        pingLoopActive,
        lastPing: lastPing ? parseInt(lastPing, 10) : null,
        nextPing: nextPing ? parseInt(nextPing, 10) : null,
        lastScheduledTime,
        currentTime: Date.now()
      });
    } catch (error) {

      return NextResponse.json(
        { error: 'Failed to get ping status', message: (error as Error).message },
        { status: 500 }
      );
    }
  }
  
  // Stop the ping loop
  if (action === 'stop') {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
    pingLoopActive = false;

    return NextResponse.json({
      status: 'success',
      message: 'Ping loop stopped',
      timestamp: Date.now()
    });
  }

  try {
    // Get site config for refresh interval
    const client = await getRedisClient();
    const configStr = await client.get('config:site');
    let refreshInterval = 60000; // Default to 60s
    
    if (configStr) {
      const config = JSON.parse(configStr);
      refreshInterval = config.refreshInterval || 60000;
    }

    // Update ping statistics
    const now = Date.now();
    await client.set('ping:last', now.toString());
    const nextPing = now + refreshInterval;
    await client.set('ping:next', nextPing.toString());
    
    // Check all services

    const results = await checkAllServices();

    // Record this ping in history
    const pingRecord = {
      timestamp: now,
      executionTime: Date.now() - startTime,
      servicesChecked: results.length,
      refreshInterval,
      nextScheduled: nextPing,
      // Add source information if from GitHub Actions
      source: runId ? 'github-action' : 'internal',
      runId: runId || undefined
    };
    
    // Store in Redis list with a limit
    await client.lPush('ping:history', JSON.stringify(pingRecord));
    await client.lTrim('ping:history', 0, 999); // Keep last 1000 pings
    
    // Schedule next ping if not stopped
    const restart = action === 'start' || action === 'restart';
    if (restart || pingLoopActive) {
      // Clear any existing timeout
      if (scheduledTimeout) {
        clearTimeout(scheduledTimeout);
      }
      
      // Schedule next ping
      scheduledTimeout = setTimeout(() => {
        // Use fetch to call this endpoint again without awaiting

        fetch(new URL(request.url).origin + '/api/ping', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'User-Agent': 'OpenUptimes Self-Scheduler'
          }
        }).catch(error => {

        });
      }, refreshInterval);
      
      lastScheduledTime = Date.now();
      pingLoopActive = true;

    }
    
    // Calculate total execution time
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json({
      status: 'success',
      timestamp: now,
      nextPing: nextPing,
      refreshInterval: refreshInterval,
      executionTime: executionTime,
      pingLoopActive: pingLoopActive,
      results: results
    });
  } catch (err) {
    console.error('Failed to check services:', err);

    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Failed to close Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to check services', message: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Validate the API key for GitHub Actions requests
 * 
 * This verifies that the incoming ping request from GitHub Actions
 * has the correct API key in the headers
 */
async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    // Get the GitHub action config from Redis
    const client = await getRedisClient();
    const configStr = await client.get('config:site');
    
    if (!configStr) return false;
    
    const config = JSON.parse(configStr);
    
    // If GitHub Actions is not enabled in the config, return false
    if (!config.githubAction?.enabled) return false;
    
    // Check if we have a stored API key in the configuration
    if (config.apiKey) {
      // Use constant-time comparison if available (not in this example)
      return apiKey === config.apiKey;
    }
    
    // As a fallback, use the hard-coded key for development
    // This is not secure for production and should be replaced with a proper secret
    return apiKey === 'openuptimes-api-key';
  } catch (error) {
    console.error('Failed to validate API key:', error);
    return false;
  }
}

/**
 * Check the status of a single service
 */
async function checkService(service: { name: string; url: string; expectedStatus?: number }) {
  const startTime = Date.now();
  let statusData: any;
  
  try {
    const response = await fetch(service.url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'OpenUptimes Status Monitor'
      },
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const expectedStatus = service.expectedStatus || 200;
    const isUp = response.status === expectedStatus;
    
    statusData = {
      status: isUp ? 'up' : 'down',
      timestamp: endTime,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    statusData = {
      status: 'down',
      timestamp: endTime,
      responseTime,
      error: (error as Error).message,
    };
  }
  
  // Store the service status and history
  try {
    const client = await getRedisClient();
    await client.set(`status:${service.name}`, JSON.stringify(statusData));
    
    // Store history - limit to last 1000 entries
    await client.lPush(`history:${service.name}`, JSON.stringify(statusData));
    await client.lTrim(`history:${service.name}`, 0, 999);
  } catch (storageError) {

  }
  
  return {
    name: service.name,
    ...statusData
  };
}

/**
 * Check all services defined in Redis
 */
async function checkAllServices() {
  try {
    const client = await getRedisClient();
    const services = await client.get('config:services');
    
    if (!services) {
      return [];
    }
    
    const parsedServices = JSON.parse(services);
    return Promise.all(parsedServices.map((service: any) => checkService(service)));
  } catch (error) {

    throw error;
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // Check if it's a Bearer token
  if (authHeader.startsWith('Bearer ')) {
    // Extract the token part
    return authHeader.substring(7);
  }
  
  return null;
} 