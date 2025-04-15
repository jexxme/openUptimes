"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStatus } from "@/app/hooks/useStatus";
import { useServicesConfig } from "@/app/hooks/useServicesConfig";
import { ServicesStats } from "@/app/components/admin/ServicesStats";
import { ServicesList } from "@/app/components/admin/ServicesList";

interface AdminServicesProps {
  preloadedServices?: any;
  preloadedServicesConfig?: any;
}

export function AdminServices({ preloadedServices, preloadedServicesConfig }: AdminServicesProps) {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  
  // Get status data using the hooks
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(showHistory, 60);
  
  // Get services configuration data
  const { 
    services: servicesConfig, 
    loading: servicesConfigLoading, 
    error: servicesConfigError, 
    isUpdating,
    addService,
    updateService,
    deleteService,
    fetchServices: refreshServicesConfig
  } = useServicesConfig();
  
  // Use preloaded data if available
  useEffect(() => {
    if (preloadedServices && statusLoading) {
      refresh();
    }
    if (preloadedServicesConfig && servicesConfigLoading) {
      refreshServicesConfig();
    }
  }, [preloadedServices, preloadedServicesConfig, statusLoading, servicesConfigLoading, refresh, refreshServicesConfig]);

  // Handle viewing history for a specific service
  const handleViewHistory = (serviceName: string) => {
    // Navigate to history page with service name
    router.push(`/admin?tab=history&service=${encodeURIComponent(serviceName)}`);
  };

  // Use preloaded data or live data
  const displayServices = preloadedServices && statusLoading ? preloadedServices : services;
  const displayServicesConfig = preloadedServicesConfig && servicesConfigLoading ? preloadedServicesConfig : servicesConfig;
  const displayStatusLoading = !preloadedServices && statusLoading;
  const displayConfigLoading = !preloadedServicesConfig && servicesConfigLoading;

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
    <div className="space-y-8">
      {/* Services stats */}
      <ServicesStats 
        servicesConfig={displayServicesConfig} 
        servicesStatus={displayServices} 
      />
      
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
  );
} 