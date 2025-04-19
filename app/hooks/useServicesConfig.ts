import { useState, useEffect, useCallback } from 'react';
import { ServiceConfig } from '@/lib/config';

export function useServicesConfig(initialData?: ServiceConfig[]) {
  const [services, setServices] = useState<ServiceConfig[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Fetch all services with retry logic
  const fetchServices = useCallback(async (retry = false) => {
    // Reset retry count on manual refresh
    if (!retry) {
      setRetryCount(0);
    }

    try {
      setLoading(true);
      
      // Use AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const res = await fetch('/api/services', {
          signal: controller.signal,
          // Include a cache-busting parameter
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          // If we get a 500+ error, it might be a temporary server issue
          if (res.status >= 500 && retryCount < MAX_RETRIES) {
            throw new Error(`Server error: ${res.status}`);
          }
          throw new Error(`Failed to fetch services: ${res.status}`);
        }

        const data = await res.json();
        setServices(data);
        setError(null);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {

      // Special handling for AbortError (timeout)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError("Request timed out. The server may be busy.");
      } else {
        setError((err as Error).message);
      }
      
      // Implement retry logic for server errors or network issues
      if (retryCount < MAX_RETRIES && 
          (err instanceof Error && 
           (err.message.includes('Server error') || 
            err.message.includes('fetch')))) {
        
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);

        setTimeout(() => {
          fetchServices(true);
        }, backoffDelay);
      } else if (retryCount >= MAX_RETRIES) {
        setError(`Failed to fetch services after ${MAX_RETRIES} attempts. Please check your network connection and try again.`);
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  }, [retryCount]);

  // Add a new service
  const addService = useCallback(async (service: ServiceConfig) => {
    try {
      setIsUpdating(true);
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(service),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to add service: ${res.status}`);
      }

      await fetchServices(); // Refresh the list
      return true;
    } catch (err) {

      setError((err as Error).message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchServices]);

  // Update an existing service
  const updateService = useCallback(async (originalName: string, updatedService: ServiceConfig) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/services?name=${encodeURIComponent(originalName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedService),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to update service: ${res.status}`);
      }

      await fetchServices(); // Refresh the list
      return true;
    } catch (err) {

      setError((err as Error).message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchServices]);

  // Delete a service
  const deleteService = useCallback(async (name: string) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/services?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to delete service: ${res.status}`);
      }

      await fetchServices(); // Refresh the list
      return true;
    } catch (err) {

      setError((err as Error).message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchServices]);

  // Initial fetch
  useEffect(() => {
    // Skip initial fetch if we have initialData
    if (initialData && initialData.length > 0) {
      // Schedule a delayed fetch to get fresh data
      const timer = setTimeout(() => {
        fetchServices();
      }, 30000); // Delay refresh by 30 seconds
      
      return () => clearTimeout(timer);
    } else {
      fetchServices();
    }
  }, [fetchServices, initialData]);

  return {
    services,
    loading,
    error,
    isUpdating,
    fetchServices,
    addService,
    updateService,
    deleteService,
  };
} 