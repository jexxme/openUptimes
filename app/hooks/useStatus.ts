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

// Global state to prevent duplicate requests
type CacheEntry = {
  data: StatusData[];
  timestamp: number;
  lastUpdated: string;
};

const CACHE_DURATION = 5000; // 5 seconds cache
let globalCache: CacheEntry | null = null;
let activeRequest: Promise<StatusData[]> | null = null;
let hookInstanceCount = 0;

/**
 * Custom hook to fetch and manage service status data
 */
export function useStatus(
  includeHistory = false, 
  historyLimit = 60, 
  initialData?: StatusData[],
  filterByVisibility = true
) {
  const [services, setServices] = useState<StatusData[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [instanceId] = useState(() => ++hookInstanceCount);
  const maxRetries = 3;

  // Function to check if cached data is valid
  const isCacheValid = () => {
    return globalCache && (Date.now() - globalCache.timestamp < CACHE_DURATION);
  };

  // Wrap fetchStatus in useCallback to prevent infinite useEffect loop
  const fetchStatus = useCallback(async (force = false) => {
    // Skip if we're already fetching and it's not a forced refresh
    if (activeRequest && !force) {

      try {
        const data = await activeRequest;
        setServices(data);
        setLastUpdated(globalCache?.lastUpdated || new Date().toLocaleString());
        setLoading(false);
        return;
      } catch (err) {
        // Will be handled by the active request
        return;
      }
    }

    // Use cache if available and not forcing refresh
    if (!force && isCacheValid()) {

      setServices(globalCache!.data);
      setLastUpdated(globalCache!.lastUpdated);
      setLoading(false);
      setError(null);
      return;
    }

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
      
      // Add filterByVisibility parameter
      if (!filterByVisibility) {
        url.searchParams.append('filterByVisibility', 'false');
      }
      
      // Add timestamp to prevent browser caching
      url.searchParams.append('_t', Date.now().toString());

      // Store the promise to prevent duplicate requests
      const fetchPromise = fetch(url.toString(), {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Add a longer timeout for the fetch
        signal: AbortSignal.timeout(10000) // 10 seconds timeout
      }).then(async response => {
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
        }
        return response.json();
      });
      
      activeRequest = fetchPromise;
      
      const data = await fetchPromise;

      // Update local state and global cache
      const now = new Date().toLocaleString();
      setServices(data);
      setLastUpdated(now);
      setError(null);
      setRetryCount(0); // Reset retry count on success
      
      // Update global cache
      globalCache = {
        data,
        timestamp: Date.now(),
        lastUpdated: now
      };
    } catch (err) {

      // If we still have valid cache data, use it despite the error
      if (globalCache && globalCache.data.length > 0) {

        setServices(globalCache.data);
        setLastUpdated(`${globalCache.lastUpdated} (stale)`);
      }
      
      setError((err as Error).message);
      
      // If we haven't exceeded max retries, try again
      if (retryCount < maxRetries) {
        const nextRetry = retryCount + 1;

        setRetryCount(nextRetry);
        
        // Exponential backoff for retries
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 8000);

        // Try manual ping if we need data
        if (globalCache === null || globalCache.data.length === 0) {
          try {

            await fetch('/api/ping', { 
              signal: AbortSignal.timeout(5000),
              headers: {
                'Cache-Control': 'no-cache'
              }
            });

          } catch (pingErr) {

          }
        }
      } else {

      }
    } finally {
      setLoading(false);
      activeRequest = null;  // Clear active request flag
    }
  }, [includeHistory, historyLimit, retryCount, instanceId, filterByVisibility]);

  // Retry logic for initial load
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries) {
      // Exponential backoff for retries
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);

      const retryTimer = setTimeout(() => {

        fetchStatus(true); // Force refresh on retry
      }, retryDelay);
      
      return () => clearTimeout(retryTimer);
    }
  }, [retryCount, fetchStatus, instanceId, maxRetries]);

  // Initial fetch
  useEffect(() => {

    // If we have initial data, don't fetch immediately
    if (initialData && initialData.length > 0) {
      setServices(initialData);
      setLoading(false);
      setLastUpdated("Using preloaded data");
      
      // Only update the cache if it's empty
      if (!globalCache) {
        globalCache = {
          data: initialData,
          timestamp: Date.now(),
          lastUpdated: "Using preloaded data"
        };
      }
      
      // Schedule a delayed fetch to get fresh data
      const timer = setTimeout(() => {

        fetchStatus();
      }, 30000); // 30 seconds
      
      return () => clearTimeout(timer);
    } else {
      // Check cache first
      if (isCacheValid()) {

        setServices(globalCache!.data);
        setLastUpdated(globalCache!.lastUpdated);
        setLoading(false);
        
        // Still schedule a refresh but with a delay
        const refreshTimer = setTimeout(() => {
          fetchStatus();
        }, 5000);
        
        return () => clearTimeout(refreshTimer);
      }
      
      // Just fetch the data without triggering ping first
      fetchStatus();
    }
    
    // Set up polling interval for subsequent updates
    const interval = setInterval(() => {
      fetchStatus();
    }, config.refreshInterval);
    
    // Clean up interval on unmount
    return () => {

      clearInterval(interval);
    };
  }, [fetchStatus, initialData, instanceId]);

  return {
    services,
    loading,
    error,
    lastUpdated,
    refresh: () => fetchStatus(true) // Force refresh when manually called
  };
} 