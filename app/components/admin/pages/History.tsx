"use client";

import { useState, useEffect } from "react";
import { useStatus } from "@/app/hooks/useStatus";
import { HistoryContent } from "@/app/components/admin/HistoryContent";

interface AdminHistoryProps {
  preloadedHistory?: any;
  setActiveTab?: (tab: string) => void;
}

export function AdminHistory({ preloadedHistory, setActiveTab }: AdminHistoryProps) {
  const [showHistory, setShowHistory] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(!!preloadedHistory);
  
  // Get status data with history enabled
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(showHistory, 60, preloadedHistory);
  
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
    if ((!initialDataLoaded && preloadedHistory) || selectedService) {
      // Set flag to prevent infinite loop
      setInitialDataLoaded(true);
      // Trigger a refresh to get the latest data
      setTimeout(() => {
        refresh();
      }, 300);
    }
  }, [preloadedHistory, initialDataLoaded, refresh, selectedService]);
  
  return (
    <HistoryContent
      services={services}
      statusLoading={statusLoading && (!preloadedHistory || services.length === 0)}
      statusError={statusError} 
      lastUpdated={lastUpdated || "Using preloaded data..."} 
      refresh={refresh}
      initialService={selectedService}
      preloadedHistory={preloadedHistory}
    />
  );
} 