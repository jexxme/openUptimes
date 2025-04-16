import { NextRequest, NextResponse } from 'next/server';
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

// Define types for the history item
interface HistoryItem {
  status: string;
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

/**
 * GET /api/status
 * Returns the status of all services with optional history
 * 
 * Query Parameters:
 * - history: Whether to include historical data (default: false)
 * - limit: Limit the number of historical records returned per service (default: 60)
 * - filterByVisibility: Whether to filter out invisible services (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = parseInt(searchParams.get('limit') || '60', 10);
    const filterByVisibility = searchParams.get('filterByVisibility') !== 'false';
    
    // Get all services
    const services = await getServicesFromRedis();
    
    // Filter services based on visibility setting if needed
    const filteredServices = filterByVisibility 
      ? services.filter(service => service.visible !== false)
      : services;
    
    // Fetch status and history for each service
    const results = await Promise.all(
      filteredServices.map(async (service) => {
        try {
          // Get current status
          const client = await getRedisClient();
          const statusStr = await client.get(`status:${service.name}`);
          const currentStatus = statusStr ? JSON.parse(statusStr) : null;
          
          // Get history if requested
          let history: HistoryItem[] = [];
          if (includeHistory) {
            history = await getServiceHistory(service.name, historyLimit);
          }
          
          return {
            name: service.name,
            url: service.url,
            description: service.description,
            config: {
              visible: service.visible,
              expectedStatus: service.expectedStatus
            },
            currentStatus,
            history
          };
        } catch (error) {
          console.error(`Error fetching status for service ${service.name}:`, error);
          return {
            name: service.name,
            url: service.url,
            description: service.description,
            config: {
              visible: service.visible,
              expectedStatus: service.expectedStatus
            },
            currentStatus: null,
            history: [] as HistoryItem[],
            error: (error as Error).message
          };
        }
      })
    );
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in status API:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch status data' },
      { status: 500 }
    );
  }
} 