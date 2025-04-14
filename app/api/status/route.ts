import { NextResponse } from 'next/server';
import { getServiceStatus, getServiceHistory, closeRedisConnection, getRedisClient } from '@/lib/redis';
import { ServiceConfig } from '@/lib/config';
import { initializeRedisWithDefaults } from '@/lib/redis';

/**
 * Get all services from Redis
 */
async function getServicesFromRedis(): Promise<ServiceConfig[]> {
  try {
    const client = await getRedisClient();
    const services = await client.get('config:services');
    
    if (!services) {
      // If Redis is empty, initialize with defaults
      await initializeRedisWithDefaults();
      
      // Try again after initialization
      const initializedServices = await client.get('config:services');
      if (!initializedServices) {
        return []; // If still empty, return empty array
      }
      
      return JSON.parse(initializedServices);
    }
    
    return JSON.parse(services);
  } catch (error) {
    console.error('Error reading services from Redis:', error);
    throw error;
  }
}

/**
 * API route handler for /api/status
 * Returns current status and optional history for all services
 */
export async function GET(request: Request) {
  console.log('API status endpoint called');
  
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit') as string, 10)
      : 60; // Default to 1 hour at 1-min intervals
    
    console.log(`Fetching status with params - includeHistory: ${includeHistory}, historyLimit: ${historyLimit}`);
    
    // Get services from Redis instead of importing static config
    const services = await getServicesFromRedis();
    
    const results = await Promise.all(
      services.map(async (service) => {
        console.log(`Fetching status for service: ${service.name}`);
        try {
          const status = await getServiceStatus(service.name);
          
          // Build the base response
          const serviceResponse = { 
            name: service.name, 
            url: service.url,
            description: service.description,
            config: {
              visible: service.visible !== undefined ? service.visible : true,
              expectedStatus: service.expectedStatus
            },
            currentStatus: status
          };
          
          if (includeHistory) {
            console.log(`Fetching history for service: ${service.name}`);
            const history = await getServiceHistory(service.name, historyLimit);
            console.log(`Received ${history.length} history records for ${service.name}`);
            
            return { 
              ...serviceResponse,
              history 
            };
          }
          
          return serviceResponse;
        } catch (serviceError) {
          console.error(`Error fetching data for service ${service.name}:`, serviceError);
          return { 
            name: service.name, 
            url: service.url,
            description: service.description,
            config: {
              visible: service.visible !== undefined ? service.visible : true,
              expectedStatus: service.expectedStatus
            },
            currentStatus: null,
            error: (serviceError as Error).message
          };
        }
      })
    );
    
    // Close Redis connection to avoid exhausting connections in serverless environment
    try {
      await closeRedisConnection();
      console.log('Redis connection closed successfully');
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    console.log('Successfully fetched status for all services');
    return NextResponse.json(results);
  } catch (err) {
    console.error('Error fetching status:', err);
    
    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection after error:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch service status', message: (err as Error).message },
      { status: 500 }
    );
  }
} 