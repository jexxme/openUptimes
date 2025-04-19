"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, Clock, ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
  history?: any[];
}

// Time Range Select Component
export const TimeRangeSelect = ({ 
  timeRange, 
  isCustomRange, 
  isLoading, 
  handleTimeRangeChange 
}: { 
  timeRange: string; 
  isCustomRange: boolean; 
  isLoading: boolean; 
  handleTimeRangeChange: (value: string) => void;
}) => {
  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  return (
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
          <option value="15m">Last 15 minutes</option>
          <option value="30m">Last 30 minutes</option>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="12h">Last 12 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="3d">Last 3 days</option>
          <option value="7d">Last 7 days</option>
          <option value="14d">Last 14 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
    </div>
  );
};

// Service Select Component with status indicators
export const ServiceSelect = ({ 
  services, 
  selectedService, 
  setSelectedService, 
  isLoading 
}: { 
  services: StatusData[]; 
  selectedService: string; 
  setSelectedService: (service: string) => void; 
  isLoading: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [processedServices, setProcessedServices] = useState<any[]>([]);
  const [displayView, setDisplayView] = useState<React.ReactNode>(null);
  
  // Get status dot class based on status
  const getStatusDot = (status?: 'up' | 'down' | 'unknown' | null) => (
    <span className={cn(
      "h-2 w-2 rounded-full inline-block mr-2",
      status === 'up' ? "bg-green-500" : 
      status === 'down' ? "bg-red-500" : 
      "bg-gray-400",
      status === 'up' ? "animate-pulse" : ""
    )}></span>
  );
  
  // Get service name display
  const getNameView = (name: string) => (
    <span className="flex items-center">
      {name}
    </span>
  );
  
  // Initialize the display view and update when selected service or services change
  useEffect(() => {
    // Get default view based on current selection
    if (selectedService === 'all' || !selectedService) {
      setDisplayView(
        <>
          {getStatusDot(null)}
          All Services
        </>
      );
    } else {
      // Find the service in processed services
      const service = processedServices.find(s => s.name === selectedService);
      
      if (service) {
        setDisplayView(
          <>
            {getStatusDot(service.currentStatus?.status)}
            {getNameView(selectedService)}
          </>
        );
      } else {
        // Fallback if service not found
        setDisplayView(
          <>
            {getStatusDot(null)}
            {selectedService}
          </>
        );
      }
    }
  }, [selectedService, processedServices]);
  
  // Process services on mount and when they change
  useEffect(() => {
    if (services && Array.isArray(services)) {
      // Filter out invalid service objects first
      const validServices = services.filter(
        service => service && typeof service === 'object' && service.name && typeof service.name === 'string'
      );
      
      // Create a map to track unique service names
      const uniqueMap = new Map();
      
      validServices.forEach(service => {
        if (!uniqueMap.has(service.name)) {
          uniqueMap.set(service.name, service);
        }
      });
      
      setProcessedServices(Array.from(uniqueMap.values()));
    }
  }, [services]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);
  
  // Filter services by search input
  const filteredServices = useMemo(() => {
    return processedServices.filter(service => 
      service.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [processedServices, searchValue]);
  
  const isServicesLoading = isLoading || (Array.isArray(services) && services.length > 0 && !processedServices.length);
  
  // Simple handler with one-step state update
  const handleSelect = (serviceName: string) => {
    // First close the dropdown
    setOpen(false);
    
    // Only update parent state if actually changed
    if (serviceName !== selectedService) {
      // Wait a tiny bit to ensure dropdown closing animation completes first
      setTimeout(() => {
        setSelectedService(serviceName);
      }, 10);
    }
  };
  
  return (
    <div className="flex-1 min-w-[220px] relative" ref={dropdownRef}>
      <div className="flex items-center gap-1 mb-1">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <Label className="text-sm font-medium">Service</Label>
      </div>
      
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        disabled={isServicesLoading}
        onClick={() => setOpen(!open)}
      >
        {isServicesLoading ? (
          <div className="flex items-center text-muted-foreground">
            <div className="h-3 w-3 mr-2 rounded-full border-2 border-t-transparent border-muted-foreground/60 animate-spin"></div>
            Loading services...
          </div>
        ) : displayView}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-background shadow-md max-h-[300px] overflow-auto">
          <div className="p-2 border-b">
            <Input
              placeholder="Search service..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          
          <div className="py-1">
            <div
              role="option"
              className={cn(
                "flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                selectedService === "all" && "bg-accent/50"
              )}
              onClick={() => handleSelect('all')}
            >
              {getStatusDot(null)}
              All Services
            </div>
            
            {isServicesLoading ? (
              <div className="px-2 py-6 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading services...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No service found.
              </div>
            ) : (
              filteredServices.map((service) => (
                <div
                  key={service.name}
                  role="option"
                  className={cn(
                    "flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    selectedService === service.name && "bg-accent/50"
                  )}
                  onClick={() => handleSelect(service.name)}
                >
                  {getStatusDot(service?.currentStatus?.status)}
                  {getNameView(service.name)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Status Select Component
export const StatusSelect = ({ 
  selectedStatus, 
  setSelectedStatus, 
  isLoading 
}: { 
  selectedStatus: string; 
  setSelectedStatus: (status: string) => void; 
  isLoading: boolean;
}) => {
  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  return (
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
          <option value="all">All statuses</option>
          <option value="up">Online</option>
          <option value="down">Offline</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
    </div>
  );
};

// Response Code Select Component
export const ResponseCodeSelect = ({ 
  selectedResponseCode, 
  setSelectedResponseCode, 
  isLoading 
}: { 
  selectedResponseCode: string; 
  setSelectedResponseCode: (code: string) => void; 
  isLoading: boolean;
}) => {
  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  return (
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
};

// Date and time picker for custom range
interface DateTimePickerProps {
  startDateStr: string;
  setStartDateStr: (date: string) => void;
  endDateStr: string;
  setEndDateStr: (date: string) => void;
  startTimeStr: string;
  setStartTimeStr: (time: string) => void;
  endTimeStr: string;
  setEndTimeStr: (time: string) => void;
  isLoading: boolean;
  handleApplyCustomRange: () => void;
}

export function DateTimePicker({
  startDateStr,
  setStartDateStr,
  endDateStr,
  setEndDateStr,
  startTimeStr,
  setStartTimeStr,
  endTimeStr,
  setEndTimeStr,
  isLoading,
  handleApplyCustomRange
}: DateTimePickerProps) {
  return (
    <div className="p-3 border border-border rounded-md bg-muted/10 dark:bg-muted/5 mt-3 mb-1 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</Label>
          <input
            id="start-date"
            type="date"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            className="px-3 py-1 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="start-time" className="text-xs text-muted-foreground">Start Time</Label>
          <input
            id="start-time"
            type="time"
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
            className="px-3 py-1 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            disabled={isLoading}
          />
        </div>
        <div className="self-end text-muted-foreground">to</div>
        <div className="grid gap-1.5">
          <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
          <input
            id="end-date"
            type="date"
            value={endDateStr}
            onChange={(e) => setEndDateStr(e.target.value)}
            className="px-3 py-1 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="end-time" className="text-xs text-muted-foreground">End Time</Label>
          <input
            id="end-time"
            type="time"
            value={endTimeStr}
            onChange={(e) => setEndTimeStr(e.target.value)}
            className="px-3 py-1 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            disabled={isLoading}
          />
        </div>
        <div className="self-end">
          <Button
            size="sm"
            onClick={handleApplyCustomRange}
            disabled={isLoading}
            className="h-8"
          >
            Apply Range
          </Button>
        </div>
      </div>
    </div>
  );
} 