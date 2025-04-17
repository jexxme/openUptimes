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
    
    const now = Date.now();
    
    return NextResponse.json({
      lastPing: lastPing ? parseInt(lastPing, 10) : null,
      nextEstimatedRun: nextRunEstimate,
      timeUntilNextRun: nextRunEstimate ? nextRunEstimate - now : null,
      lastIntervalReset: lastIntervalReset,
      githubAction: githubConfig,
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