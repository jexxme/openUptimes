import { NextResponse } from 'next/server';
import { setServiceStatus, appendServiceHistory, closeRedisConnection, ServiceStatus, getRedisClient } from '@/lib/redis';
import { ServiceConfig } from '@/lib/config';

/**
 * Get all services from Redis
 */
async function getServicesFromRedis(): Promise<ServiceConfig[]> {
  try {
    const client = await getRedisClient();
    const services = await client.get('config:services');
    
    if (!services) {
      // If Redis is empty, return empty array
      return [];
    }
    
    return JSON.parse(services);
  } catch (error) {
    console.error('Error reading services from Redis:', error);
    throw error;
  }
}

/**
 * Check the status of a single service
 */
async function checkService(service: { name: string; url: string; expectedStatus?: number }) {
  const startTime = Date.now();
  let statusData: ServiceStatus;
  
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
    await setServiceStatus(service.name, statusData);
    await appendServiceHistory(service.name, statusData);
  } catch (storageError) {
    console.error(`Failed to store status for ${service.name}:`, storageError);
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
  const services = await getServicesFromRedis();
  return Promise.all(services.map(service => checkService(service)));
}

/**
 * API route handler for /api/ping
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  console.log(`[Ping] Started at ${new Date(startTime).toISOString()}`);
  
  try {
    // Store current timestamp as the last ping time
    const now = Date.now();
    const client = await getRedisClient();
    
    // Get site config for refresh interval
    const configStr = await client.get('config:site');
    let refreshInterval = 60000; // Default to 60s
    
    if (configStr) {
      const config = JSON.parse(configStr);
      refreshInterval = config.refreshInterval || 60000;
    }
    
    console.log(`[Ping] Using refresh interval: ${refreshInterval}ms (${refreshInterval/1000}s)`);
    
    // Update ping statistics
    await client.set('stats:last-ping', now.toString());
    const nextPing = now + refreshInterval;
    await client.set('stats:next-ping', nextPing.toString());
    
    // Track the cycle that triggered this ping
    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');
    if (cycleId) {
      console.log(`[Ping] Triggered by cycle ID: ${cycleId}`);
      await client.set('stats:last-cycle-id', cycleId);
    }
    
    // Store a ping event record for tracking in the UI
    const pingEvent = {
      type: 'Service Ping',
      timestamp: now,
      cycleId: cycleId || 'unknown',
      executionStart: startTime,
      interval: refreshInterval / 1000
    };
    
    // Store in a Redis list, limit to recent events
    await client.lPush('stats:ping-events', JSON.stringify(pingEvent));
    await client.lTrim('stats:ping-events', 0, 50); // Keep last 50 events
    
    // Check all services
    console.log('[Ping] Checking all services...');
    const results = await checkAllServices();
    console.log(`[Ping] Checked ${results.length} services`);
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Calculate total execution time
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    console.log(`[Ping] Completed in ${executionTime}ms`);
    
    return NextResponse.json({
      status: 'success',
      timestamp: now,
      nextPing: nextPing,
      refreshInterval: refreshInterval,
      executionTime: executionTime,
      results: results
    });
  } catch (err) {
    console.error('[Ping] Failed to check services:', err);
    
    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('[Ping] Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to check services', message: (err as Error).message },
      { status: 500 }
    );
  }
} 