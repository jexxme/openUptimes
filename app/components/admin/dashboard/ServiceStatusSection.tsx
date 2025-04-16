"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Server } from "lucide-react";
import { ServiceStatusItem } from "./ServiceComponents";

interface ServiceStatusSectionProps {
  services: any[];
  statusLoading: boolean;
  statusError: string | null;
  lastUpdated: string;
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleNavigation: (tab: string, section?: string) => void;
}

export const ServiceStatusSection = ({
  services,
  statusLoading,
  statusError,
  lastUpdated,
  isRefreshing,
  handleRefresh,
  handleNavigation
}: ServiceStatusSectionProps) => {
  // Calculate service stats
  const upServices = services.filter(service => service.currentStatus?.status === "up").length;
  const downServices = services.filter(service => service.currentStatus?.status === "down").length;
  
  return (
    <Card className="overflow-hidden border col-span-12 lg:col-span-5 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 border-b h-[72px]">
        <div>
          <CardTitle className="text-base font-semibold">Service Status</CardTitle>
          <CardDescription>
            {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading status..."}
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1" 
          onClick={handleRefresh}
          disabled={statusLoading}
          aria-label="Refresh dashboard data"
          title="Refresh dashboard data"
        >
          <RefreshCw 
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} 
          />
          <span>Refresh</span>
        </Button>
      </CardHeader>
      
      {statusLoading && services.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : statusError ? (
        <CardContent className="p-4 flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-red-50 w-full">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <h3 className="text-red-700 font-medium mb-1">Error Loading Status</h3>
            <p className="text-sm text-red-600 mb-4 text-center">{statusError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} />
              Try Again
            </Button>
          </div>
        </CardContent>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Server className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-slate-700 font-medium">No services found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Add your first service to start monitoring</p>
          <Button>Add Service</Button>
        </div>
      ) : (
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Services Overview</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Total: {services.length}</span>
                <div className="h-3 border-r border-slate-200"></div>
                <span className="text-xs text-emerald-600">{upServices} online</span>
                {downServices > 0 && (
                  <>
                    <div className="h-3 border-r border-slate-200"></div>
                    <span className="text-xs text-red-600">{downServices} offline</span>
                  </>
                )}
              </div>
            </div>
            {services.length > 5 && (
              <Button
                variant="default"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => handleNavigation("services")}
              >
                View All
              </Button>
            )}
          </div>
          <div className="rounded-md border overflow-hidden mt-3">
            <div className="divide-y max-h-[250px] overflow-auto">
              {services.slice(0, 5).map((service, index) => (
                <ServiceStatusItem key={service.id || index} service={service} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}; 