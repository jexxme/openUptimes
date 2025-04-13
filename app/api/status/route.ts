import { NextResponse } from 'next/server';
import { services } from '@/lib/config';
import { getServiceStatus, getServiceHistory } from '@/lib/redis';

/**
 * API route handler for /api/status
 * Returns current status and optional history for all services
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit') as string, 10)
      : 60; // Default to 1 hour at 1-min intervals
    
    const results = await Promise.all(
      services.map(async (service) => {
        const status = await getServiceStatus(service.name);
        
        if (includeHistory) {
          const history = await getServiceHistory(service.name, historyLimit);
          return { 
            name: service.name, 
            url: service.url,
            description: service.description,
            currentStatus: status,
            history 
          };
        }
        
        return { 
          name: service.name, 
          url: service.url,
          description: service.description,
          currentStatus: status 
        };
      })
    );
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service status' },
      { status: 500 }
    );
  }
} 