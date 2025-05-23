"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Server, ChevronRight } from "lucide-react";
import { ServiceStatusItem } from "./ServiceComponents";
import { Skeleton } from "@/components/ui/skeleton";

// Section on the dashboard that shows the status of all service
// On left side of the dashboard
// shows list of services and their status

interface ServiceStatusSectionProps {
  services: any[];
  statusLoading: boolean;
  statusError: string | null;
  lastUpdated: string;
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleNavigation: (tab: string, section?: string) => void;
}

// Skeleton for the service item used during refresh
const ServiceSkeleton = () => (
  <div className="flex items-center justify-between py-2 px-3">
    <div className="flex items-center space-x-2 flex-1 min-w-0">
      <Skeleton className="w-2.5 h-2.5 rounded-full" />
      <Skeleton className="h-4 w-36" />
    </div>
    <div className="flex items-center space-x-2 flex-shrink-0">
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-4" />
    </div>
  </div>
);

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
  
  // Number of items to show without scrolling
  const VISIBLE_ITEMS = 6;

  // Log navigation attempts for debugging
  const navigateToService = (tab: string, serviceName?: string) => {

    // Add debugging for URL params
    if (typeof window !== 'undefined' && serviceName) {
      const url = new URL(window.location.href);
      url.searchParams.set('service', serviceName);

    }
    
    handleNavigation(tab, serviceName);
  };

  return (
    <Card className="overflow-hidden border col-span-12 lg:col-span-5 flex flex-col">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <CardDescription className="text-xs">
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
        </div>
      </CardHeader>
      
      {statusLoading && services.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : statusError ? (
        <CardContent className="p-4 flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30 w-full">
            <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-2" />
            <h3 className="text-red-700 dark:text-red-400 font-medium mb-1">Error Loading Status</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4 text-center">{statusError}</p>
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
          <Server className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-slate-700 dark:text-slate-300 font-medium">No services found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Add your first service to start monitoring</p>
          <Button>Add Service</Button>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Services Overview</h3>
              {isRefreshing ? (
                // Skeleton for stats during refresh
                <div className="flex items-center gap-2 mt-1">
                  <Skeleton className="h-3 w-16" /> {/* Total count */}
                  <div className="h-3 border-r border-slate-200 dark:border-slate-700"></div>
                  <Skeleton className="h-3 w-16" /> {/* Online count */}
                  {downServices > 0 && (
                    <>
                      <div className="h-3 border-r border-slate-200 dark:border-slate-700"></div>
                      <Skeleton className="h-3 w-16" /> {/* Offline count */}
                    </>
                  )}
                </div>
              ) : (
                // Actual stats
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total: {services.length}</span>
                  <div className="h-3 border-r border-slate-200 dark:border-slate-700"></div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">{upServices} online</span>
                  {downServices > 0 && (
                    <>
                      <div className="h-3 border-r border-slate-200 dark:border-slate-700"></div>
                      <span className="text-xs text-red-600 dark:text-red-400">{downServices} offline</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-md border overflow-hidden mt-3">
            <div className="divide-y dark:divide-slate-700 max-h-[350px] overflow-auto 
              scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent
              scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400
              dark:scrollbar-thumb-slate-600 dark:hover:scrollbar-thumb-slate-500
              [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400
              dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500"
              style={{ maxHeight: `${VISIBLE_ITEMS * 40}px` }} // Set fixed height for 7 items (each ~40px tall)
            >
              {isRefreshing ? (
                // Skeleton UI with exactly 7 items
                Array.from({ length: VISIBLE_ITEMS }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="divide-y dark:divide-slate-700">
                    <ServiceSkeleton />
                  </div>
                ))
              ) : (
                // Actual service list
                [...services]
                  .sort((a, b) => {
                    // Sort offline services first
                    if (a.currentStatus?.status === "down" && b.currentStatus?.status !== "down") return -1;
                    if (a.currentStatus?.status !== "down" && b.currentStatus?.status === "down") return 1;
                    return 0;
                  })
                  .map((service, index) => (
                    <div 
                      key={service.id || index} 
                      className="group cursor-pointer"
                      onClick={() => navigateToService("services", service.name)}
                    >
                      <ServiceStatusItem 
                        key={service.id || index} 
                        service={service} 
                        showChevron={true}
                      />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}; 