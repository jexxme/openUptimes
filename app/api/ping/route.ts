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
  console.log(`Checking service: ${service.name} at URL: ${service.url}`);
  const startTime = Date.now();
  let fetchSucceeded = false;
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
    
    console.log(`Service ${service.name} status: ${isUp ? 'UP' : 'DOWN'}, Code: ${response.status}, Time: ${responseTime}ms`);
    
    statusData = {
      status: isUp ? 'up' : 'down',
      timestamp: endTime,
      responseTime,
      statusCode: response.status,
    };
    
    fetchSucceeded = true;
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error(`Error checking service ${service.name}:`, error);
    
    statusData = {
      status: 'down',
      timestamp: endTime,
      responseTime,
      error: (error as Error).message,
    };
  }
  
  // Store data with retry regardless of fetch success/failure
  try {
    // Store current status with retry
    const maxStatusRetries = 3;
    let retries = 0;
    let statusSaved = false;
    let historySaved = false;
    
    // Loop until both operations succeed or max retries reached
    while (retries < maxStatusRetries && (!statusSaved || !historySaved)) {
      try {
        if (!statusSaved) {
          await setServiceStatus(service.name, statusData);
          statusSaved = true;
          console.log(`Saved status for ${service.name}`);
        }
        
        if (!historySaved) {
          await appendServiceHistory(service.name, statusData);
          historySaved = true;
          console.log(`Saved history for ${service.name}`);
        }
      } catch (retryError) {
        retries++;
        console.warn(`Redis error (${retries}/${maxStatusRetries}) for ${service.name}:`, retryError);
        
        // Check if this is a connection error
        const isConnectionError = retryError instanceof Error && 
          (retryError.message.includes('client is closed') || 
           retryError.message.includes('connection') ||
           retryError.message.includes('ECONNREFUSED') ||
           retryError.message.includes('Redis'));
        
        if (isConnectionError && retries < maxStatusRetries) {
          // Exponential backoff for connection issues
          const delay = Math.min(50 * Math.pow(2, retries), 1000);
          console.log(`Retrying Redis operations in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!statusSaved || !historySaved) {
      console.error(`Failed to store all data for ${service.name} after ${maxStatusRetries} retries`);
    }
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
  try {
    const services = await getServicesFromRedis();
    console.log('Checking all services:', services);
    return Promise.all(services.map(service => checkService(service)));
  } catch (error) {
    console.error('Error getting services from Redis:', error);
    throw error;
  }
}

/**
 * API route handler for /api/ping
 */
export async function GET() {
  console.log('API ping endpoint called');
  let retries = 0;
  const maxRetries = 3;
  
  while (retries <= maxRetries) {
    try {
      const results = await checkAllServices();
      console.log('All services checked successfully');
      
      // Ensure a small delay before attempting to close the connection
      // This allows any pending Redis operations to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Close Redis connection to avoid exhausting connections in serverless environment
      try {
        await closeRedisConnection();
        console.log('Redis connection scheduled for closure');
      } catch (closeError) {
        console.error('Error scheduling Redis connection closure:', closeError);
      }
      
      return NextResponse.json(results);
    } catch (err) {
      console.error(`Failed to check services (attempt ${retries + 1}/${maxRetries + 1}):`, err);
      
      // Only retry for Redis-related errors
      if (err instanceof Error && 
          (err.message.includes('Redis') || 
           err.message.includes('ECONNREFUSED') || 
           err.message.includes('connection') ||
           err.message.includes('client is closed'))) {
        retries++;
        if (retries <= maxRetries) {
          // Exponential backoff
          const delay = Math.min(100 * 2 ** retries, 2000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Non-retryable error or max retries exceeded
      // Ensure a small delay before attempting to close the connection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Close Redis connection even on error
      try {
        await closeRedisConnection();
      } catch (closeError) {
        console.error('Error scheduling Redis connection closure after error:', closeError);
      }
      
      // Use the error parameter in the response
      return NextResponse.json(
        { error: 'Failed to check services', message: (err as Error).message },
        { status: 500 }
      );
    }
  }
} 