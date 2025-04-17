"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStatus } from "@/app/hooks/useStatus";
import { usePingStats } from "@/app/hooks/usePingStats";
import { DashboardContent } from "@/app/components/admin/DashboardContent";

interface AdminDashboardProps {
  preloadedServices?: any;
  preloadedStatusPageData?: any;
  preloadedHistoryData?: any;
  setActiveTab?: (tab: string) => void;
}

export function AdminDashboard({ 
  preloadedServices, 
  preloadedStatusPageData,
  preloadedHistoryData,
  setActiveTab
}: AdminDashboardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [errorRetries, setErrorRetries] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFirstRender = useRef(true);
  const MAX_ERROR_RETRIES = 3;
  
  // Get status data using the hooks
  const { 
    services, 
    loading: statusLoading, 
    error: statusError, 
    lastUpdated, 
    refresh 
  } = useStatus(showHistory, 60, preloadedServices, false);

  // Get ping frequency data from the new hook with 30s refresh
  const { getPingFrequency } = usePingStats(30000);
  const { count: pingCount24h, loading: pingStatsLoading } = getPingFrequency();

  // Track if this is the initial render with preloaded data
  useEffect(() => {
    if (isFirstRender.current && preloadedServices) {
      isFirstRender.current = false;
      setInitialDataLoaded(true);
    }
  }, [preloadedServices]);

  // Handle refresh with animation using useCallback to avoid dependency issues
  const handleRefresh = useCallback(() => {
    if (isRefreshing || statusLoading) return;
    
    setIsRefreshing(true);
    
    // Delay the actual refresh to complete animation
    setTimeout(() => {
      refresh();
      
      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 100);
    }, 650); // Animation takes ~600ms
  }, [isRefreshing, statusLoading, refresh]);
  
  // Auto-retry on error
  useEffect(() => {
    if (statusError && errorRetries < MAX_ERROR_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying dashboard refresh (${errorRetries + 1}/${MAX_ERROR_RETRIES})...`);
        setErrorRetries(prev => prev + 1);
        handleRefresh();
      }, Math.min(1000 * Math.pow(2, errorRetries), 8000)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [statusError, errorRetries, handleRefresh, MAX_ERROR_RETRIES]);

  // Determine what data to display - prioritize preloaded data on first render
  const displayServices = (isFirstRender.current && preloadedServices) ? preloadedServices : services;
  const displayLoading = !preloadedServices && statusLoading && !initialDataLoaded;
  
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
      refresh={handleRefresh}
      statusPageData={preloadedStatusPageData}
      historyData={preloadedHistoryData}
      setActiveTab={setActiveTab}
      pingCount24h={pingCount24h}
      pingStatsLoading={pingStatsLoading}
    />
  );
} 