import { NextRequest, NextResponse } from 'next/server';
import { getServiceHistory, closeRedisConnection, getRedisClient } from '@/lib/redis';
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
 * GET /api/history
 * Returns the historical status data for all services
 * 
 * Query Parameters:
 * - service: Filter by service name
 * - timeRange: Filter by time range (30m, 1h, 2h, 24h, 7d, 30d, all)
 * - startTime: Custom start time (timestamp)
 * - endTime: Custom end time (timestamp)
 * - limit: Limit the number of records returned
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('service');
    const timeRange = searchParams.get('timeRange');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    
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
    
    // Get all services or filter by service name
    const services = await getServicesFromRedis();
    const filteredServices = serviceName 
      ? services.filter(service => service.name === serviceName)
      : services;
    
    // Fetch history data for each service
    const results = await Promise.all(
      filteredServices.map(async (service) => {
        console.log(`Fetching history for service: ${service.name}`);
        try {
          const history = await getServiceHistory(service.name, historyLimit);
          
          // Filter by time range if custom range is provided
          let filteredHistory = history;
          if (startTime && endTime) {
            const start = parseInt(startTime, 10);
            const end = parseInt(endTime, 10);
            filteredHistory = history.filter(item => 
              item.timestamp >= start && item.timestamp <= end
            );
          }
          
          return {
            name: service.name,
            history: filteredHistory
          };
        } catch (serviceError) {
          console.error(`Error fetching history for service ${service.name}:`, serviceError);
          return {
            name: service.name,
            history: [],
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
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in history API:', error);
    
    // Close Redis connection even on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection after error:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    );
  }
} 