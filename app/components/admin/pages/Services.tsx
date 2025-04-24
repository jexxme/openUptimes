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
  
  // Track which service should be expanded from URL or navigation
  const [activeServiceName, setActiveServiceName] = useState<string | null>(null);
  
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
  
  // Initial effect to check URL params and set active service
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Check for service parameter in URL
      if (typeof window !== 'undefined') {
        // Use URL API to get parameters reliably
        const url = new URL(window.location.href);
        const serviceParam = url.searchParams.get('service') || url.searchParams.get('section');

        if (serviceParam) {
          try {
            const decodedService = decodeURIComponent(serviceParam);
            // Set active service name - this will cause the service to be expanded
            setActiveServiceName(decodedService);
          } catch (e) {
            // Error handling
          }
        }
      }
      
      // Automatically refresh data on initial mount
      // This ensures complete data for uptime calculations
      setTimeout(() => {
        refresh();
        refreshServicesConfig();
      }, 500);
    }
  }, [refresh, refreshServicesConfig]);

  // Simple effect to scroll to active service after data is loaded
  useEffect(() => {
    if (activeServiceName && services.length > 0) {
      // Wait for services to render before scrolling
      setTimeout(() => {
        const serviceEl = document.getElementById(`service-${activeServiceName}`);
        if (serviceEl) {
          serviceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [activeServiceName, services.length]);

  // Handle URL updates when services tab is directly loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL parameters on each history change
      const handleUrlChange = () => {
        const url = new URL(window.location.href);
        const serviceParam = url.searchParams.get('service') || url.searchParams.get('section');
        
        if (serviceParam) {
          try {
            const decodedService = decodeURIComponent(serviceParam);
            setActiveServiceName(decodedService);
          } catch (e) {
            // Error handling
          }
        } else {
          // Clear active service if parameter is removed
          setActiveServiceName(null);
        }
      };
      
      // Listen for URL changes (back/forward navigation)
      window.addEventListener('popstate', handleUrlChange);
      
      return () => {
        window.removeEventListener('popstate', handleUrlChange);
      };
    }
  }, []);

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
        <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-md mt-6">
          <h3 className="text-destructive dark:text-destructive font-medium mb-1">Error Loading Services Configuration</h3>
          <p className="text-sm text-destructive/80 dark:text-destructive/90 mb-2">{servicesConfigError}</p>
          <button 
            onClick={() => refreshServicesConfig()} 
            className="px-3 py-1 bg-card dark:bg-card border border-destructive/30 dark:border-destructive/40 text-destructive dark:text-destructive rounded-md text-sm hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (statusError) {
      return (
        <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-md mt-6">
          <h3 className="text-destructive dark:text-destructive font-medium mb-1">Error Loading Services Status</h3>
          <p className="text-sm text-destructive/80 dark:text-destructive/90 mb-2">{statusError}</p>
          <button 
            onClick={refresh} 
            className="px-3 py-1 bg-card dark:bg-card border border-destructive/30 dark:border-destructive/40 text-destructive dark:text-destructive rounded-md text-sm hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors"
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
                <div className="flex items-center px-3 py-1 rounded-md bg-muted/40 dark:bg-muted/20 border dark:border-muted/30">
                  <span className="text-sm font-medium text-foreground">{displayServicesConfig?.length || 0}</span>
                  <span className="text-sm ml-1.5 text-muted-foreground">Total</span>
                </div>
                <div className="flex items-center px-3 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{displayServices?.filter((s: any) => s?.currentStatus?.status === "up")?.length || 0}</span>
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 ml-1.5">Online</span>
                </div>
                <div className="flex items-center px-3 py-1 rounded-md bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30">
                  <span className="text-sm font-medium text-destructive dark:text-destructive">{displayServices?.filter((s: any) => s?.currentStatus?.status === "down")?.length || 0}</span>
                  <span className="text-sm text-destructive dark:text-destructive ml-1.5">Offline</span>
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
              activeServiceName={activeServiceName}
            />

            {renderErrorMessage()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 