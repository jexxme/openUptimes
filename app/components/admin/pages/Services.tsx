"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStatus } from "@/app/hooks/useStatus";
import { useServicesConfig } from "@/app/hooks/useServicesConfig";
import { ServicesList } from "@/app/components/admin/ServicesList";

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
    hasPreloadedServices ? preloadedServices : undefined
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mt-6">
          <h3 className="text-red-700 font-medium mb-1">Error Loading Services Configuration</h3>
          <p className="text-sm text-red-600 mb-2">{servicesConfigError}</p>
          <button 
            onClick={() => refreshServicesConfig()} 
            className="px-3 py-1 bg-white border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (statusError) {
      return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md mt-6">
          <h3 className="text-amber-700 font-medium mb-1">Error Loading Services Status</h3>
          <p className="text-sm text-amber-600 mb-2">{statusError}</p>
          <button 
            onClick={refresh} 
            className="px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-md text-sm hover:bg-amber-50"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1000px] w-full">
        {/* Services management */}
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
    </div>
  );
} 