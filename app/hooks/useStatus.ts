import { useState, useEffect } from 'react';
import { config } from '@/lib/config';

type ServiceStatus = 'up' | 'down' | 'unknown';

interface StatusData {
  name: string;
  url: string;
  description?: string;
  currentStatus: {
    status: ServiceStatus;
    timestamp: number;
    responseTime?: number;
    statusCode?: number;
    error?: string;
  } | null;
}

export function useStatus(includeHistory = false, historyLimit = 60) {
  const [services, setServices] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      
      // Build the API URL with query parameters
      const url = new URL('/api/status', window.location.origin);
      if (includeHistory) {
        url.searchParams.append('history', 'true');
      }
      if (historyLimit) {
        url.searchParams.append('limit', historyLimit.toString());
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      
      const data = await response.json();
      setServices(data);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    
    // Set up polling interval
    const interval = setInterval(fetchStatus, config.refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [includeHistory, historyLimit]);

  return {
    services,
    loading,
    error,
    lastUpdated,
    refresh: fetchStatus
  };
} 