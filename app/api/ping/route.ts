import { NextResponse } from 'next/server';
import { services } from '@/lib/config';
import { setServiceStatus, appendServiceHistory, closeRedisConnection, ServiceStatus } from '@/lib/redis';

/**
 * Check the status of a single service
 */
async function checkService(service: { name: string; url: string; expectedStatus?: number }) {
  console.log(`Checking service: ${service.name} at URL: ${service.url}`);
  const startTime = Date.now();
  
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
    
    console.log(`Service ${service.name} status: ${isUp ? 'UP' : 'DOWN'}, Code: ${response.status}, Time: ${responseTime}ms`);
    
    const statusData: ServiceStatus = {
      status: isUp ? 'up' : 'down',
      timestamp: endTime,
      responseTime,
      statusCode: response.status,
    };
    
    try {
      // Store current status
      await setServiceStatus(service.name, statusData);
      
      // Append to history
      await appendServiceHistory(service.name, statusData);
    } catch (storageError) {
      console.error(`Failed to store status for ${service.name}:`, storageError);
    }
    
    return {
      name: service.name,
      ...statusData
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error(`Error checking service ${service.name}:`, error);
    
    const statusData: ServiceStatus = {
      status: 'down',
      timestamp: endTime,
      responseTime,
      error: (error as Error).message,
    };
    
    try {
      // Store current status
      await setServiceStatus(service.name, statusData);
      
      // Append to history
      await appendServiceHistory(service.name, statusData);
    } catch (storageError) {
      console.error(`Failed to store status for ${service.name}:`, storageError);
    }
    
    return {
      name: service.name,
      ...statusData
    };
  }
}

/**
 * Check all services defined in config
 */
async function checkAllServices() {
  console.log('Checking all services:', services);
  return Promise.all(services.map(service => checkService(service)));
}

/**
 * API route handler for /api/ping
 */
export async function GET() {
  console.log('API ping endpoint called');
  
  try {
    const results = await checkAllServices();
    console.log('All services checked successfully');
    
    // Close Redis connection to avoid exhausting connections in serverless environment
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(results);
  } catch (err) {
    console.error('Failed to check services:', err);
    
    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection after error:', closeError);
    }
    
    // Use the error parameter in the response
    return NextResponse.json(
      { error: 'Failed to check services', message: (err as Error).message },
      { status: 500 }
    );
  }
} 