import { NextRequest, NextResponse } from 'next/server';

// Mock history data
type StatusType = 'up' | 'down' | 'unknown';

interface HistoryItem {
  status: StatusType;
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface ServiceHistory {
  name: string;
  history: HistoryItem[];
}

// Generate mock history data
function generateMockHistory(
  serviceName?: string | null,
  fromTimestamp?: number | null
): ServiceHistory[] {
  // Sample service names
  const serviceNames = ['Google', 'GitHub', 'Non-existent site'];
  const filteredServices = serviceName 
    ? [serviceName]
    : serviceNames;
  
  // Set the from time to 30 days ago if not specified
  const from = fromTimestamp || (Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Generate history for each service
  return filteredServices.map(name => {
    const history: HistoryItem[] = [];
    let timestamp = Date.now();
    
    // Generate one entry per day going back from today
    for (let i = 0; i < 30; i++) {
      // Add an entry if it's after the fromTimestamp
      if (timestamp > from) {
        // Generate more realistic status distribution:
        // Google: mostly up
        // GitHub: occasionally down
        // Non-existent: mostly down
        let status: StatusType;
        let statusCode: number | undefined;
        let responseTime: number | undefined;
        let error: string | undefined;
        
        if (name === 'Google') {
          // Google is up 95% of time
          const rand = Math.random();
          if (rand > 0.95) {
            status = 'down';
            statusCode = 500;
            responseTime = undefined;
            error = 'Internal Server Error';
          } else {
            status = 'up';
            statusCode = 200;
            responseTime = Math.floor(Math.random() * 100) + 50; // 50-150ms
            error = undefined;
          }
        } else if (name === 'GitHub') {
          // GitHub is down 10% of time
          const rand = Math.random();
          if (rand > 0.9) {
            status = 'down';
            statusCode = 503;
            responseTime = undefined;
            error = 'Service Unavailable';
          } else {
            status = 'up';
            statusCode = 200;
            responseTime = Math.floor(Math.random() * 150) + 100; // 100-250ms
            error = undefined;
          }
        } else {
          // Non-existent site is down 90% of time
          const rand = Math.random();
          if (rand > 0.1) {
            status = 'down';
            statusCode = undefined;
            responseTime = undefined;
            error = 'Connection failed';
          } else {
            status = 'unknown';
            statusCode = undefined;
            responseTime = undefined;
            error = 'Timeout';
          }
        }
        
        history.push({
          status,
          timestamp,
          responseTime,
          statusCode,
          error
        });
      }
      
      // Go back one day
      timestamp -= 24 * 60 * 60 * 1000;
    }
    
    return {
      name,
      history
    };
  });
}

/**
 * GET /api/history
 * Returns the historical status data for all services
 * 
 * Query Parameters:
 * - service: Filter by service name
 * - timeRange: Filter by time range (24h, 7d, 30d, all)
 * - limit: Limit the number of records returned
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('service');
    const timeRange = searchParams.get('timeRange');
    
    // Calculate timestamp filter based on timeRange
    let fromTimestamp: number | undefined;
    const now = Date.now();
    
    if (timeRange === '24h') {
      fromTimestamp = now - 24 * 60 * 60 * 1000; // 24 hours
    } else if (timeRange === '7d') {
      fromTimestamp = now - 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (timeRange === '30d') {
      fromTimestamp = now - 30 * 24 * 60 * 60 * 1000; // 30 days
    }
    
    // Generate mock history data
    const historyData = generateMockHistory(serviceName, fromTimestamp);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json(historyData);
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    );
  }
} 