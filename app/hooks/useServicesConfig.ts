import { useState, useEffect, useCallback } from 'react';
import { ServiceConfig } from '@/lib/config';

export function useServicesConfig() {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      if (!res.ok) {
        throw new Error(`Failed to fetch services: ${res.status}`);
      }
      const data = await res.json();
      setServices(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

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
      console.error('Error adding service:', err);
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
      console.error('Error updating service:', err);
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
      console.error('Error deleting service:', err);
      setError((err as Error).message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchServices]);

  // Initial fetch
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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