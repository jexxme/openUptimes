import { useState, useEffect } from 'react';

interface PingStatsResponse {
  recentHistory: {
    timestamp: number;
  }[];
  lastPing: number;
}

export function usePingStats(refreshInterval = 60000) {
  const [stats, setStats] = useState<PingStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch24HourPingCount = async () => {
    try {
      setLoading(true);
      // Get all ping history entries
      const response = await fetch('/api/ping-stats?limit=0');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {

      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetch24HourPingCount();
    
    // Set up interval for auto-refresh
    const intervalId = setInterval(() => {
      fetch24HourPingCount();
    }, refreshInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Calculate the number of pings in the last 24 hours
  const getPingFrequency = () => {
    if (!stats?.recentHistory?.length) return { count: 0, loading, error };
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Count pings that occurred in the last 24 hours
    const count = stats.recentHistory.filter(ping => 
      ping.timestamp > oneDayAgo
    ).length;
    
    return { count, loading, error };
  };

  return {
    pingStats: stats,
    loading,
    error,
    getPingFrequency,
    refetch: fetch24HourPingCount
  };
} 