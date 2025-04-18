"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types from useStatus hook
interface StatusHistoryItem {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

// Get status color for badges
export const getStatusBadgeClass = (status: 'up' | 'down' | 'unknown') => {
  return cn(
    "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
    status === 'up' ? 'bg-green-100 text-green-800' : 
    status === 'down' ? 'bg-red-100 text-red-800' : 
    'bg-gray-100 text-gray-800'
  );
};

// Format timestamp to readable date/time
export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return format(date, 'MMM d, yyyy h:mm:ss a');
};

// Sortable column header component
export const SortableColumnHeader = ({ 
  columnKey, 
  width, 
  label, 
  sortConfig, 
  handleSort 
}: { 
  columnKey: string;
  width: number;
  label: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
}) => {
  const isActive = sortConfig.key === columnKey;
  
  return (
    <div 
      className={`col-span-${width} flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors`}
      onClick={() => handleSort(columnKey)}
    >
      <span className="truncate">{label}</span>
      <span className="flex flex-col h-3 justify-between">
        <svg width="8" height="4" viewBox="0 0 8 4" xmlns="http://www.w3.org/2000/svg" className={cn(
          "transition-opacity",
          sortConfig.key === columnKey && sortConfig.direction === 'asc' ? 'opacity-100' : 'opacity-40'
        )}>
          <path d="M4 0L8 4H0L4 0Z" fill="currentColor" />
        </svg>
        <svg width="8" height="4" viewBox="0 0 8 4" xmlns="http://www.w3.org/2000/svg" className={cn(
          "transition-opacity",
          sortConfig.key === columnKey && sortConfig.direction === 'desc' ? 'opacity-100' : 'opacity-40'
        )}>
          <path d="M4 4L0 0L8 0L4 4Z" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
};

// History table row component
export const HistoryTableRow = ({ 
  service, 
  item, 
  index 
}: { 
  service: string; 
  item: StatusHistoryItem; 
  index: number;
}) => {
  if (!item || !item.status || !item.timestamp) return null;
  
  // Determine status badge styles
  const statusBadgeClasses = cn(
    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium max-w-fit",
    item.status === 'up' 
      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
      : item.status === 'down' 
        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
  );
  
  // Determine status dot styles
  const statusDotClasses = cn(
    "w-1.5 h-1.5 rounded-full",
    item.status === 'up' 
      ? 'bg-emerald-500 dark:bg-emerald-400' 
      : item.status === 'down' 
        ? 'bg-red-500 dark:bg-red-400' 
        : 'bg-gray-400 dark:bg-gray-500'
  );
  
  // Style for error text
  const errorTextClass = cn(
    "text-xs line-clamp-1 font-mono",
    item.error ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
  );
  
  // Style for status code
  const statusCodeClass = cn(
    "text-xs font-mono text-center",
    !item.statusCode 
      ? "text-muted-foreground" 
      : item.statusCode >= 200 && item.statusCode < 300
        ? "text-emerald-600 dark:text-emerald-400 font-medium"
        : item.statusCode >= 300 && item.statusCode < 400
          ? "text-amber-600 dark:text-amber-400 font-medium"
          : item.statusCode >= 400 && item.statusCode < 500
            ? "text-orange-600 dark:text-orange-400 font-medium"
            : "text-red-600 dark:text-red-400 font-medium"
  );
  
  return (
    <div className={cn(
      "grid grid-cols-12 p-3 text-xs items-center hover:bg-muted/30 transition-colors",
      index % 2 === 0 ? "bg-muted/10" : "bg-background"
    )}>
      {/* Service */}
      <div className="col-span-2 font-medium truncate">{service}</div>
      
      {/* Status */}
      <div className="col-span-2">
        <div className={statusBadgeClasses}>
          <div className={statusDotClasses}></div>
          <span>
            {item.status === 'up' ? 'Online' : item.status === 'down' ? 'Offline' : 'Unknown'}
          </span>
        </div>
      </div>
      
      {/* Timestamp */}
      <div className="col-span-3 text-muted-foreground">{formatTimestamp(item.timestamp)}</div>
      
      {/* Response Time */}
      <div className="col-span-1 text-center font-mono">
        {item.responseTime ? `${item.responseTime}ms` : "-"}
      </div>
      
      {/* Status Code */}
      <div className="col-span-1">
        <div className={statusCodeClass}>
          {item.statusCode || "-"}
        </div>
      </div>
      
      {/* Error */}
      <div className="col-span-3">
        <div className={errorTextClass} title={item.error || ""}>
          {item.error || "-"}
        </div>
      </div>
    </div>
  );
}; 