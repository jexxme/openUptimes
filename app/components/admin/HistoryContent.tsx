"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Import extracted components
import { 
  ServiceSelect, 
  StatusSelect, 
  ResponseCodeSelect, 
  TimeRangeSelect,
  DateTimePicker 
} from "@/app/components/admin/history/FilterComponents";
import {
  SortableColumnHeader,
  HistoryTableRow,
  formatTimestamp
} from "@/app/components/admin/history/TableComponents";

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
  refresh: () => void;
  initialService?: string | null;
  preloadedHistory?: { service: string; item: StatusHistoryItem }[];
}

export function HistoryContent({ 
  services, 
  statusLoading, 
  statusError, 
  refresh,
  initialService = null,
  preloadedHistory = undefined
}: HistoryContentProps) {
  // Base state
  const [timeRange, setTimeRange] = useState<string>("30m");
  const [selectedService, setSelectedService] = useState<string>(initialService || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedResponseCode, setSelectedResponseCode] = useState<string>("all");
  const [entriesLimit, setEntriesLimit] = useState<string>("10");
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);
  const [startDateStr, setStartDateStr] = useState<string>(
    format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [startTimeStr, setStartTimeStr] = useState<string>("00:00");
  const [endTimeStr, setEndTimeStr] = useState<string>("23:59");
  
  // Data state
  const [rawHistoryData, setRawHistoryData] = useState<{ service: string; item: StatusHistoryItem }[]>(
    preloadedHistory ? [...preloadedHistory] : []
  );
  const [filteredHistoryItems, setFilteredHistoryItems] = useState<{ service: string; item: StatusHistoryItem }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!preloadedHistory);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchParams, setLastFetchParams] = useState<{
    service: string;
    timeRange: string;
    isCustomRange: boolean;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'timestamp', 
    direction: 'desc' 
  });
  
  // Function to sort data based on column and direction
  const sortData = useCallback((data: { service: string; item: StatusHistoryItem }[], config: { key: string; direction: 'asc' | 'desc' }) => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      // Extract the correct values based on key
      if (config.key === 'service') {
        aValue = a.service;
        bValue = b.service;
      } else if (config.key === 'status') {
        aValue = a.item.status;
        bValue = b.item.status;
      } else if (config.key === 'timestamp') {
        aValue = a.item.timestamp;
        bValue = b.item.timestamp;
      } else if (config.key === 'responseTime') {
        aValue = a.item.responseTime || 0;
        bValue = b.item.responseTime || 0;
      } else if (config.key === 'statusCode') {
        aValue = a.item.statusCode || 0;
        bValue = b.item.statusCode || 0;
      } else if (config.key === 'error') {
        aValue = a.item.error || '';
        bValue = b.item.error || '';
      } else {
        return 0;
      }
      
      // Compare values based on direction
      if (config.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, []);
  
  // Apply all filters to raw data
  const applyFilters = useCallback(() => {
    if (!rawHistoryData.length) {
      setFilteredHistoryItems([]);
      return;
    }
    
    let filtered = [...rawHistoryData];
    
    // Filter by service if specified
    if (selectedService !== 'all') {
      filtered = filtered.filter(item => item.service === selectedService);
    }
    
    // Filter by status if specified
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.item.status === selectedStatus);
    }
    
    // Filter by response code if specified
    if (selectedResponseCode !== 'all') {
      filtered = filtered.filter(item => {
        if (selectedResponseCode === '2xx') {
          return item.item.statusCode && item.item.statusCode >= 200 && item.item.statusCode < 300;
        } else if (selectedResponseCode === '3xx') {
          return item.item.statusCode && item.item.statusCode >= 300 && item.item.statusCode < 400;
        } else if (selectedResponseCode === '4xx') {
          return item.item.statusCode && item.item.statusCode >= 400 && item.item.statusCode < 500;
        } else if (selectedResponseCode === '5xx') {
          return item.item.statusCode && item.item.statusCode >= 500 && item.item.statusCode < 600;
        } else if (selectedResponseCode === 'none') {
          return !item.item.statusCode;
        }
        return false;
      });
    }
    
    // Sort the data
    filtered = sortData(filtered, sortConfig);
    
    // Apply limit if not unlimited
    if (entriesLimit !== 'unlimited') {
      filtered = filtered.slice(0, parseInt(entriesLimit));
    }
    
    setFilteredHistoryItems(filtered);
  }, [rawHistoryData, selectedService, selectedStatus, selectedResponseCode, entriesLimit, sortConfig, sortData]);
  
  // Fetch history data from the API (only concerned with getting data)
  const fetchHistoryData = useCallback(async (forceFetch = false) => {
    // Should we fetch new data?
    const shouldFetch = forceFetch || !lastFetchParams || 
      lastFetchParams.service !== selectedService ||
      lastFetchParams.timeRange !== timeRange ||
      lastFetchParams.isCustomRange !== isCustomRange ||
      (isCustomRange && (
        lastFetchParams.startDate !== startDateStr ||
        lastFetchParams.endDate !== endDateStr ||
        lastFetchParams.startTime !== startTimeStr ||
        lastFetchParams.endTime !== endTimeStr
      ));
    
    // If nothing has changed that would require a new fetch, just reapply filters
    if (!shouldFetch) {
      applyFilters();
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Build API URL with filters
      const url = new URL('/api/history', window.location.origin);
      if (selectedService !== 'all') {
        url.searchParams.append('service', selectedService);
      }
      
      // Add the includeDeleted parameter
      url.searchParams.append('includeDeleted', 'true');
      
      // Handle different time ranges
      if (isCustomRange && startDateStr && endDateStr) {
        // Convert date and time strings to timestamps
        const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
        const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
        
        const startDate = new Date(startDateStr);
        startDate.setHours(startHours, startMinutes, 0, 0);
        
        const endDate = new Date(endDateStr);
        endDate.setHours(endHours, endMinutes, 59, 999);
        
        url.searchParams.append('startTime', startDate.getTime().toString());
        url.searchParams.append('endTime', endDate.getTime().toString());
      } else {
        url.searchParams.append('timeRange', timeRange);
      }
      
      // Fetch data with timeout to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Failed to fetch history: ${response.status}`;
        } catch (e) {
          errorMessage = `Failed to fetch history: ${response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Process data into a flat array for display
      let allHistory: { service: string; item: StatusHistoryItem }[] = [];
      
      data.forEach((service: { name: string; history: StatusHistoryItem[] }) => {
        if (service && service.name && Array.isArray(service.history)) {
          service.history.forEach(item => {
            if (item && typeof item === 'object' && item.status && item.timestamp) {
              allHistory.push({ 
                service: service.name, 
                item
              });
            }
          });
        }
      });
      
      // Update the raw history data
      setRawHistoryData(allHistory);
      
      // Save what we just fetched to avoid redundant fetches
      setLastFetchParams({
        service: selectedService,
        timeRange: timeRange,
        isCustomRange: isCustomRange,
        startDate: startDateStr,
        endDate: endDateStr,
        startTime: startTimeStr,
        endTime: endTimeStr
      });
      
    } catch (err) {
      console.error('Error fetching history:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService, timeRange, isCustomRange, startDateStr, endDateStr, startTimeStr, endTimeStr, lastFetchParams, applyFilters]);
  
  // Whenever raw data or filter/sort criteria change, reapply filters
  useEffect(() => {
    applyFilters();
  }, [rawHistoryData, selectedService, selectedStatus, selectedResponseCode, entriesLimit, sortConfig, applyFilters]);
  
  // Handle button click events (without parameter collision)
  const handleRefresh = useCallback(() => {
    fetchHistoryData(true);
  }, [fetchHistoryData]);

  // Apply custom date range
  const handleApplyCustomRange = useCallback(() => {
    fetchHistoryData(true);
  }, [fetchHistoryData]);

  // Handle try again after error
  const handleTryAgain = useCallback(() => {
    fetchHistoryData(true);
  }, [fetchHistoryData]);
  
  // Initialize data on component mount
  useEffect(() => {
    // If we have preloaded history, use it
    if (preloadedHistory && !lastFetchParams) {
      console.log("Using preloaded history data on initial load");
      setRawHistoryData(preloadedHistory);
      setLastFetchParams({
        service: selectedService,
        timeRange: timeRange,
        isCustomRange: isCustomRange,
        startDate: startDateStr,
        endDate: endDateStr,
        startTime: startTimeStr,
        endTime: endTimeStr
      });
      
      // If there's a specific service selected, fetch fresh data for that service
      if (selectedService !== 'all') {
        const timer = setTimeout(() => {
          console.log("Fetching fresh data for selected service:", selectedService);
          fetchHistoryData(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    } else if (!preloadedHistory && !lastFetchParams) {
      // No preloaded data, fetch on first mount
      fetchHistoryData(true);
    }
  }, [preloadedHistory, selectedService, timeRange, isCustomRange, startDateStr, endDateStr, 
      startTimeStr, endTimeStr, lastFetchParams, fetchHistoryData]);
  
  // Handle time range changes
  const handleTimeRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setTimeRange(value);
    }
  };
  
  // Function to handle column sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // If same column, toggle direction
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // If new column, default to descending
        return {
          key,
          direction: 'desc'
        };
      }
    });
  };
  
  // Use initialService when it changes
  useEffect(() => {
    if (initialService && initialService !== selectedService) {
      setSelectedService(initialService);
    }
  }, [initialService, selectedService]);
  
  // Export history data as CSV
  const exportCSV = () => {
    // Create CSV header and data rows
    const csvHeader = "Service,Status,Timestamp,Response Time (ms),Status Code,Error\n";
    const csvRows = filteredHistoryItems.map(({ service, item }) => {
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
              <CardTitle>Data Insights</CardTitle>
              <CardDescription>Analyze status changes and response times over time</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center px-3 py-1 rounded-md bg-muted/40 dark:bg-muted/20 border border-border">
                <div className="flex flex-col">
                  <Label htmlFor="entries-limit-select" className="text-xs text-muted-foreground mb-1">Display rows</Label>
                  <select 
                    id="entries-limit-select"
                    className="bg-transparent border-0 h-6 px-0 py-0 text-sm font-medium focus:ring-0 focus-visible:outline-none"
                    value={entriesLimit} 
                    onChange={(e) => setEntriesLimit(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="10">10 entries</option>
                    <option value="50">50 entries</option>
                    <option value="100">100 entries</option>
                    <option value="250">250 entries</option>
                    <option value="500">500 entries</option>
                    <option value="1000">1000 entries</option>
                    <option value="unlimited">All entries</option>
                  </select>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading || filteredHistoryItems.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-3">
            <ServiceSelect 
              services={services} 
              selectedService={selectedService} 
              setSelectedService={setSelectedService} 
              isLoading={isLoading} 
            />
            <StatusSelect 
              selectedStatus={selectedStatus} 
              setSelectedStatus={setSelectedStatus} 
              isLoading={isLoading} 
            />
            <ResponseCodeSelect 
              selectedResponseCode={selectedResponseCode} 
              setSelectedResponseCode={setSelectedResponseCode} 
              isLoading={isLoading} 
            />
            <TimeRangeSelect 
              timeRange={timeRange} 
              isCustomRange={isCustomRange} 
              isLoading={isLoading} 
              handleTimeRangeChange={handleTimeRangeChange} 
            />
          </div>
          
          {isCustomRange && (
            <DateTimePicker 
              startDateStr={startDateStr}
              setStartDateStr={setStartDateStr}
              endDateStr={endDateStr}
              setEndDateStr={setEndDateStr}
              startTimeStr={startTimeStr}
              setStartTimeStr={setStartTimeStr}
              endTimeStr={endTimeStr}
              setEndTimeStr={setEndTimeStr}
              isLoading={isLoading}
              handleApplyCustomRange={handleApplyCustomRange}
            />
          )}
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center mt-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center mt-6 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/30">
              <p className="mb-4 font-medium text-red-700 dark:text-red-400">{error}</p>
              <Button onClick={handleTryAgain} variant="secondary">Try Again</Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden mt-6 shadow-sm">
              <div className="grid grid-cols-12 bg-muted/50 dark:bg-muted/20 p-3 text-xs font-medium text-muted-foreground">
                <SortableColumnHeader columnKey="service" width={2} label="Service" sortConfig={sortConfig} handleSort={handleSort} />
                <SortableColumnHeader columnKey="status" width={2} label="Status" sortConfig={sortConfig} handleSort={handleSort} />
                <SortableColumnHeader columnKey="timestamp" width={3} label="Timestamp" sortConfig={sortConfig} handleSort={handleSort} />
                <SortableColumnHeader columnKey="responseTime" width={1} label="Response" sortConfig={sortConfig} handleSort={handleSort} />
                <SortableColumnHeader columnKey="statusCode" width={1} label="Code" sortConfig={sortConfig} handleSort={handleSort} />
                <SortableColumnHeader columnKey="error" width={3} label="Error" sortConfig={sortConfig} handleSort={handleSort} />
              </div>
              
              <div className="divide-y divide-border">
                {filteredHistoryItems.length > 0 ? (
                  filteredHistoryItems.map(({ service, item }, index) => (
                    <HistoryTableRow 
                      key={`${service}-${item.timestamp}-${index}`}
                      service={service} 
                      item={item} 
                      index={index} 
                    />
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <p className="mb-1 text-sm font-medium">No history data available</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your filters or selecting a different time range</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Last updated: {new Date().toLocaleString()}</span>
            <span>{filteredHistoryItems.length} records found</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 