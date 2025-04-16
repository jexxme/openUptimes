"use client";

import { useState, useCallback, useEffect } from "react";
import { Server, AlertTriangle, Activity, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

// Import extracted components
import { StatCard } from "./dashboard/StatCard";
import { ServiceStatusSection } from "./dashboard/ServiceStatusSection";
import { StatusPageCard } from "./dashboard/StatusPageCard";
import { LoggerStatusCard } from "./dashboard/LoggerStatusCard";

interface DashboardContentProps {
  services: any[];
  statusLoading: boolean;
  statusError: string | null;
  lastUpdated: string;
  refresh: () => void;
  statusPageData?: any;
  historyData?: { service: string; item: any }[];
  setActiveTab?: (tab: string) => void;
}

export function DashboardContent({
  services,
  statusLoading,
  statusError,
  lastUpdated,
  refresh,
  statusPageData,
  historyData,
  setActiveTab
}: DashboardContentProps) {
  // Calculate stats from real data
  const totalServices = services.length;
  const upServices = services.filter(service => service.currentStatus?.status === "up").length;
  const downServices = services.filter(service => service.currentStatus?.status === "down").length;
  const unknownServices = services.filter(service => !service.currentStatus?.status || service.currentStatus?.status === "unknown").length;
  const uptimePercentage = totalServices > 0 
    ? Math.round((upServices / totalServices) * 100) 
    : 0;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingStatusPage, setIsTogglingStatusPage] = useState(false);
  const [statusPageEnabled, setStatusPageEnabled] = useState(
    statusPageData?.settings?.enabled !== false
  );

  // Handle refresh with animation
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

  // Handle status page toggle
  const handleStatusPageToggle = async (enabled: boolean) => {
    if (isTogglingStatusPage) return;
    
    setIsTogglingStatusPage(true);
    setStatusPageEnabled(enabled);
    
    try {
      const response = await fetch('/api/settings/statuspage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            ...statusPageData?.settings,
            enabled: enabled
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status page settings');
      }
      
      // Update successful, leave the UI state as is
    } catch (error) {
      console.error('Error toggling status page:', error);
      // Revert UI state on error
      setStatusPageEnabled(!enabled);
    } finally {
      setIsTogglingStatusPage(false);
    }
  };

  // Helper function to handle navigation with sections
  const handleNavigation = (tab: string, section?: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
      
      // Update URL with the new tab and optional section
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        
        if (section) {
          url.searchParams.set('section', section);
        } else {
          url.searchParams.delete('section');
        }
        
        window.history.pushState({}, '', url.toString());
      }
    } else {
      // Fallback to traditional navigation if setActiveTab not provided
      window.location.href = `/admin?tab=${tab}${section ? `&section=${section}` : ''}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top stats overview - larger cards with more detailed metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard 
          title="Total Services" 
          value={services.length} 
          icon={Server} 
          color="blue"
          description={`${upServices} online, ${downServices} offline`}
        />
        <StatCard 
          title="Uptime" 
          value={`${uptimePercentage}%`} 
          icon={Activity}
          color="green" 
          description="Current service availability"
        />
        <StatCard 
          title="Active Alerts" 
          value={downServices} 
          icon={AlertTriangle}
          color="red"
          description={downServices ? "Services need attention" : "All systems operational"}
        />
        <StatCard 
          title="Last Updated" 
          value={lastUpdated ? formatRelativeTime(Date.parse(lastUpdated)) : "Just now"} 
          icon={Clock}
          color="purple"
          description="Latest status check"
        />
      </div>
      
      {/* Main layout with 12-column grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Services & Quick Metrics section */}
        <ServiceStatusSection 
          services={services}
          statusLoading={statusLoading}
          statusError={statusError}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          handleRefresh={handleRefresh}
          handleNavigation={handleNavigation}
        />

        {/* Status cards section */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-4">
          {/* Status Page Card */}
          <StatusPageCard 
            statusPageData={statusPageData}
            statusPageEnabled={statusPageEnabled}
            isTogglingStatusPage={isTogglingStatusPage}
            handleStatusPageToggle={handleStatusPageToggle}
            handleNavigation={handleNavigation}
            className="col-span-12 lg:col-span-6"
          />
          
          {/* Logger Status Card */}
          <LoggerStatusCard 
            handleNavigation={handleNavigation}
            className="col-span-12 lg:col-span-6"
          />
        </div>
      </div>
    </div>
  );
} 