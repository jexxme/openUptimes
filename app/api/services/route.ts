import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ServiceConfig } from '@/lib/config';
import { getRedisClient } from '@/lib/redis';

const CONFIG_PATH = path.join(process.cwd(), 'lib', 'config.ts');
const SERVICES_KEY = 'config:services';

/**
 * Read the current services configuration from Redis or file
 */
async function readServicesConfig(): Promise<ServiceConfig[]> {
  try {
    // First try to get from Redis
    const client = await getRedisClient();
    const servicesJson = await client.get(SERVICES_KEY);
    
    if (servicesJson) {
      return JSON.parse(servicesJson);
    }
    
    // Fallback to file system for initial data (will only work in dev)
    try {
      // Try reading from data/services.json first
      const dataPath = path.join(process.cwd(), 'data', 'services.json');
      const jsonContent = await fs.readFile(dataPath, 'utf8');
      const services = JSON.parse(jsonContent);
      
      // Store in Redis for future use
      await client.set(SERVICES_KEY, JSON.stringify(services));
      return services;
    } catch (fsError) {
      // If that fails, try reading from config.ts
      const content = await fs.readFile(CONFIG_PATH, 'utf8');
      
      // Extract services array using regex
      const match = content.match(/export const services: ServiceConfig\[] = \[([\s\S]*?)\];/);
      if (!match) {
        throw new Error('Could not parse services configuration');
      }
      
      // Convert the string representation to actual array
      const servicesString = `[${match[1]}]`;
      const services = eval(`(${servicesString})`);
      
      // Store in Redis for future use
      await client.set(SERVICES_KEY, JSON.stringify(services));
      return services;
    }
  } catch (error) {
    console.error('Error reading services config:', error);
    
    // Return default empty array if everything fails
    return [];
  }
}

/**
 * Write updated services configuration to Redis
 */
async function writeServicesConfig(services: ServiceConfig[]): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(SERVICES_KEY, JSON.stringify(services));
  } catch (error) {
    console.error('Error writing services config:', error);
    throw error;
  }
}

/**
 * GET /api/services - Get all services
 */
export async function GET() {
  try {
    const services = await readServicesConfig();
    return NextResponse.json(services);
  } catch (error) {
    console.error('GET /api/services error:', error);
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
    
    const services = await readServicesConfig();
    
    // Check if service with the same name already exists
    if (services.some(service => service.name === newService.name)) {
      return NextResponse.json(
        { error: 'Service with this name already exists' },
        { status: 409 }
      );
    }
    
    // Add the new service
    services.push(newService);
    await writeServicesConfig(services);
    
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error('POST /api/services error:', error);
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
    const name = searchParams.get('name');
    
    if (!name) {
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
    
    const services = await readServicesConfig();
    
    // Find the service to update
    const serviceIndex = services.findIndex(service => service.name === name);
    if (serviceIndex === -1) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    // Update the service
    services[serviceIndex] = updatedService;
    await writeServicesConfig(services);
    
    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('PUT /api/services error:', error);
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
    
    const services = await readServicesConfig();
    
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
    await writeServicesConfig(services);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
} 