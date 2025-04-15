"use client";

import { useState, useEffect } from "react";
import { useStatus } from "@/app/hooks/useStatus";
import { HistoryContent } from "@/app/components/admin/HistoryContent";

interface AdminHistoryProps {
  preloadedHistory?: any;
}

export function AdminHistory({ preloadedHistory }: AdminHistoryProps) {
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
  } = useStatus(showHistory, 60);
  
  // Extract service from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get('service');
    if (service) {
      setSelectedService(service);
    }
  }, []);
  
  // Use preloaded data to optimize initial loading
  useEffect(() => {
    if (preloadedHistory && statusLoading && !initialDataLoaded) {
      // Set flag to prevent infinite loop
      setInitialDataLoaded(true);
      // Trigger a refresh to get the latest data
      refresh();
    }
  }, [preloadedHistory, statusLoading, initialDataLoaded, refresh]);
  
  return (
    <HistoryContent
      services={services}
      statusLoading={!preloadedHistory && statusLoading}
      statusError={statusError} 
      lastUpdated={lastUpdated || "Using preloaded data..."} 
      refresh={refresh}
      initialService={selectedService}
      preloadedHistory={preloadedHistory}
    />
  );
} 