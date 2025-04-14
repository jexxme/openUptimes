"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Filter, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";

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
  preloadedHistory?: { service: string; item: StatusHistoryItem }[];
}

export function HistoryContent({ 
  services, 
  statusLoading, 
  statusError, 
  lastUpdated, 
  refresh,
  initialService = null,
  preloadedHistory = undefined
}: HistoryContentProps) {
  const [timeRange, setTimeRange] = useState<string>("30m");
  const [selectedService, setSelectedService] = useState<string>(initialService || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedResponseCode, setSelectedResponseCode] = useState<string>("all");
  const [entriesLimit, setEntriesLimit] = useState<string>("50");
  const [historyItems, setHistoryItems] = useState<{ service: string; item: StatusHistoryItem }[]>(preloadedHistory || []);
  const [isLoading, setIsLoading] = useState<boolean>(!preloadedHistory);
  const [error, setError] = useState<string | null>(null);
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'timestamp', 
    direction: 'desc' 
  });
  
  // Simple date strings in YYYY-MM-DD format for input type="date"
  const [startDateStr, setStartDateStr] = useState<string>(
    format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  
  // Time strings in HH:MM format for input type="time"
  const [startTimeStr, setStartTimeStr] = useState<string>("00:00");
  const [endTimeStr, setEndTimeStr] = useState<string>("23:59");
  
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
      
      // Apply client-side filtering for status and response code
      if (selectedStatus !== 'all') {
        allHistory = allHistory.filter(item => item.item.status === selectedStatus);
      }
      
      if (selectedResponseCode !== 'all') {
        allHistory = allHistory.filter(item => {
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
      
      // Sort the data based on sort configuration
      allHistory = sortData(allHistory, sortConfig);
      
      // Apply entries limit if not unlimited
      if (entriesLimit !== 'unlimited') {
        allHistory = allHistory.slice(0, parseInt(entriesLimit));
      }
      
      setHistoryItems(allHistory);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService, timeRange, isCustomRange, startDateStr, endDateStr, startTimeStr, endTimeStr, selectedStatus, selectedResponseCode, entriesLimit, sortConfig]);
  
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
  
  // Function to sort data based on column and direction
  const sortData = (data: { service: string; item: StatusHistoryItem }[], config: { key: string; direction: 'asc' | 'desc' }) => {
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
  };
  
  // Handle time range changes
  const handleTimeRangeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setTimeRange(value);
    }
  };
  
  // Fetch history data when filters change
  useEffect(() => {
    // Skip initial fetch if we have preloaded data
    if (preloadedHistory && historyItems === preloadedHistory) {
      // Apply filters to preloaded data
      let filteredHistory = [...preloadedHistory];
      
      if (selectedStatus !== 'all') {
        filteredHistory = filteredHistory.filter(item => item.item.status === selectedStatus);
      }
      
      if (selectedResponseCode !== 'all') {
        filteredHistory = filteredHistory.filter(item => {
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
      filteredHistory = sortData(filteredHistory, sortConfig);
      
      // Apply limit
      if (entriesLimit !== 'unlimited') {
        filteredHistory = filteredHistory.slice(0, parseInt(entriesLimit));
      }
      
      setHistoryItems(filteredHistory);
      setIsLoading(false);
      return;
    }
    
    // Otherwise fetch data normally
    fetchHistoryData();
  }, [fetchHistoryData, preloadedHistory, selectedStatus, selectedResponseCode, entriesLimit, sortConfig]);
  
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
  
  const getStatusBadgeClass = (status: 'up' | 'down' | 'unknown') => {
    return cn(
      "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
      status === 'up' ? 'bg-green-100 text-green-800' : 
      status === 'down' ? 'bg-red-100 text-red-800' : 
      'bg-gray-100 text-gray-800'
    );
  };
  
  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const TimeRangeSelect = () => (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-1 mb-1">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <Label htmlFor="time-range" className="text-sm font-medium">Time Range</Label>
      </div>
      <div className="relative">
        <select 
          id="time-range"
          className={selectClass}
          value={isCustomRange ? 'custom' : timeRange}
          onChange={(e) => handleTimeRangeChange(e.target.value)}
          disabled={isLoading}
        >
          <option value="30m">Last 30 minutes</option>
          <option value="1h">Last 1 hour</option>
          <option value="2h">Last 2 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
    </div>
  );

  const ServiceSelect = () => (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-1 mb-1">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Label htmlFor="service-select" className="text-sm font-medium">Service</Label>
      </div>
      <div className="relative">
        <select 
          id="service-select"
          className={selectClass}
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
    </div>
  );
  
  const StatusSelect = () => (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-1 mb-1">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Label htmlFor="status-select" className="text-sm font-medium">Status</Label>
      </div>
      <div className="relative">
        <select 
          id="status-select"
          className={selectClass}
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={isLoading}
        >
          <option value="all">All Statuses</option>
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
    </div>
  );
  
  const ResponseCodeSelect = () => (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-1 mb-1">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Label htmlFor="response-code-select" className="text-sm font-medium">Response Code</Label>
      </div>
      <div className="relative">
        <select 
          id="response-code-select"
          className={selectClass}
          value={selectedResponseCode} 
          onChange={(e) => setSelectedResponseCode(e.target.value)}
          disabled={isLoading}
        >
          <option value="all">All Codes</option>
          <option value="2xx">2xx (Success)</option>
          <option value="3xx">3xx (Redirection)</option>
          <option value="4xx">4xx (Client Error)</option>
          <option value="5xx">5xx (Server Error)</option>
          <option value="none">No Code</option>
        </select>
      </div>
    </div>
  );
  
  const EntriesLimitSelect = () => (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center gap-1 mb-1">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Label htmlFor="entries-limit-select" className="text-sm font-medium">Entries</Label>
      </div>
      <div className="relative">
        <select 
          id="entries-limit-select"
          className={selectClass}
          value={entriesLimit} 
          onChange={(e) => setEntriesLimit(e.target.value)}
          disabled={isLoading}
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="250">250</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </div>
    </div>
  );
  
  const DateTimePicker = () => (
    <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 p-2 bg-muted/20 rounded-md border border-dashed">
      {/* Start Date/Time Column */}
      <div className="flex-1">
        <Label htmlFor="start-date" className="text-xs font-medium inline-flex items-center mb-1">
          <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
          Start
        </Label>
        <div className="relative flex items-center space-x-1">
          <Input
            id="start-date"
            type="date"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            className="w-[130px] bg-background h-8 text-xs px-1 py-0"
            disabled={isLoading}
          />
          <Input
            id="start-time"
            type="time"
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
            className="w-[85px] bg-background h-8 text-xs px-1 py-0"
            disabled={isLoading}
          />
        </div>
      </div>
      
      {/* End Date/Time Column */}
      <div className="flex-1">
        <Label htmlFor="end-date" className="text-xs font-medium inline-flex items-center mb-1">
          <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
          End
        </Label>
        <div className="relative flex items-center space-x-1">
          <Input
            id="end-date"
            type="date"
            value={endDateStr}
            onChange={(e) => setEndDateStr(e.target.value)}
            className="w-[130px] bg-background h-8 text-xs px-1 py-0"
            disabled={isLoading}
          />
          <Input
            id="end-time"
            type="time"
            value={endTimeStr}
            onChange={(e) => setEndTimeStr(e.target.value)}
            className="w-[85px] bg-background h-8 text-xs px-1 py-0"
            disabled={isLoading}
          />
        </div>
      </div>
      
      {/* Apply Button */}
      <div className="flex-none self-end">
        <Button 
          variant="secondary"
          onClick={fetchHistoryData}
          disabled={isLoading || !startDateStr || !endDateStr}
          className="h-8 px-2 text-xs"
          size="sm"
        >
          Apply
        </Button>
      </div>
    </div>
  );
  
  // Sortable column header component
  const SortableColumnHeader = ({ columnKey, width, label }: { columnKey: string, width: number, label: string }) => {
    const isActive = sortConfig.key === columnKey;
    
    return (
      <div 
        className={`col-span-${width} flex items-center gap-0.5 cursor-pointer hover:text-foreground transition-colors`}
        onClick={() => handleSort(columnKey)}
      >
        {label}
        {isActive && (
          <span className="inline-block ml-0.5">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    );
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
          <div className="flex flex-wrap gap-3 mb-3">
            <ServiceSelect />
            <StatusSelect />
            <ResponseCodeSelect />
            <TimeRangeSelect />
            <EntriesLimitSelect />
          </div>
          
          {isCustomRange && <DateTimePicker />}
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center mt-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500 mt-6 bg-red-50 rounded-md">
              <p className="mb-4 font-medium">{error}</p>
              <Button onClick={fetchHistoryData} variant="secondary">Try Again</Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden mt-6 shadow-sm">
              <div className="grid grid-cols-12 bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                <SortableColumnHeader columnKey="service" width={2} label="Service" />
                <SortableColumnHeader columnKey="status" width={2} label="Status" />
                <SortableColumnHeader columnKey="timestamp" width={3} label="Timestamp" />
                <SortableColumnHeader columnKey="responseTime" width={1} label="Response" />
                <SortableColumnHeader columnKey="statusCode" width={1} label="Code" />
                <SortableColumnHeader columnKey="error" width={3} label="Error" />
              </div>
              
              <div className="divide-y">
                {historyItems.length > 0 ? (
                  historyItems.map(({ service, item }, index) => (
                    <div key={index} className="grid grid-cols-12 p-3 text-sm items-center hover:bg-muted/10">
                      <div className="col-span-2 font-medium text-foreground">{service}</div>
                      <div className="col-span-2">
                        <span className={getStatusBadgeClass(item.status)}>
                          {item.status === 'up' && <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>}
                          {item.status === 'down' && <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>}
                          {item.status === 'unknown' && <span className="h-1.5 w-1.5 rounded-full bg-gray-500"></span>}
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-3 font-mono text-xs">{formatTimestamp(item.timestamp)}</div>
                      <div className="col-span-1 font-mono text-xs">{item.responseTime ? `${item.responseTime}ms` : '-'}</div>
                      <div className="col-span-1 font-mono text-xs">{item.statusCode || '-'}</div>
                      <div className="col-span-3 text-xs truncate text-muted-foreground" title={item.error}>{item.error || '-'}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <p className="mb-1 text-sm">No history data available</p>
                    <p className="text-xs">Try adjusting your filters or selecting a different time range</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Last updated: {new Date().toLocaleString()}</span>
            <span>{historyItems.length} records found</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 