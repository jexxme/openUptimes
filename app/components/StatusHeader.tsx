import { config } from "@/lib/config";

interface StatusHeaderProps {
  services: {
    name: string;
    currentStatus: {
      status: 'up' | 'down' | 'unknown';
    } | null;
  }[];
  lastUpdated: string;
  title?: string;
  description?: string;
}

export function StatusHeader({ services, lastUpdated, title, description }: StatusHeaderProps) {
  // Calculate overall status
  const allUp = services.every(service => service.currentStatus?.status === 'up');
  const anyDown = services.some(service => service.currentStatus?.status === 'down');
  const overallStatus = allUp ? 'All systems operational' : 
                       anyDown ? 'System disruption detected' : 
                       'Status unknown';
  
  // Calculate service stats
  const totalServices = services.length;
  const upServices = services.filter(service => service.currentStatus?.status === 'up').length;
  const downServices = services.filter(service => service.currentStatus?.status === 'down').length;
  
  // Use props if provided, otherwise fall back to config values
  const displayTitle = title || config.statusPage.title;
  const displayDescription = description || config.statusPage.description;
  
  return (
    <div className="mb-6">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">{displayTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">{displayDescription}</p>
      </div>
      
      <div className="mt-4 flex items-center justify-center">
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          allUp ? 'bg-green-100 text-green-700' : 
          anyDown ? 'bg-red-100 text-red-700' : 
          'bg-gray-100 text-gray-600'
        }`}>
          {overallStatus}
        </div>
      </div>
      
      <div className="mt-4 flex justify-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span>{upServices} operational</span>
        </div>
        
        {downServices > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span>{downServices} disrupted</span>
            </div>
          </>
        )}
        
        <span className="text-gray-300">·</span>
        <span className="text-xs text-gray-500">
          Updated {lastUpdated}
        </span>
      </div>
    </div>
  );
} 