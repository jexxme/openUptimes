import { cn } from "@/lib/utils";
import { ServiceStatus } from "@/lib/redis";
import { ServiceHistory } from "./ServiceHistory";
import { useState } from "react";

interface StatusCardProps {
  service: {
    name: string;
    url: string;
    description?: string;
    currentStatus: ServiceStatus | null;
    history?: ServiceStatus[];
  };
  showHistory: boolean;
}

export function StatusCard({ service, showHistory }: StatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { name, url, description, currentStatus, history } = service;
  
  // Default to unknown status if no current status is available
  const status = currentStatus?.status || "unknown";
  const statusCode = currentStatus?.statusCode;
  const responseTime = currentStatus?.responseTime;
  const timestamp = currentStatus?.timestamp
    ? new Date(currentStatus.timestamp).toLocaleString()
    : "N/A";

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div 
      className={cn(
        "rounded-lg border p-3 transition-all duration-200 hover:shadow-sm",
        status === "up" ? "border-green-100 bg-white" : 
        status === "down" ? "border-red-100 bg-white" : 
        "border-gray-100 bg-white",
        expanded ? "shadow-md" : ""
      )}
      onClick={toggleExpanded}
    >
      <div className="flex items-center justify-between cursor-pointer">
        <h3 className="font-medium">{name}</h3>
        <div className="flex items-center gap-2">
          {responseTime && !expanded && (
            <span className="text-xs opacity-60">{responseTime}ms</span>
          )}
          <div className={cn(
            "h-3 w-3 rounded-full",
            status === "up" ? "bg-green-500" : 
            status === "down" ? "bg-red-500" : 
            "bg-gray-300"
          )}/>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-2 text-sm text-gray-600 space-y-2">
          {description && <p className="text-xs opacity-80">{description}</p>}
          
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-block text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
          
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="rounded-md bg-gray-50 px-2 py-1">
              <span className="opacity-70">Status:</span>
              <span className="ml-1 capitalize">{status}</span>
            </div>
            
            {statusCode && (
              <div className="rounded-md bg-gray-50 px-2 py-1">
                <span className="opacity-70">Code:</span>
                <span className="ml-1">{statusCode}</span>
              </div>
            )}
            
            {responseTime && (
              <div className="rounded-md bg-gray-50 px-2 py-1">
                <span className="opacity-70">Response:</span>
                <span className="ml-1">{responseTime}ms</span>
              </div>
            )}
            
            <div className="rounded-md bg-gray-50 px-2 py-1">
              <span className="opacity-70">Last check:</span>
              <span className="ml-1 text-xs">{timestamp}</span>
            </div>
          </div>
          
          {/* Display history if available and enabled globally */}
          {history && showHistory && <ServiceHistory history={history} serviceName={name} />}
        </div>
      )}
    </div>
  );
} 