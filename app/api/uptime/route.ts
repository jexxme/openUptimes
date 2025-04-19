import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';

interface HistoryItem {
  timestamp: number;
  status: string;
  responseTime?: number;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const serviceFilter = url.searchParams.get('service');
    const timeRangeParam = url.searchParams.get('timeRange');

    const client = await getRedisClient();
    const services = await client.get('config:services');

    // Process service statuses into uptime data
    const uptimeData: Record<string, any> = {};
    
    if (services) {
      const serviceList = JSON.parse(services);
      
      for (const service of serviceList) {
        // Skip this service if a service filter is specified and doesn't match
        if (serviceFilter && service.name !== serviceFilter) {
          continue;
        }
        
        // Get the history for this service
        const historyKey = `history:${service.name}`;
        const historyData = await client.lRange(historyKey, 0, -1);
        
        if (historyData && historyData.length > 0) {
          const history = historyData.map((item: string) => JSON.parse(item) as HistoryItem);
          
          // Apply time range filter if specified
          let filteredHistory = history;
          if (timeRangeParam) {
            const match = timeRangeParam.match(/^(\d+)([mhdw])$/);
            if (match) {
              const value = parseInt(match[1], 10);
              const unit = match[2];
              
              let timeRangeFilter = 0;
              // Convert to milliseconds
              switch (unit) {
                case 'm': // minutes
                  timeRangeFilter = value * 60 * 1000;
                  break;
                case 'h': // hours
                  timeRangeFilter = value * 60 * 60 * 1000;
                  break;
                case 'd': // days
                  timeRangeFilter = value * 24 * 60 * 60 * 1000;
                  break;
                case 'w': // weeks
                  timeRangeFilter = value * 7 * 24 * 60 * 60 * 1000;
                  break;
              }
              
              if (timeRangeFilter > 0) {
                const cutoffTime = Date.now() - timeRangeFilter;
                filteredHistory = history.filter((item: HistoryItem) => item.timestamp >= cutoffTime);
              }
            }
          }
          
          // Calculate uptime stats
          const totalChecks = filteredHistory.length;
          const upChecks = filteredHistory.filter((item: HistoryItem) => item.status === 'up').length;
          const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0;
          
          // Find current status from latest check
          const currentStatus = filteredHistory[0] || null;
          
          // Calculate average response time
          const responseTimeValues = filteredHistory
            .filter((item: HistoryItem) => item.responseTime)
            .map((item: HistoryItem) => item.responseTime as number);
          
          const avgResponseTime = responseTimeValues.length > 0 
            ? responseTimeValues.reduce((sum: number, time: number) => sum + time, 0) / responseTimeValues.length
            : 0;
          
          // Calculate when the service came online (last continuous period of uptime)
          let onlineSince = null;
          if (currentStatus?.status === 'up') {
            // Start from the most recent history entry and work backwards
            for (let i = 0; i < filteredHistory.length; i++) {
              if (filteredHistory[i].status !== 'up') {
                // Found the transition point, use the next entry (which is "up")
                if (i > 0) {
                  onlineSince = new Date(filteredHistory[i - 1].timestamp).toISOString();
                }
                break;
              }
              
              // If we reached the end and all are "up", use the oldest entry
              if (i === filteredHistory.length - 1) {
                onlineSince = new Date(filteredHistory[i].timestamp).toISOString();
              }
            }
          }
          
          // Add uptime data for this service
          uptimeData[service.name] = {
            currentStatus,
            uptimePercentage: Math.round(uptimePercentage * 100) / 100,
            avgResponseTime: Math.round(avgResponseTime),
            checksCount: totalChecks,
            onlineSince,
            historyCount: history.length
          };
        }
      }
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    return NextResponse.json({
      timestamp: Date.now(),
      services: uptimeData
    });
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (closeError) {
      console.error('Error closing Redis connection:', closeError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch uptime data', message: (error as Error).message },
      { status: 500 }
    );
  }
} 