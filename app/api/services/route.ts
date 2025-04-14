import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ServiceConfig } from '@/lib/config';

// Use JSON file for configuration storage in production
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'services.json');

/**
 * Read the current services configuration
 */
async function readServicesConfig(): Promise<ServiceConfig[]> {
  try {
    // Create the config directory if it doesn't exist
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
    }
    
    // Try to read the config file
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      // If file doesn't exist, return default from lib/config.ts
      // For development, we can still import the config
      const { services } = await import('@/lib/config');
      
      // Write the default config to the JSON file
      await fs.writeFile(CONFIG_PATH, JSON.stringify(services, null, 2), 'utf8');
      
      return services;
    }
  } catch (error) {
    console.error('Error reading services config:', error);
    throw error;
  }
}

/**
 * Write updated services configuration
 */
async function writeServicesConfig(services: ServiceConfig[]): Promise<void> {
  try {
    // Create the config directory if it doesn't exist
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
    }
    
    // Write services to the JSON file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(services, null, 2), 'utf8');
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
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
} 