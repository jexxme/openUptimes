"use client";

import { useState, useEffect } from "react";
import { useStatus } from "@/app/hooks/useStatus";
import { DashboardContent } from "@/app/components/admin/DashboardContent";

interface AdminDashboardProps {
  preloadedServices?: any;
}

export function AdminDashboard({ preloadedServices }: AdminDashboardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [errorRetries, setErrorRetries] = useState(0);
  const MAX_ERROR_RETRIES = 3;
  
  // Get status data using the hooks
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(showHistory, 60);

  // Use preloaded services for initial render if available
  useEffect(() => {
    if (preloadedServices && 
        Array.isArray(preloadedServices) && 
        preloadedServices.length > 0 && 
        statusLoading && 
        !initialDataLoaded) {
      // Mark as initialized to prevent repeated refreshes
      setInitialDataLoaded(true);
      // Trigger a refresh to get the latest data
      refresh();
    }
  }, [preloadedServices, statusLoading, refresh, initialDataLoaded]);

  // Auto-retry on error
  useEffect(() => {
    if (statusError && errorRetries < MAX_ERROR_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying dashboard refresh (${errorRetries + 1}/${MAX_ERROR_RETRIES})...`);
        setErrorRetries(prev => prev + 1);
        refresh();
      }, Math.min(1000 * Math.pow(2, errorRetries), 8000)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [statusError, errorRetries, refresh]);

  // Determine what data to display
  const displayServices = preloadedServices && statusLoading ? preloadedServices : services;
  const displayLoading = !preloadedServices && statusLoading;
  
  // Show a more informative error message
  const getErrorMessage = () => {
    if (!statusError) return null;
    
    if (statusError.includes('fetch') || statusError.includes('network')) {
      return `Network error: Unable to connect to the server. Please check your connection. (Attempt ${errorRetries}/${MAX_ERROR_RETRIES})`;
    }
    
    if (statusError.includes('500')) {
      return `Server error: The server encountered an error. Please try again later. (Attempt ${errorRetries}/${MAX_ERROR_RETRIES})`;
    }
    
    return `${statusError} (Attempt ${errorRetries}/${MAX_ERROR_RETRIES})`;
  };

  return (
    <DashboardContent 
      services={displayServices} 
      statusLoading={displayLoading}
      statusError={getErrorMessage()} 
      lastUpdated={lastUpdated || "Using preloaded data..."} 
      refresh={refresh}
    />
  );
} 