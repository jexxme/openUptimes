"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Server, RefreshCw, AlertTriangle, Activity, Clock, ArrowUpRight } from "lucide-react";

// Animation keyframes
const StatusDot = ({ status }: { status: string }) => {
  const statusColor = 
    status === "up" ? "bg-emerald-500" : 
    status === "down" ? "bg-red-500" : 
    "bg-slate-300";
  
  return (
    <div className="relative flex items-center justify-center">
      <div className={`h-3 w-3 rounded-full ${statusColor}`}>
        {status === "up" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></span>
          </>
        )}
      </div>
    </div>
  );
};

// Service status item in overview dashboard
const ServiceStatusItem = ({ service }: { service: any }) => {
  const status = service.currentStatus?.status || "unknown";
  
  return (
    <div className="flex items-center justify-between p-3 mb-2 hover:bg-white/60 rounded-lg transition-all duration-200 group border border-transparent hover:border-slate-200 hover:shadow-sm">
      <div className="flex items-center space-x-3">
        <StatusDot status={status} />
        <span className="font-medium">{service.name}</span>
      </div>
      <div className="flex items-center space-x-4">
        {service.currentStatus?.responseTime && (
          <div className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
            {service.currentStatus.responseTime}ms
          </div>
        )}
        <div className={`text-xs px-2 py-1 rounded-full font-medium
          ${status === "up" ? "bg-emerald-100 text-emerald-700" : 
            status === "down" ? "bg-red-100 text-red-700" : 
            "bg-slate-100 text-slate-700"}
        `}>
          {status === "up" ? "Online" : status === "down" ? "Offline" : "Unknown"}
        </div>
      </div>
    </div>
  );
};

// StatCard component for dashboard
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = "blue"
}: { 
  title: string; 
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  color?: "blue" | "green" | "red" | "purple" | "yellow";
}) => {
  const colorVariants = {
    blue: "from-blue-50 to-blue-100/20 text-blue-700 border-blue-200",
    green: "from-emerald-50 to-emerald-100/20 text-emerald-700 border-emerald-200",
    red: "from-red-50 to-red-100/20 text-red-700 border-red-200",
    purple: "from-purple-50 to-purple-100/20 text-purple-700 border-purple-200",
    yellow: "from-amber-50 to-amber-100/20 text-amber-700 border-amber-200",
  };

  return (
    <Card className={`overflow-hidden border bg-gradient-to-br ${colorVariants[color]}`}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="p-1.5 rounded-full bg-white/90 shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.isPositive && 'rotate-180'}`} />
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardContentProps {
  services: any[];
  statusLoading: boolean;
  statusError: string | null;
  lastUpdated: string;
  refresh: () => void;
}

export function DashboardContent({
  services,
  statusLoading,
  statusError,
  lastUpdated,
  refresh
}: DashboardContentProps) {
  // Calculate stats from real data
  const totalServices = services.length;
  const upServices = services.filter(service => service.currentStatus?.status === "up").length;
  const downServices = services.filter(service => service.currentStatus?.status === "down").length;
  const unknownServices = services.filter(service => !service.currentStatus?.status || service.currentStatus?.status === "unknown").length;
  const uptimePercentage = totalServices > 0 
    ? Math.round((upServices / totalServices) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Top stats overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard 
          title="Total Services" 
          value={totalServices} 
          icon={Server} 
          color="blue"
          description="Monitored services"
        />
        <StatCard 
          title="Uptime" 
          value={`${uptimePercentage}%`} 
          icon={Activity}
          color="green" 
          trend={{ value: 0.5, isPositive: true }}
          description="Average uptime"
        />
        <StatCard 
          title="Online" 
          value={upServices} 
          icon={Server}
          color="green" 
          description={`${totalServices > 0 ? Math.round((upServices / totalServices) * 100) : 0}% of services`}
        />
        <StatCard 
          title="Incidents" 
          value={downServices} 
          icon={AlertTriangle}
          color="red"
          description={downServices > 0 ? "Services offline" : "All systems operational"}
        />
      </div>
      
      {/* Status overview card */}
      <Card className="overflow-hidden border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
          <div>
            <CardTitle className="text-xl font-semibold">Service Status</CardTitle>
            <CardDescription>
              {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading status..."}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {statusLoading && services.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statusError ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-red-50">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <h3 className="text-red-700 font-medium mb-1">Error Loading Status</h3>
              <p className="text-sm text-red-600 mb-4 text-center">{statusError}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Try Again
              </Button>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Server className="h-8 w-8 text-slate-300 mb-2" />
              <h3 className="text-slate-700 font-medium">No services found</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">Add your first service to start monitoring</p>
              <Button>Add Service</Button>
            </div>
          ) : (
            <div className="space-y-1 mt-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <div className="bg-white p-2 rounded-full mr-4">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{services.length}</div>
                    <div className="text-sm text-blue-700">Monitored Services</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xl font-bold text-emerald-700">{upServices}</div>
                    <div className="text-xs text-emerald-600">Online</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-700">{downServices}</div>
                    <div className="text-xs text-red-600">Offline</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-xl font-bold text-slate-700">{unknownServices}</div>
                    <div className="text-xs text-slate-600">Unknown</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                {services.map((service) => (
                  <ServiceStatusItem key={service.name} service={service} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 