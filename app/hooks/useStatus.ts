import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';

type ServiceStatus = 'up' | 'down' | 'unknown';

interface StatusHistoryItem {
  status: ServiceStatus;
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface StatusData {
  name: string;
  url: string;
  description?: string;
  config?: {
    visible?: boolean;
    expectedStatus?: number;
  };
  currentStatus: {
    status: ServiceStatus;
    timestamp: number;
    responseTime?: number;
    statusCode?: number;
    error?: string;
  } | null;
  history?: StatusHistoryItem[];
}

/**
 * Custom hook to fetch and manage service status data
 */
export function useStatus(includeHistory = false, historyLimit = 60) {
  const [services, setServices] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Wrap fetchStatus in useCallback to prevent infinite useEffect loop
  const fetchStatus = useCallback(async () => {
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
      
      console.log(`Fetching status data from: ${url.toString()}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received status data:', data);
      
      setServices(data);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching status:', err);
      setError((err as Error).message);
      
      // If we haven't exceeded max retries, try again
      if (retryCount < maxRetries) {
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
        setRetryCount(prev => prev + 1);
        
        // Try ping endpoint first to trigger data collection
        try {
          await fetch('/api/ping');
          console.log('Ping successful, data should be available on next status check');
        } catch (pingErr) {
          console.error('Ping attempt failed:', pingErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [includeHistory, historyLimit, retryCount]);

  // Retry logic for initial load
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries) {
      const retryTimer = setTimeout(() => {
        console.log(`Executing retry ${retryCount} of ${maxRetries}`);
        fetchStatus();
      }, 2000); // Wait 2 seconds between retries
      
      return () => clearTimeout(retryTimer);
    }
  }, [retryCount, fetchStatus]);

  // Initial fetch
  useEffect(() => {
    // First call the ping endpoint to ensure we have fresh data
    fetch('/api/ping')
      .then(() => {
        console.log('Ping successful, fetching status data');
        fetchStatus();
      })
      .catch(err => {
        console.error('Initial ping failed:', err);
        fetchStatus(); // Try to fetch status anyway
      });
    
    // Set up polling interval for subsequent updates
    const interval = setInterval(fetchStatus, config.refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    services,
    loading,
    error,
    lastUpdated,
    refresh: fetchStatus
  };
} 