import { useState, useEffect, useCallback } from 'react';

interface HistoricalStatus {
  status: string;
  timestamp: number;
}

interface ServiceHistory {
  name: string;
  history: HistoricalStatus[];
  uptimePercentage: number;
  isDeleted?: boolean;
  description?: string;
  url?: string;
}

export function useHistoricalData(timeRange = '90d') {
  const [data, setData] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build the URL with query parameters
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.append('timeRange', timeRange);
      
      // Add a timestamp to avoid browser caching
      url.searchParams.append('_t', Date.now().toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }
      
      const historyData = await response.json();

      // Calculate uptime percentage for each service
      const processedData = historyData.map((service: any) => {
        const upEntries = service.history.filter((entry: HistoricalStatus) => entry.status === 'up').length;
        const totalEntries = service.history.length;
        const uptimePercentage = totalEntries > 0 ? (upEntries / totalEntries) * 100 : 0;
        
        return {
          ...service,
          uptimePercentage
        };
      });
      
      setData(processedData);
      setError(null);
      return processedData;
    } catch (err) {

      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  
  // Explicitly expose a refetch function
  const refetch = useCallback(() => {

    return fetchHistoricalData();
  }, [fetchHistoricalData]);
  
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);
  
  return { data, loading, error, refetch };
} 