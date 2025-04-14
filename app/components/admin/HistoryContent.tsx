"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";

// Types from useStatus hook
interface StatusHistoryItem {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface StatusData {
  name: string;
  url: string;
  description?: string;
  currentStatus: {
    status: 'up' | 'down' | 'unknown';
    timestamp: number;
    responseTime?: number;
    statusCode?: number;
    error?: string;
  } | null;
  history?: StatusHistoryItem[];
}

interface HistoryContentProps {
  services: StatusData[];
  statusLoading: boolean;
  statusError: string | null;
  lastUpdated: string;
  refresh: () => void;
  initialService?: string | null;
}

export function HistoryContent({ 
  services, 
  statusLoading, 
  statusError, 
  lastUpdated, 
  refresh,
  initialService = null
}: HistoryContentProps) {
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedService, setSelectedService] = useState<string>(initialService || "all");
  const [historyItems, setHistoryItems] = useState<{ service: string; item: StatusHistoryItem }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use initialService when it changes
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
    }
  }, [initialService]);
  
  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Fetch history data from the API
  const fetchHistoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build API URL with filters
      const url = new URL('/api/history', window.location.origin);
      if (selectedService !== 'all') {
        url.searchParams.append('service', selectedService);
      }
      url.searchParams.append('timeRange', timeRange);
      
      // Fetch data
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process data into a flat array for display
      let allHistory: { service: string; item: StatusHistoryItem }[] = [];
      
      data.forEach((service: { name: string; history: StatusHistoryItem[] }) => {
        service.history.forEach(item => {
          allHistory.push({ service: service.name, item });
        });
      });
      
      // Sort by timestamp descending (newest first)
      allHistory.sort((a, b) => b.item.timestamp - a.item.timestamp);
      
      setHistoryItems(allHistory);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService, timeRange]);
  
  // Fetch history data when filters change
  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);
  
  // Export history data as CSV
  const exportCSV = () => {
    // Create CSV header and data rows
    const csvHeader = "Service,Status,Timestamp,Response Time (ms),Status Code,Error\n";
    const csvRows = historyItems.map(({ service, item }) => {
      return `"${service}","${item.status}","${formatTimestamp(item.timestamp)}","${item.responseTime || ''}","${item.statusCode || ''}","${(item.error || '').replace(/"/g, '""')}"`;
    }).join("\n");
    
    const csvContent = csvHeader + csvRows;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `uptime-history-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get status color based on status
  const getStatusColor = (status: 'up' | 'down' | 'unknown') => {
    if (status === 'up') return 'bg-green-100 text-green-800';
    if (status === 'down') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  if (statusLoading && services.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500 mb-4">{statusError}</p>
          <Button onClick={refresh}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>View historical uptime data for your services</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchHistoryData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading || historyItems.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div>
              <p className="text-sm font-medium mb-1.5">Service</p>
              <select 
                className="w-[180px] rounded-md border border-input px-3 py-2 text-sm ring-offset-background"
                value={selectedService} 
                onChange={(e) => setSelectedService(e.target.value)}
                disabled={isLoading}
              >
                <option value="all">All Services</option>
                {services.map(service => (
                  <option key={service.name} value={service.name}>{service.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1.5">Time Range</p>
              <select 
                className="w-[180px] rounded-md border border-input px-3 py-2 text-sm ring-offset-background"
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                disabled={isLoading}
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              <p className="mb-4">{error}</p>
              <Button onClick={fetchHistoryData}>Try Again</Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-12 bg-muted/50 p-3 text-xs font-medium">
                <div className="col-span-2">Service</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Timestamp</div>
                <div className="col-span-1">Response Time</div>
                <div className="col-span-1">Status Code</div>
                <div className="col-span-3">Error</div>
              </div>
              
              <div className="divide-y">
                {historyItems.length > 0 ? (
                  historyItems.map(({ service, item }, index) => (
                    <div key={index} className="grid grid-cols-12 p-3 text-sm items-center">
                      <div className="col-span-2 font-medium">{service}</div>
                      <div className="col-span-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-3">{formatTimestamp(item.timestamp)}</div>
                      <div className="col-span-1">{item.responseTime ? `${item.responseTime}ms` : '-'}</div>
                      <div className="col-span-1">{item.statusCode || '-'}</div>
                      <div className="col-span-3 text-xs truncate" title={item.error}>{item.error || '-'}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No history data available for the selected filters.
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-3 text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 