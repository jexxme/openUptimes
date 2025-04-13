import { ServiceConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ServiceStatus } from "@/lib/redis";
import { ServiceHistory } from "./ServiceHistory";

interface StatusCardProps {
  service: {
    name: string;
    url: string;
    description?: string;
    currentStatus: ServiceStatus | null;
    history?: ServiceStatus[];
  };
}

export function StatusCard({ service }: StatusCardProps) {
  const { name, url, description, currentStatus, history } = service;
  
  // Default to unknown status if no current status is available
  const status = currentStatus?.status || "unknown";
  const statusCode = currentStatus?.statusCode;
  const responseTime = currentStatus?.responseTime;
  const timestamp = currentStatus?.timestamp
    ? new Date(currentStatus.timestamp).toLocaleString()
    : "N/A";

  // Define status colors based on the status
  const statusColors = {
    up: "bg-green-50 border-green-200 text-green-700",
    down: "bg-red-50 border-red-200 text-red-700",
    unknown: "bg-gray-50 border-gray-200 text-gray-700",
  };

  // Define status icon based on the status
  const statusIcon = {
    up: "✓",
    down: "✗",
    unknown: "?",
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all duration-200 hover:shadow-md",
      statusColors[status as keyof typeof statusColors]
    )}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          status === "up" ? "bg-green-500 text-white" : 
          status === "down" ? "bg-red-500 text-white" : 
          "bg-gray-500 text-white"
        )}>
          {statusIcon[status as keyof typeof statusIcon]}
        </div>
      </div>
      
      {description && (
        <p className="mb-2 text-sm opacity-80">{description}</p>
      )}
      
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="mb-3 inline-block text-xs underline opacity-70 hover:opacity-100"
      >
        {url}
      </a>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-white/40 px-2 py-1">
          <span className="opacity-70">Status:</span>
          <span className="ml-1 font-medium capitalize">{status}</span>
        </div>
        
        {statusCode && (
          <div className="rounded-md bg-white/40 px-2 py-1">
            <span className="opacity-70">Code:</span>
            <span className="ml-1 font-medium">{statusCode}</span>
          </div>
        )}
        
        {responseTime && (
          <div className="rounded-md bg-white/40 px-2 py-1">
            <span className="opacity-70">Response:</span>
            <span className="ml-1 font-medium">{responseTime}ms</span>
          </div>
        )}
        
        <div className="rounded-md bg-white/40 px-2 py-1">
          <span className="opacity-70">Last check:</span>
          <span className="ml-1 font-medium text-xs">{timestamp}</span>
        </div>
      </div>
      
      {/* Display history if available */}
      {history && <ServiceHistory history={history} serviceName={name} />}
    </div>
  );
} 