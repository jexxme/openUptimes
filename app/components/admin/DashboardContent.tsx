"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Server, RefreshCw, AlertTriangle, Activity, Clock, ArrowUpRight, Globe, ExternalLink, Settings, EyeOff, Eye, BarChart, History, ChevronUp, ChevronDown, Info } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { Switch } from "../ui/switch";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Animation keyframes
const StatusDot = ({ status }: { status: string }) => {
  const statusColor = 
    status === "up" ? "bg-emerald-500" : 
    status === "down" ? "bg-red-500" : 
    "bg-slate-300";
  
  return (
    <div className="relative flex items-center justify-center w-2.5 h-2.5">
      <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}>
        {status === "up" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></span>
          </>
        )}
      </div>
    </div>
  );
};

// Service status item in overview dashboard
const ServiceStatusItem = ({ service }: { service: any }) => {
  const status = service.currentStatus?.status || "unknown";
  
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 transition-colors duration-150">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <StatusDot status={status} />
        <span className="font-medium text-sm truncate">{service.name}</span>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {service.currentStatus?.responseTime && (
          <span className="text-xs text-slate-500">{service.currentStatus.responseTime}ms</span>
        )}
        <div className={`text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[60px] text-center
          ${status === "up" ? "bg-emerald-100 text-emerald-700" : 
            status === "down" ? "bg-red-100 text-red-700" : 
            "bg-slate-100 text-slate-700"}
        `}>
          {status === "up" ? "Online" : status === "down" ? "Offline" : "Unknown"}
        </div>
      </div>
    </div>
  );
};

