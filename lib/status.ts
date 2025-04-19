import { getServiceHistory } from './redis';
import { services } from './config';

// Define status types
export type ServiceStatus = 'up' | 'down' | 'unknown';

export interface StatusHistoryItem {
  status: ServiceStatus;
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

export interface ServiceData {
  name: string;
  history: StatusHistoryItem[];
}

/**
 * Get history data for all or a specific service
 * 
 * @param serviceName Optional service name to filter by
 * @param fromTimestamp Optional timestamp to filter from (newer than this)
 * @param limit Optional limit on number of records to return per service
 * @returns Array of service history data
 */
export async function getStatusHistory(
  serviceName?: string | null, 
  fromTimestamp?: number | null,
  limit?: number | null
): Promise<ServiceData[]> {
  try {
    // Get configured services
    const serviceNames = serviceName 
      ? [serviceName] 
      : services.map((s) => s.name);
    
    const historyLimit = limit || 1440; // Default to 24h at 1-minute intervals
    
    // Fetch history for each service
    const results = await Promise.all(
      serviceNames.map(async (name: string) => {
        const history = await getServiceHistory(name, historyLimit);
        
        // Filter by timestamp if provided
        const filteredHistory = fromTimestamp 
          ? history.filter(item => item.timestamp > fromTimestamp)
          : history;
        
        return {
          name,
          history: filteredHistory
        };
      })
    );
    
    return results;
  } catch (error) {

    return [];
  }
} 