"use client";

import { useState, useCallback, useEffect } from "react";
import { Server, AlertTriangle, Activity, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

// Import extracted components
import { StatCard } from "./dashboard/StatCard";
import { ServiceStatusSection } from "./dashboard/ServiceStatusSection";
import { StatusPageCard } from "./dashboard/StatusPageCard";
import { UptimeHistoryCard } from "./dashboard/UptimeHistoryCard";

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

  // Calculate history stats
  const [historyStats, setHistoryStats] = useState({
    totalEvents: 0,
    outages: 0,
    recoveries: 0,
    averageResponseTime: 0,
    responseTimeData: [] as number[],
    lastDowntime: null as number | null,
    uptimePercentage: 100,
    lastIncident: null as {service: string, timestamp: number} | null,
    uptime24h: 100,
    uptimeWeek: 100,
    mostReliableService: '',
    mostProblematicService: '',
    incidentsByService: {} as Record<string, number>
  });

  useEffect(() => {
    if (historyData && historyData.length > 0) {
      let outageCount = 0;
      let recoveryCount = 0;
      let totalResponseTime = 0;
      let responseTimes: number[] = [];
      let lastDowntime = null;
      let lastIncident = null;
      let serviceUptime: Record<string, {up: number, down: number}> = {};
      let incidentsByService: Record<string, number> = {};
      
      // Count events with status down
      const downEvents = historyData.filter(item => item.item.status === 'down');
      outageCount = downEvents.length;
      
      // Find the most recent downtime
      if (downEvents.length > 0) {
        const latestDownEvent = downEvents.reduce((latest, current) => {
          return latest.item.timestamp > current.item.timestamp ? latest : current;
        }, downEvents[0]);
        lastDowntime = latestDownEvent.item.timestamp;
        lastIncident = { 
          service: latestDownEvent.service, 
          timestamp: latestDownEvent.item.timestamp 
        };
      }
      
      // Count recovery events (status up)
      recoveryCount = historyData.filter(item => item.item.status === 'up').length;
      
      // Calculate average response time and collect data for sparkline
      historyData.forEach(item => {
        // Init service counter if not exists
        if (!serviceUptime[item.service]) {
          serviceUptime[item.service] = { up: 0, down: 0 };
        }
        
        // Track service uptime
        if (item.item.status === 'up') {
          serviceUptime[item.service].up++;
        } else if (item.item.status === 'down') {
          serviceUptime[item.service].down++;
          
          // Count incidents by service
          incidentsByService[item.service] = (incidentsByService[item.service] || 0) + 1;
        }
        
        // Collect response times for display
        if (item.item.responseTime) {
          totalResponseTime += item.item.responseTime;
          responseTimes.push(item.item.responseTime);
        }
      });
      
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(totalResponseTime / responseTimes.length) 
        : 0;
      
      // Calculate overall uptime percentage
      const totalChecks = historyData.length;
      const upChecks = historyData.filter(item => item.item.status === 'up').length;
      const uptimePercentage = Math.round((upChecks / totalChecks) * 100) || 100;
      
      // Calculate 24h uptime
      const day = 24 * 60 * 60 * 1000;
      const dayAgo = Date.now() - day;
      const last24h = historyData.filter(item => item.item.timestamp >= dayAgo);
      const uptime24h = last24h.length > 0 
        ? Math.round((last24h.filter(item => item.item.status === 'up').length / last24h.length) * 100) 
        : 100;
      
      // Calculate week uptime  
      const week = 7 * day;
      const weekAgo = Date.now() - week;
      const lastWeek = historyData.filter(item => item.item.timestamp >= weekAgo);
      const uptimeWeek = lastWeek.length > 0 
        ? Math.round((lastWeek.filter(item => item.item.status === 'up').length / lastWeek.length) * 100) 
        : 100;
      
      // Find most reliable and problematic services
      let mostReliableService = '';
      let highestUptime = 0;
      let mostProblematicService = '';
      let lowestUptime = 100;
      
      Object.entries(serviceUptime).forEach(([service, counts]) => {
        const total = counts.up + counts.down;
        if (total > 0) {
          const uptime = Math.round((counts.up / total) * 100);
          if (uptime > highestUptime) {
            highestUptime = uptime;
            mostReliableService = service;
          }
          if (uptime < lowestUptime) {
            lowestUptime = uptime;
            mostProblematicService = service;
          }
        }
      });
      
      // Sort response times for sparkline and limit to 20 most recent points
      responseTimes.sort((a, b) => a - b);
      const displayTimes = responseTimes.slice(-20);
      
      setHistoryStats({
        totalEvents: historyData.length,
        outages: outageCount,
        recoveries: recoveryCount,
        averageResponseTime: avgResponseTime,
        responseTimeData: displayTimes,
        lastDowntime,
        uptimePercentage,
        lastIncident,
        uptime24h,
        uptimeWeek,
        mostReliableService,
        mostProblematicService,
        incidentsByService
      });
    }
  }, [historyData]);

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
          title="Avg Response Time" 
          value={`${historyStats.averageResponseTime}ms`} 
          icon={Clock} 
          color="blue"
          description="Last 24h response time"
        />
        <StatCard 
          title="Uptime (24h)" 
          value={`${historyStats.uptime24h}%`} 
          icon={Activity}
          color="green" 
          trend={{ value: historyStats.uptime24h - historyStats.uptimeWeek, isPositive: historyStats.uptime24h >= historyStats.uptimeWeek }}
          description="vs. last 7 days"
        />
        <StatCard 
          title="Total Outages" 
          value={historyStats.outages} 
          icon={AlertTriangle}
          color="red"
          description={historyStats.lastIncident ? `Last: ${formatRelativeTime(historyStats.lastIncident.timestamp)}` : "Last 30 days"}
        />
        <StatCard 
          title="Reliability" 
          value={historyStats.mostReliableService || "N/A"} 
          icon={Server}
          color="purple"
          description="Last 7 days uptime leader"
        />
      </div>
      
      {/* Main 16:9 optimized layout with 3-column grid */}
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

        {/* Status Page Card */}
        <StatusPageCard 
          statusPageData={statusPageData}
          statusPageEnabled={statusPageEnabled}
          isTogglingStatusPage={isTogglingStatusPage}
          handleStatusPageToggle={handleStatusPageToggle}
          handleNavigation={handleNavigation}
        />
        
        {/* History Card */}
        <UptimeHistoryCard 
          historyData={historyData}
          uptimePercentage={uptimePercentage}
          historyStats={historyStats}
          handleNavigation={handleNavigation}
        />
      </div>
    </div>
  );
} 