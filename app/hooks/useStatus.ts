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
let pingRequestTimestamp = 0;
let hookInstanceCount = 0;

/**
 * Custom hook to fetch and manage service status data
 */
export function useStatus(includeHistory = false, historyLimit = 60, initialData?: StatusData[]) {
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
      console.log(`[useStatus:${instanceId}] Request already in progress, waiting...`);
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
      console.log(`[useStatus:${instanceId}] Using cached data, age: ${Date.now() - globalCache!.timestamp}ms`);
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
      
      // Add timestamp to prevent browser caching
      url.searchParams.append('_t', Date.now().toString());
      
      console.log(`[useStatus:${instanceId}] Fetching status data from: ${url.toString()}`);

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
      console.log(`[useStatus:${instanceId}] Received status data:`, data);
      
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
      console.error(`[useStatus:${instanceId}] Error fetching status:`, err);
      
      // If we still have valid cache data, use it despite the error
      if (globalCache && globalCache.data.length > 0) {
        console.log(`[useStatus:${instanceId}] Using stale cache data after error`);
        setServices(globalCache.data);
        setLastUpdated(`${globalCache.lastUpdated} (stale)`);
      }
      
      setError((err as Error).message);
      
      // If we haven't exceeded max retries, try again
      if (retryCount < maxRetries) {
        const nextRetry = retryCount + 1;
        console.log(`[useStatus:${instanceId}] Scheduling retry ${nextRetry} of ${maxRetries}`);
        setRetryCount(nextRetry);
        
        // Exponential backoff for retries
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[useStatus:${instanceId}] Will retry in ${backoffTime}ms`);
        
        // Only ping if we haven't pinged recently
        if (Date.now() - pingRequestTimestamp > 5000) {
          pingRequestTimestamp = Date.now();
          try {
            // Try to trigger a service check
            console.log(`[useStatus:${instanceId}] Triggering ping to refresh service data`);
            await fetch('/api/ping', { 
              signal: AbortSignal.timeout(5000),
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            console.log(`[useStatus:${instanceId}] Ping successful`);
          } catch (pingErr) {
            console.error(`[useStatus:${instanceId}] Ping attempt failed:`, pingErr);
          }
        }
      } else {
        console.log(`[useStatus:${instanceId}] Maximum retries (${maxRetries}) exceeded`);
      }
    } finally {
      setLoading(false);
      activeRequest = null;  // Clear active request flag
    }
  }, [includeHistory, historyLimit, retryCount, instanceId]);

  // Retry logic for initial load
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries) {
      // Exponential backoff for retries
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
      
      console.log(`[useStatus:${instanceId}] Scheduled retry ${retryCount} of ${maxRetries} in ${retryDelay}ms`);
      const retryTimer = setTimeout(() => {
        console.log(`[useStatus:${instanceId}] Executing retry ${retryCount} of ${maxRetries}`);
        fetchStatus(true); // Force refresh on retry
      }, retryDelay);
      
      return () => clearTimeout(retryTimer);
    }
  }, [retryCount, fetchStatus, instanceId, maxRetries]);

  // Initial fetch
  useEffect(() => {
    console.log(`[useStatus:${instanceId}] Hook instance mounted, initialData:`, !!initialData);
    
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
        console.log(`[useStatus:${instanceId}] Fetching fresh data after using initialData`);
        fetchStatus();
      }, 30000); // Increased from 3000ms to 30000ms (30 seconds)
      
      return () => clearTimeout(timer);
    } else {
      // Check cache first
      if (isCacheValid()) {
        console.log(`[useStatus:${instanceId}] Using cached data on mount`);
        setServices(globalCache!.data);
        setLastUpdated(globalCache!.lastUpdated);
        setLoading(false);
        
        // Still schedule a refresh but with a delay
        const refreshTimer = setTimeout(() => {
          fetchStatus();
        }, 5000);
        
        return () => clearTimeout(refreshTimer);
      }
      
      // If we need a fresh ping, do it only if one hasn't been done recently
      if (Date.now() - pingRequestTimestamp > 5000) {
        pingRequestTimestamp = Date.now();
        fetch('/api/ping')
          .then(() => {
            console.log(`[useStatus:${instanceId}] Ping successful, fetching status data`);
            fetchStatus();
          })
          .catch(err => {
            console.error(`[useStatus:${instanceId}] Initial ping failed:`, err);
            fetchStatus(); // Try to fetch status anyway
          });
      } else {
        // Recent ping happened, just fetch the data
        fetchStatus();
      }
    }
    
    // Set up polling interval for subsequent updates
    const interval = setInterval(() => {
      fetchStatus();
    }, config.refreshInterval);
    
    // Clean up interval on unmount
    return () => {
      console.log(`[useStatus:${instanceId}] Hook instance unmounted`);
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