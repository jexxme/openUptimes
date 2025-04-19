import { NextResponse } from 'next/server';
import { getRedisClient, closeRedisConnection, getLastIntervalReset } from '@/lib/redis';

/**
 * API endpoint to get current ping statistics from GitHub Actions scheduled runs
 */
export async function GET(request: Request) {
  try {
    // Parse the URL to extract query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    // Default to 10 entries, unless limit=0 (which means all entries)
    const limit = limitParam === '0' ? -1 : parseInt(limitParam || '10', 10);
    // Service filter parameter
    const serviceFilter = url.searchParams.get('service');
    // Time range filter (e.g., 30m for last 30 minutes, 1h for last hour)
    const timeRangeParam = url.searchParams.get('timeRange');
    
    const client = await getRedisClient();
    
    // Get last ping time
    const lastPing = await client.get('ping:last');
    
    // Get last interval reset time
    const lastIntervalReset = await getLastIntervalReset();
    
    // Get ping history - now respects the limit parameter
    const pingHistory = limit === -1 
      ? await client.lRange('ping:history', 0, -1) // Get all entries when limit=0
      : await client.lRange('ping:history', 0, limit - 1);
    
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
    
    // Get GitHub Action settings
    const configStr = await client.get('config:site');
    const config = configStr ? JSON.parse(configStr) : {};
    const githubConfig = config.githubAction || {
      enabled: false,
      schedule: '*/5 * * * *',
      repository: ''
    };
    
    const now = Date.now();
    
    // Process service statuses into stats data for each service
    const stats: Record<string, any> = {};
    
    if (services) {
      const serviceList = JSON.parse(services);
      
      for (const service of serviceList) {
        // Skip this service if a service filter is specified and doesn't match
        if (serviceFilter && service.name !== serviceFilter) {
          continue;
        }
        
        const statusKey = `ping:stats:${service.name}`;
        const statsData = await client.get(statusKey);
        
        if (statsData) {
          const pingData = JSON.parse(statsData);
          
          // Calculate stats for this service
          let upCount = 0;
          let totalResponseTime = 0;
          
          // Parse time range if specified (e.g., 30m, 1h, 24h)
          let timeRangeFilter = 0;
          if (timeRangeParam) {
            const match = timeRangeParam.match(/^(\d+)([mhdw])$/);
            if (match) {
              const value = parseInt(match[1], 10);
              const unit = match[2];
              
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
            }
          }
          
          // Apply time range filter if specified
          let filteredPings = pingData;
          if (timeRangeFilter > 0) {
            const cutoffTime = Date.now() - timeRangeFilter;
            filteredPings = pingData.filter((ping: any) => ping.timestamp >= cutoffTime);
          }
          
          filteredPings.forEach((ping: any) => {
            if (ping.status === 'up') upCount++;
            if (ping.responseTime) totalResponseTime += ping.responseTime;
          });
          
          // Add stats for this service
          stats[service.name] = {
            lastPing: filteredPings[0]?.timestamp || null,
            avgResponseTime: filteredPings.length ? Math.round(totalResponseTime / filteredPings.length) : 0,
            uptime: filteredPings.length ? Math.round((upCount / filteredPings.length) * 100) : 0,
            pings: filteredPings,
          };
        }
      }
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Calculate next run time based on cron schedule if available
    const nextRunEstimate = estimateNextCronRun(githubConfig.schedule);
    
    // Recent ping interval trends from GitHub Action runs
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
      nextEstimatedRun: nextRunEstimate,
      timeUntilNextRun: nextRunEstimate ? nextRunEstimate - now : null,
      lastIntervalReset: lastIntervalReset,
      githubAction: githubConfig,
      serviceStatuses,
      recentHistory: parsedPingHistory,
      intervalTrend,
      currentTime: now,
      stats: stats || {}
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

/**
 * Estimate the next run time based on cron expression
 * Note: This is a simple implementation that works for basic schedules
 */
function estimateNextCronRun(cronExpression: string): number | null {
  if (!cronExpression) return null;
  
  // Parse the cron expression (simple implementation)
  // Format: minute hour day month day-of-week
  // Example: */5 * * * * (every 5 minutes)
  const parts = cronExpression.split(' ');
  if (parts.length < 5) return null;
  
  const now = new Date();
  const result = new Date(now);
  
  // Handle simple interval notation (*/n)
  const minutePart = parts[0];
  if (minutePart.startsWith('*/')) {
    const interval = parseInt(minutePart.substring(2), 10);
    
    // Enforce minimum 5-minute interval (GitHub Actions requirement)
    if (isNaN(interval) || interval < 5) {
      console.warn(`Invalid cron interval: ${minutePart}. GitHub Actions requires minimum 5 minutes.`);
      // Default to 5 minutes if interval is invalid or less than 5
      const safeInterval = 5;
      
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil(currentMinute / safeInterval) * safeInterval;
      
      result.setMinutes(nextMinute >= 60 ? nextMinute - 60 : nextMinute);
      result.setSeconds(0);
      result.setMilliseconds(0);
      
      // If we've moved to the next hour
      if (nextMinute >= 60) {
        result.setHours(result.getHours() + 1);
      }
      
      // If the calculated time is in the past, add one more interval
      if (result <= now) {
        result.setMinutes(result.getMinutes() + safeInterval);
      }
      
      return result.getTime();
    }
    
    const currentMinute = now.getMinutes();
    const nextMinute = Math.ceil(currentMinute / interval) * interval;
    
    result.setMinutes(nextMinute >= 60 ? nextMinute - 60 : nextMinute);
    result.setSeconds(0);
    result.setMilliseconds(0);
    
    // If we've moved to the next hour
    if (nextMinute >= 60) {
      result.setHours(result.getHours() + 1);
    }
    
    // If the calculated time is in the past, add one more interval
    if (result <= now) {
      result.setMinutes(result.getMinutes() + interval);
    }
    
    return result.getTime();
  }
  
  // For more complex expressions, return a simple estimate
  return now.getTime() + 5 * 60 * 1000; // Default to 5 minutes (GitHub Actions minimum)
} 