// StatCard component for dashboard
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = "blue"
}: { 
  title: string; 
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  color?: "blue" | "green" | "red" | "purple" | "yellow";
}) => {
  const colorVariants = {
    blue: "text-blue-700 border-blue-200 bg-blue-50",
    green: "text-emerald-700 border-emerald-200 bg-emerald-50",
    red: "text-red-700 border-red-200 bg-red-50",
    purple: "text-purple-700 border-purple-200 bg-purple-50",
    yellow: "text-amber-700 border-amber-200 bg-amber-50",
  };

  return (
    <div className={`flex flex-col rounded-md border p-4 ${colorVariants[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-full bg-white/90">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.isPositive && 'rotate-180'}`} />
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-1">
        <span className="text-xl font-bold">{value}</span>
        {description && <div className="text-xs mt-1 leading-tight opacity-80">{description}</div>}
      </div>
    </div>
  );
};

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
  
  // Helper to render sparkline
  const renderSparkline = (data: number[], height = 30, width = 100) => {
    if (!data || data.length < 2) return null;
    
    // Normalize data for visualization
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="ml-auto">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-blue-500"
        />
      </svg>
    );
  };

  // Format a timestamp as a relative time
  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
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
        {/* Services & Quick Metrics section - takes 5/12 of space */}
        <Card className="overflow-hidden border col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 border-b">
            <div>
              <CardTitle className="text-base font-semibold">Service Status</CardTitle>
              <CardDescription>
                {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading status..."}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1" 
              onClick={handleRefresh}
              disabled={statusLoading}
              aria-label="Refresh dashboard data"
              title="Refresh dashboard data"
            >
              <RefreshCw 
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} 
              />
              <span>Refresh</span>
            </Button>
          </CardHeader>
          
          {statusLoading && services.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statusError ? (
            <CardContent className="p-4 flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-red-50 w-full">
                <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                <h3 className="text-red-700 font-medium mb-1">Error Loading Status</h3>
                <p className="text-sm text-red-600 mb-4 text-center">{statusError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="gap-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} />
                  Try Again
                </Button>
              </div>
            </CardContent>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Server className="h-8 w-8 text-slate-300 mb-2" />
              <h3 className="text-slate-700 font-medium">No services found</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">Add your first service to start monitoring</p>
              <Button>Add Service</Button>
            </div>
          ) : (
            <div className="px-3 pt-2 pb-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-700">Services Overview</h3>
                {services.length > 5 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => handleNavigation("services")}
                  >
                    View All
                  </Button>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
                <div className="divide-y max-h-[250px] overflow-auto">
                  {services.slice(0, 5).map((service, index) => (
                    <ServiceStatusItem key={service.id || index} service={service} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Status Page Card - takes 3/12 of space */}
        <Card className="overflow-hidden border col-span-6 lg:col-span-3">
          <CardHeader className="border-b pb-3 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Status Page</CardTitle>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusPageEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusPageEnabled ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                {statusPageEnabled ? 'Active' : 'Disabled'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {statusPageData ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Public Access</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{statusPageData?.settings?.title || "Service Status"}</p>
                  </div>
                  <div className="relative">
                    {isTogglingStatusPage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                    <Switch 
                      disabled={isTogglingStatusPage}
                      checked={statusPageEnabled}
                      onCheckedChange={handleStatusPageToggle}
                      aria-label="Toggle status page visibility"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    className="justify-center h-10"
                    onClick={() => window.open("/", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Page
                  </Button>
                  <Button
                    variant="default"
                    size="default"
                    className="justify-center h-10"
                    onClick={() => handleNavigation("statuspage")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-[140px] items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* History Card - Compact with tabs - takes 4/12 of space */}
        <Card className="overflow-hidden border col-span-6 lg:col-span-4">
          <CardHeader className="border-b pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Uptime History</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-help">
                      <Activity className="h-3 w-3" />
                      <span>{uptimePercentage}% uptime</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Current overall system availability</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {historyData ? (
              <div>
                {/* Uptime visualization */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="w-full">
                      <div className="flex h-2 w-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${historyStats.uptimePercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 h-full transition-all duration-500" 
                          style={{ width: `${100 - historyStats.uptimePercentage}%` }} 
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Overall system uptime: <span className="font-medium">{historyStats.uptimePercentage}%</span></p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Stats grid - 3-column compact layout */}
                <div className="grid grid-cols-3 border-b">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 text-center border-r cursor-help">
                          <div className="text-lg font-bold text-emerald-700">{historyStats.uptimePercentage}%</div>
                          <div className="text-xs text-muted-foreground">Uptime</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Percentage of time all services were operational</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 text-center border-r cursor-help">
                          <div className="text-lg font-bold text-blue-700">{historyStats.averageResponseTime}</div>
                          <div className="text-xs text-muted-foreground">Avg ms</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Average response time in milliseconds</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 text-center cursor-help">
                          <div className="text-lg font-bold text-red-700">{historyStats.outages}</div>
                          <div className="text-xs text-muted-foreground">Incidents</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Total number of downtime incidents detected</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Response time graph with uptime periods */}
                <div className="p-3">
                  {/* Response time trend - moved to top and enlarged */}
                  {historyStats.responseTimeData.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="w-full">
                          <div className="flex flex-col items-center w-full pt-1 pb-2">
                            <div className="w-full flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700">Response Time Trend</span>
                              <span className="text-xs text-slate-500">{historyStats.averageResponseTime} ms avg</span>
                            </div>
                            {renderSparkline(historyStats.responseTimeData, 40, 240)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="w-48">
                          <p className="text-xs">Response time trend over the last {historyStats.responseTimeData.length} checks</p>
                          <p className="text-xs mt-1">
                            <span className="font-medium">Min:</span> {Math.min(...historyStats.responseTimeData)}ms
                            <span className="font-medium ml-3">Max:</span> {Math.max(...historyStats.responseTimeData)}ms
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* Uptime period stats */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <div className="w-8 h-1.5 bg-muted rounded-full mr-2 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${historyStats.uptime24h}%` }}
                          />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">24h</span>
                          <span className="text-xs font-medium ml-3">{historyStats.uptime24h}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <div className="w-8 h-1.5 bg-muted rounded-full mr-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${historyStats.uptimeWeek}%` }}
                          />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">7d</span>
                          <span className="text-xs font-medium ml-3">{historyStats.uptimeWeek}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>
                          <span className="text-xs">Operational</span>
                        </div>
                        <span className="text-xs font-medium">{upServices}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></div>
                          <span className="text-xs">Issues</span>
                        </div>
                        <span className="text-xs font-medium">{downServices}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions - Moved to a more prominent position and styled better */}
                <div className="p-4 pt-3 border-t flex justify-center">
                  <Button
                    variant="default"
                    size="default"
                    className="w-3/4 justify-center"
                    onClick={() => handleNavigation("history")}
                  >
                    <History className="h-4 w-4 mr-2" />
                    <span>View Full History</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-[140px] items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 