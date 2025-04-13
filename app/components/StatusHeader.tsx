import { config } from "@/lib/config";

interface StatusHeaderProps {
  services: {
    name: string;
    currentStatus: {
      status: 'up' | 'down' | 'unknown';
    } | null;
  }[];
  lastUpdated: string;
}

export function StatusHeader({ services, lastUpdated }: StatusHeaderProps) {
  // Calculate overall status
  const allUp = services.every(service => service.currentStatus?.status === 'up');
  const anyDown = services.some(service => service.currentStatus?.status === 'down');
  const overallStatus = allUp ? 'All systems operational' : 
                       anyDown ? 'System disruption detected' : 
                       'Status unknown';
  
  // Color based on overall status
  const statusColor = allUp ? 'text-green-600' : 
                    anyDown ? 'text-red-600' : 
                    'text-gray-600';
  
  // Calculate service stats
  const totalServices = services.length;
  const upServices = services.filter(service => service.currentStatus?.status === 'up').length;
  const downServices = services.filter(service => service.currentStatus?.status === 'down').length;
  const unknownServices = totalServices - upServices - downServices;
  
  return (
    <div className="mb-8 text-center">
      <h1 className="mb-2 text-3xl font-bold">{config.siteName}</h1>
      <p className="mb-6 opacity-70">{config.description}</p>
      
      <div className="mb-6">
        <h2 className={`text-xl font-semibold ${statusColor}`}>
          {overallStatus}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {lastUpdated}
        </p>
      </div>
      
      <div className="mx-auto flex max-w-md justify-center gap-4">
        <div className="flex-1 rounded-lg bg-green-50 p-3 text-center shadow-sm">
          <span className="block text-2xl font-bold text-green-600">{upServices}</span>
          <span className="text-xs text-green-700">Operational</span>
        </div>
        
        {downServices > 0 && (
          <div className="flex-1 rounded-lg bg-red-50 p-3 text-center shadow-sm">
            <span className="block text-2xl font-bold text-red-600">{downServices}</span>
            <span className="text-xs text-red-700">Disrupted</span>
          </div>
        )}
        
        {unknownServices > 0 && (
          <div className="flex-1 rounded-lg bg-gray-50 p-3 text-center shadow-sm">
            <span className="block text-2xl font-bold text-gray-600">{unknownServices}</span>
            <span className="text-xs text-gray-700">Unknown</span>
          </div>
        )}
      </div>
    </div>
  );
} 