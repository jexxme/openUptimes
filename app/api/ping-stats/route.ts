import { NextResponse } from 'next/server';
import { getPingStats, getRedisClient, closeRedisConnection } from '@/lib/redis';

/**
 * API handler for /api/ping-stats
 * Returns statistics about the last ping and the next scheduled ping
 */
export async function GET() {
  try {
    // Get ping stats from Redis helper
    const stats = await getPingStats();
    
    // Get additional information
    const client = await getRedisClient();
    
    // Get the last cycle ID that triggered a ping
    const lastCycleId = await client.get('stats:last-cycle-id');
    
    // Get latest ping event info
    const pingEvents = await client.lRange('stats:ping-events', 0, 10) || [];
    const events = pingEvents.map((event: string) => {
      try {
        return JSON.parse(event);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    // Calculate countdown to next ping
    const nextPingCountdown = stats.nextPing ? Math.max(0, stats.nextPing - Date.now()) : null;
    
    // Get site config for reference
    const configStr = await client.get('config:site');
    let refreshInterval = 60000; // Default to 60s
    
    if (configStr) {
      const config = JSON.parse(configStr);
      refreshInterval = config.refreshInterval || 60000;
    }
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Calculate if the ping should have occurred but didn't
    const isOverdue = stats.nextPing && Date.now() > stats.nextPing + 10000; // 10s grace period
    
    return NextResponse.json({
      lastPing: stats.lastPing,
      nextPing: stats.nextPing,
      nextPingCountdown,
      isOverdue,
      lastCycleId,
      pingEvents: events.slice(0, 5), // Just send the 5 most recent
      refreshInterval,
      now: Date.now()
    });
  } catch (error) {
    console.error('Error fetching ping stats:', error);
    
    // Close Redis connection on error
    try {
      await closeRedisConnection();
    } catch (e) {
      console.error('Error closing Redis connection:', e);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch ping stats', message: (error as Error).message },
      { status: 500 }
    );
  }
} 