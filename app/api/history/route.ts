import { NextRequest, NextResponse } from 'next/server';
import { getServiceHistory, getRedisClient } from '@/lib/redis';
import { ServiceConfig } from '@/lib/config';

/**
 * Get all services from Redis
 */
async function getServicesFromRedis(): Promise<ServiceConfig[]> {
  try {
    const client = await getRedisClient();
    const services = await client.get('config:services');
    
    if (!services) {
      return []; // If empty, return empty array
    }
    
    return JSON.parse(services);
  } catch (error) {
    console.error('Error reading services from Redis:', error);
    throw error;
  }
}

/**
 * Get all service names that have history entries
 */
async function getAllHistoryServiceNames(): Promise<string[]> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys('history:*');
    
    // Extract service names from the Redis keys (format: "history:serviceName")
    return keys.map((key: string) => key.substring(8)); // Remove "history:" prefix
  } catch (error) {
    console.error('Error getting history service names:', error);
    return [];
  }
}

/**
 * GET /api/history
 * Returns the historical status data for all services
 * 
 * Query Parameters:
 * - service: Filter by service name
 * - timeRange: Filter by time range (30m, 1h, 2h, 24h, 7d, 30d, all)
 * - startTime: Custom start time (timestamp)
 * - endTime: Custom end time (timestamp)
 * - limit: Limit the number of records returned
 * - includeDeleted: Include services that have been deleted (default true)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('service');
    const timeRange = searchParams.get('timeRange');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const includeDeleted = searchParams.get('includeDeleted') !== 'false'; // Default to true
    
    // Calculate history limit based on timeRange
    let historyLimit = 60; // Default to 1 hour (60 entries at 1-min intervals)
    
    // Handle custom time range if provided
    if (startTime && endTime) {
      // Calculate approximate limit based on date range
      // Each entry is roughly 1 minute apart
      const start = parseInt(startTime, 10);
      const end = parseInt(endTime, 10);
      const rangeInMs = end - start;
      const rangeInMinutes = Math.ceil(rangeInMs / (60 * 1000));
      historyLimit = Math.min(Math.max(rangeInMinutes, 60), 30 * 24 * 60); // Min 60, Max 30 days
      console.log(`Custom time range: ${new Date(start).toISOString()} to ${new Date(end).toISOString()}, limit: ${historyLimit}`);
    } else if (timeRange) {
      // Calculate limit based on predefined ranges
      if (timeRange === '30m') {
        historyLimit = 30; // 30 minutes
      } else if (timeRange === '1h') {
        historyLimit = 60; // 1 hour
      } else if (timeRange === '2h') {
        historyLimit = 120; // 2 hours
      } else if (timeRange === '24h') {
        historyLimit = 24 * 60; // 24 hours (full resolution)
      } else if (timeRange === '7d') {
        historyLimit = 7 * 24 * 6; // 7 days (10-min resolution)
      } else if (timeRange === '30d') {
        historyLimit = 30 * 24 * 2; // 30 days (30-min resolution)
      } else if (timeRange === 'all') {
        historyLimit = 30 * 24 * 60; // Max 30 days of data
      }
    }
    
    // Get all active services
    const activeServices = await getServicesFromRedis();
    
    // Create a map of active service names for quick lookup
    const activeServiceMap = new Map(activeServices.map(service => [service.name, service]));
    
    let serviceNames: string[] = [];
    
    if (serviceName) {
      // If a specific service is requested, use it regardless of active status
      serviceNames = [serviceName];
    } else if (includeDeleted) {
      // Get all service names that have history (including deleted ones)
      const historyServiceNames = await getAllHistoryServiceNames();
      serviceNames = Array.from(new Set([
        ...activeServices.map(s => s.name),
        ...historyServiceNames
      ]));
    } else {
      // Only use active services
      serviceNames = activeServices.map(s => s.name);
    }
    
    // Fetch history data for each service
    const results = await Promise.all(
      serviceNames.map(async (name) => {
        console.log(`Fetching history for service: ${name}`);
        try {
          const history = await getServiceHistory(name, historyLimit);
          
          // Skip services with no history
          if (history.length === 0) {
            return null;
          }
          
          // Filter by time range if custom range is provided
          let filteredHistory = history;
          if (startTime && endTime) {
            const start = parseInt(startTime, 10);
            const end = parseInt(endTime, 10);
            filteredHistory = history.filter(item => 
              item.timestamp >= start && item.timestamp <= end
            );
          }
          
          // Skip if filtered history is empty
          if (filteredHistory.length === 0) {
            return null;
          }
          
          // Tag services that no longer exist as deleted
          const isDeleted = !activeServiceMap.has(name);
          
          // Get the service configuration to include URL and description
          const serviceConfig = activeServiceMap.get(name);
          
          return {
            name,
            isDeleted,
            url: serviceConfig?.url || null,
            description: serviceConfig?.description || null,
            history: filteredHistory
          };
        } catch (serviceError) {
          console.error(`Error fetching history for service ${name}:`, serviceError);
          return {
            name,
            isDeleted: !activeServiceMap.has(name),
            history: [],
            error: (serviceError as Error).message
          };
        }
      })
    );
    
    // Filter out null results (services with no history)
    const filteredResults = results.filter(result => result !== null);
    
    // Note: We no longer explicitly close the Redis connection
    // This allows the connection pool to be managed by the Redis library
    // and prevents "client is closed" errors during rapid requests
    
    return NextResponse.json(filteredResults);
  } catch (error) {
    console.error('Error in history API:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    );
  }
} 