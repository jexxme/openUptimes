import { useState, useEffect } from 'react';

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
}

export function useHistoricalData(timeRange = '90d') {
  const [data, setData] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        setLoading(true);
        
        // Build the URL with query parameters
        const url = new URL('/api/history', window.location.origin);
        url.searchParams.append('timeRange', timeRange);
        
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
      } catch (err) {
        console.error('Error fetching historical data:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistoricalData();
  }, [timeRange]);
  
  return { data, loading, error };
} 