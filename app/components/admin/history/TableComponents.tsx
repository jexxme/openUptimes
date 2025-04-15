"use client";

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
  return new Date(timestamp).toLocaleString();
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
  
  return (
    <div key={`${service}-${item.timestamp}-${index}`} className="grid grid-cols-12 p-3 text-sm items-center hover:bg-muted/10">
      <div className="col-span-2 font-medium text-foreground flex items-center">
        {service}
      </div>
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
  );
}; 