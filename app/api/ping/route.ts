import { NextResponse } from 'next/server';
import { services } from '@/lib/config';
import { setServiceStatus, appendServiceHistory } from '@/lib/redis';

/**
 * Check the status of a single service
 */
async function checkService(service: { name: string; url: string; expectedStatus?: number }) {
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
    
    const statusData = {
      status: isUp ? 'up' : 'down',
      timestamp: endTime,
      responseTime,
      statusCode: response.status,
    };
    
    // Store current status
    await setServiceStatus(service.name, statusData);
    
    // Append to history
    await appendServiceHistory(service.name, statusData);
    
    return {
      name: service.name,
      ...statusData
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const statusData = {
      status: 'down',
      timestamp: endTime,
      responseTime,
      error: (error as Error).message,
    };
    
    // Store current status
    await setServiceStatus(service.name, statusData);
    
    // Append to history
    await appendServiceHistory(service.name, statusData);
    
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
  return Promise.all(services.map(service => checkService(service)));
}

/**
 * API route handler for /api/ping
 */
export async function GET() {
  try {
    const results = await checkAllServices();
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check services' },
      { status: 500 }
    );
  }
} 