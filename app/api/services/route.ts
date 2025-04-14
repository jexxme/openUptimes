import { NextRequest, NextResponse } from 'next/server';
import { ServiceConfig } from '@/lib/config';
import { setServiceStatus, appendServiceHistory, ServiceStatus, closeRedisConnection, getRedisClient } from '@/lib/redis';

/**
 * Get all services from Redis
 */
async function getServicesFromRedis(): Promise<ServiceConfig[]> {
  try {
    const client = await getRedisClient();
    const services = await client.get('config:services');
    
    if (!services) {
      // If no services in Redis, return empty array
      return [];
    }
    
    return JSON.parse(services);
  } catch (error) {
    console.error('Error reading services from Redis:', error);
    throw error;
  }
}

/**
 * Save services to Redis
 */
async function saveServicesToRedis(services: ServiceConfig[]): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set('config:services', JSON.stringify(services));
  } catch (error) {
    console.error('Error writing services to Redis:', error);
    throw error;
  }
}

/**
 * Check a single service status immediately
 */
async function checkService(service: ServiceConfig) {
  console.log(`Immediate check for service: ${service.name} at URL: ${service.url}`);
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
    
    // Store current status
    await setServiceStatus(service.name, statusData);
    
    // Append to history
    await appendServiceHistory(service.name, statusData);
    
    return statusData;
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
    
    // Store current status
    await setServiceStatus(service.name, statusData);
    
    // Append to history
    await appendServiceHistory(service.name, statusData);
    
    return statusData;
  }
}

/**
 * GET /api/services - Get all services
 */
export async function GET() {
  try {
    const services = await getServicesFromRedis();
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services - Add a new service
 */
export async function POST(request: NextRequest) {
  try {
    const newService = await request.json();
    
    // Validate required fields
    if (!newService.name || !newService.url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }
    
    const services = await getServicesFromRedis();
    
    // Check if service with the same name already exists
    if (services.some(service => service.name === newService.name)) {
      return NextResponse.json(
        { error: 'Service with this name already exists' },
        { status: 409 }
      );
    }
    
    // Add the new service
    services.push(newService);
    await saveServicesToRedis(services);
    
    // Check the new service status immediately
    await checkService(newService);
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to add service' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services/:name - Update a service
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originalName = searchParams.get('name');
    
    if (!originalName) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }
    
    const updatedService = await request.json();
    
    // Validate required fields
    if (!updatedService.name || !updatedService.url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }
    
    const services = await getServicesFromRedis();
    
    // Find the service to update
    const serviceIndex = services.findIndex(service => service.name === originalName);
    if (serviceIndex === -1) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    // Update the service
    const oldService = services[serviceIndex];
    services[serviceIndex] = updatedService;
    await saveServicesToRedis(services);
    
    // If the name has changed or if the URL has changed, check the service status immediately
    const nameChanged = originalName !== updatedService.name;
    if (nameChanged || updatedService.url !== oldService.url) {
      await checkService(updatedService);
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json(updatedService);
  } catch (error) {
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/:name - Delete a service
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }
    
    const services = await getServicesFromRedis();
    
    // Find the service to delete
    const serviceIndex = services.findIndex(service => service.name === name);
    if (serviceIndex === -1) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    // Remove the service
    services.splice(serviceIndex, 1);
    await saveServicesToRedis(services);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
} 