import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * API endpoint to get current ping statistics
 */
export async function GET() {
  try {
    const client = await getRedisClient();
    
    // Get ping times
    const [lastPing, nextPing] = await Promise.all([
      client.get('ping:last'),
      client.get('ping:next')
    ]);
    
    // Get ping history
    const pingHistory = await client.lRange('ping:history', 0, 9);
    const parsedPingHistory = pingHistory.map((entry: string) => JSON.parse(entry));
    
    // Get recent service statuses
    const services = await client.get('config:services');
    let serviceStatuses = [];
    
    if (services) {
      const serviceList = JSON.parse(services);
      
      // Gather statuses for each service
      const statusPromises = serviceList.map(async (service: { name: string }) => {
        const status = await client.get(`status:${service.name}`);
        return status ? JSON.parse(status) : null;
      });
      
      serviceStatuses = await Promise.all(statusPromises);
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Calculate time until next ping
    const now = Date.now();
    const nextPingTime = nextPing ? parseInt(nextPing, 10) : null;
    const nextPingIn = nextPingTime ? Math.max(0, nextPingTime - now) : null;
    
    // Recent ping interval trends
    let intervalTrend = null;
    if (parsedPingHistory.length >= 2) {
      const intervals = [];
      for (let i = 0; i < parsedPingHistory.length - 1; i++) {
        const interval = parsedPingHistory[i].timestamp - parsedPingHistory[i+1].timestamp;
        intervals.push(interval);
      }
      
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      
      intervalTrend = {
        average: Math.round(avgInterval),
        min: Math.min(...intervals),
        max: Math.max(...intervals)
      };
    }
    
    return NextResponse.json({
      lastPing: lastPing ? parseInt(lastPing, 10) : null,
      nextPing: nextPingTime,
      nextPingIn,
      serviceStatuses,
      recentHistory: parsedPingHistory,
      intervalTrend,
      currentTime: now
    });
  } catch (error) {
    console.error('Error fetching ping stats:', error);
    
    // Ensure Redis connection is closed on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch ping statistics', message: (error as Error).message },
      { status: 500 }
    );
  }
} 