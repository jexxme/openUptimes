"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStatus } from "@/app/hooks/useStatus";
import { useServicesConfig } from "@/app/hooks/useServicesConfig";
import { ServicesList } from "@/app/components/admin/services/ServicesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminServicesProps {
  preloadedServices?: any;
  preloadedServicesConfig?: any;
  setActiveTab?: (tab: string) => void;
}

export function AdminServices({ 
  preloadedServices, 
  preloadedServicesConfig,
  setActiveTab 
}: AdminServicesProps) {
  const router = useRouter();
  const isFirstRender = useRef(true);
  
  // Always fetch history data for expandable service details
  const [showHistory, setShowHistory] = useState(true);
  
  // We'll skip the initial API fetch if we have preloaded data
  const hasPreloadedServices = !!preloadedServices && Array.isArray(preloadedServices) && preloadedServices.length > 0;
  const hasPreloadedConfig = !!preloadedServicesConfig && Array.isArray(preloadedServicesConfig) && preloadedServicesConfig.length > 0;
  
  // Get status data using the hooks with initialData from preloaded data
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(
    showHistory, 
    60, 
    hasPreloadedServices ? preloadedServices : undefined,
    false // Don't filter by visibility in admin view
  );
  
  // Get services configuration data with initialData
  const { 
    services: servicesConfig, 
    loading: servicesConfigLoading, 
    error: servicesConfigError, 
    isUpdating,
    addService,
    updateService,
    deleteService,
    fetchServices: refreshServicesConfig
  } = useServicesConfig(
    hasPreloadedConfig ? preloadedServicesConfig : undefined
  );
  
  // Track initial render state and refresh data on mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Automatically refresh data on initial mount
      // This ensures complete data for uptime calculations
      setTimeout(() => {
        refresh();
        refreshServicesConfig();
      }, 500);
    }
  }, [refresh, refreshServicesConfig]);

  // Handle viewing history for a specific service
  const handleViewHistory = (serviceName: string) => {
    if (setActiveTab) {
      // Use client-side tab switching
      setActiveTab("history");
      
      // Update URL with the new tab and service parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'history');
        url.searchParams.set('service', encodeURIComponent(serviceName));
        window.history.pushState({}, '', url.toString());
      }
    } else {
      // Fallback to traditional navigation
      router.push(`/admin?tab=history&service=${encodeURIComponent(serviceName)}`);
    }
  };

  // Use preloaded data or live data, prioritizing live data after first refresh
  const displayServices = services.length > 0 ? services : preloadedServices;
  const displayServicesConfig = servicesConfig.length > 0 ? servicesConfig : preloadedServicesConfig;
  
  // Only show loading if no data available and still loading
  const displayStatusLoading = statusLoading && !displayServices?.length;
  const displayConfigLoading = servicesConfigLoading && !displayServicesConfig?.length;

  // Handle error rendering
  const renderErrorMessage = () => {
    if (servicesConfigError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md mt-6">
          <h3 className="text-red-700 dark:text-red-400 font-medium mb-1">Error Loading Services Configuration</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{servicesConfigError}</p>
          <button 
            onClick={() => refreshServicesConfig()} 
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (statusError) {
      return (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md mt-6">
          <h3 className="text-amber-700 dark:text-amber-400 font-medium mb-1">Error Loading Services Status</h3>
          <p className="text-sm text-amber-600 dark:text-amber-500 mb-2">{statusError}</p>
          <button 
            onClick={refresh} 
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-md text-sm hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Management</CardTitle>
              <CardDescription>Configure and monitor your service endpoints</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center px-3 py-1 rounded-md bg-muted/40 dark:bg-muted/20 border dark:border-slate-700">
                  <span className="text-sm font-medium dark:text-slate-300">{displayServicesConfig?.length || 0}</span>
                  <span className="text-sm ml-1.5 dark:text-slate-400">Total</span>
                </div>
                <div className="flex items-center px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{displayServices?.filter((s: any) => s?.currentStatus?.status === "up")?.length || 0}</span>
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 ml-1.5">Online</span>
                </div>
                <div className="flex items-center px-3 py-1 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">{displayServices?.filter((s: any) => s?.currentStatus?.status === "down")?.length || 0}</span>
                  <span className="text-sm text-red-700 dark:text-red-400 ml-1.5">Offline</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="w-full">
            <ServicesList
              services={displayServices}
              servicesConfig={displayServicesConfig}
              statusLoading={displayStatusLoading}
              servicesConfigLoading={displayConfigLoading}
              statusError={statusError}
              servicesConfigError={servicesConfigError}
              isUpdating={isUpdating}
              lastUpdated={lastUpdated || "Using preloaded data..."}
              refreshServicesConfig={refreshServicesConfig}
              refresh={refresh}
              addService={addService}
              updateService={updateService}
              deleteService={deleteService}
              onViewHistory={handleViewHistory}
            />

            {renderErrorMessage()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 