"use client";

import { useState, useEffect } from "react";
import { useStatus } from "@/app/hooks/useStatus";
import { HistoryContent } from "@/app/components/admin/HistoryContent";

interface AdminHistoryProps {
  preloadedHistory?: any[] | null;
  preloadedHistoryServices?: any[] | null;
  setActiveTab?: (tab: string) => void;
}

export function AdminHistory({ preloadedHistory, preloadedHistoryServices, setActiveTab }: AdminHistoryProps) {
  const [showHistory, setShowHistory] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(!!preloadedHistory);
  const [hasValidData, setHasValidData] = useState(false);
  
  // Get status data with history enabled - use preloadedHistoryServices if available
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(showHistory, 60, preloadedHistoryServices || undefined);
  
  // Validate if we have actual services with names (not empty objects)
  useEffect(() => {
    // Check if the services array includes actual valid service objects
    const isValid = Array.isArray(services) && 
      services.length > 0 && 
      services.some(svc => svc && typeof svc === 'object' && svc.name);
    
    setHasValidData(isValid);
    
    if (services && Array.isArray(services)) {

    }
  }, [services]);
  
  // Validate if preloaded history is valid
  useEffect(() => {
    if (preloadedHistory) {
      const isValid = Array.isArray(preloadedHistory) && 
        preloadedHistory.length > 0 && 
        preloadedHistory.some(item => 
          item && typeof item === 'object' && 
          item.service && 
          item.item && 
          item.item.timestamp
        );

      if (!isValid) {
        // Schedule a refresh if preloaded data is invalid
        setTimeout(() => {
          refresh();
        }, 2000);
      }
    }
  }, [preloadedHistory, refresh]);
  
  // Extract service from URL if present
  useEffect(() => {
    const getServiceFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const service = urlParams.get('service');
      if (service) {
        // Decode the service name if it was encoded
        try {
          const decodedService = decodeURIComponent(service);
          setSelectedService(decodedService);
        } catch (e) {
          // If decoding fails, use as-is
          setSelectedService(service);
        }
      }
    };

    getServiceFromUrl();

    // Also set up a listener for popstate to handle browser back/forward navigation
    const handlePopState = () => {
      getServiceFromUrl();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Use preloaded data to optimize initial loading and ensure we have latest data
  useEffect(() => {
    if ((!initialDataLoaded && preloadedHistory) || (selectedService && !initialDataLoaded)) {
      // Set flag to prevent infinite loop
      setInitialDataLoaded(true);
      
      // Only trigger a refresh if we really need fresh data
      if (selectedService) {
        setTimeout(() => {
          refresh();
        }, 1000); // Increase timeout to avoid rapid re-rendering
      }
    }
    
    // If we don't have valid data after a short delay, refresh to get data
    if (!hasValidData && !statusLoading && initialDataLoaded) {

      const timer = setTimeout(() => {

        refresh();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [preloadedHistory, initialDataLoaded, refresh, selectedService, hasValidData, statusLoading]);
  
  // Show a loading state when data is not valid but we're claiming to have data
  const effectiveLoading = statusLoading || (services.length > 0 && !hasValidData);
  
  // Only use preloaded history if it passes validation
  const validPreloadedHistory = Array.isArray(preloadedHistory) && 
    preloadedHistory.length > 0 && 
    preloadedHistory[0] && 
    preloadedHistory[0].service &&
    preloadedHistory[0].item
      ? preloadedHistory 
      : undefined;
      
  // Use preloaded services list when available and valid
  const validPreloadedServices = preloadedHistoryServices && 
    Array.isArray(preloadedHistoryServices) && 
    preloadedHistoryServices.length > 0 && 
    preloadedHistoryServices.some(s => s && typeof s === 'object' && s.name)
      ? preloadedHistoryServices
      : hasValidData ? services : [];
      
  // If still initializing data, show a clear loading state
  if (!initialDataLoaded || effectiveLoading && !validPreloadedHistory) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
      
  return (
    <HistoryContent
      services={validPreloadedServices}
      statusLoading={effectiveLoading}
      statusError={statusError} 
      refresh={refresh}
      initialService={selectedService}
      preloadedHistory={validPreloadedHistory}
    />
  );
} 