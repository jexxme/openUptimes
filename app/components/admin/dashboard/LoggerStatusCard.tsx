"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Activity, ExternalLink, AlertTriangle, RotateCw, Clock, Server, Settings } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface LoggerStatusCardProps {
  handleNavigation?: (tab: string, section?: string) => void;
  className?: string;
}

export const LoggerStatusCard = ({ handleNavigation, className = "" }: LoggerStatusCardProps) => {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [showStopDialog, setShowStopDialog] = useState(false);

  const fetchPingStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ping-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setPingStats(data);
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPingStatus = async () => {
    try {
      const response = await fetch('/api/ping?action=status');
      if (!response.ok) {
        throw new Error(`Failed to get ping status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error checking ping status:', err);
      return null;
    }
  };

  const handleToggleLogger = async (enabled: boolean) => {
    if (isToggling) return;
    
    // If we're turning off, show confirmation dialog
    if (!enabled) {
      setShowStopDialog(true);
      return;
    }
    
    // Otherwise, just start the logger
    await togglePingLoop(true);
  };

  const confirmStopLogger = async () => {
    setShowStopDialog(false);
    await togglePingLoop(false);
  };

  const togglePingLoop = async (start: boolean) => {
    if (isToggling) return;
    
    setIsToggling(true);
    
    try {
      const action = start ? 'start' : 'stop';
      const response = await fetch(`/api/ping?action=${action}`);
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} ping loop: ${response.status} ${response.statusText}`);
      }
      
      // Refresh data after toggle
      setTimeout(() => {
        fetchPingStats();
        getPingStatus();
      }, 1000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    fetchPingStats();
    
    // Refresh ping stats every 15 seconds
    const interval = setInterval(fetchPingStats, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate time since last ping
  const timeSinceLastPing = () => {
    if (!pingStats?.lastPing) return 'N/A';
    const seconds = Math.floor((Date.now() - pingStats.lastPing) / 1000);
    return `${seconds}s ago`;
  };

  // Calculate time until next ping
  const timeUntilNextPing = () => {
    if (!pingStats?.nextPingIn) return 'N/A';
    return pingStats.nextPingIn > 0 ? `${Math.floor(pingStats.nextPingIn / 1000)}s` : 'Imminent';
  };

  // Get the interval value in seconds
  const getIntervalValue = () => {
    // Try several possible properties where interval might be stored
    if (pingStats?.pingInterval) return `${Math.floor(pingStats.pingInterval/1000)}s`;
    if (pingStats?.refreshInterval) return `${Math.floor(pingStats.refreshInterval/1000)}s`;
    
    // If we find it in the recent history
    if (pingStats?.recentHistory && pingStats.recentHistory.length > 0) {
      const entry = pingStats.recentHistory[0];
      if (entry.refreshInterval) return `${Math.floor(entry.refreshInterval/1000)}s`;
    }
    
    return 'N/A';
  };

  // Get service count
  const getServiceCount = () => {
    if (pingStats?.services && Array.isArray(pingStats.services)) {
      return pingStats.services.length;
    }
    
    if (pingStats?.servicesCount) return pingStats.servicesCount;
    
    if (pingStats?.recentHistory && pingStats.recentHistory.length > 0) {
      return pingStats.recentHistory[0].servicesChecked || 'N/A';
    }
    
    return 'N/A';
  };

  // Determine logger status
  const getLoggerStatus = () => {
    if (!pingStats?.lastPing) return { status: 'Unknown', color: 'bg-slate-100 text-slate-500' };
    
    const seconds = Math.floor((Date.now() - pingStats.lastPing) / 1000);
    
    if (seconds > 90) {
      return { status: 'Inactive', color: 'bg-red-100 text-red-700' };
    } else if (seconds > 60) {
      return { status: 'Delayed', color: 'bg-orange-100 text-orange-700' };
    } else {
      return { status: 'Active', color: 'bg-green-100 text-green-700' };
    }
  };

  const loggerStatus = getLoggerStatus();
  const isActive = loggerStatus.status === 'Active';

  return (
    <>
      <Card className={`overflow-hidden border col-span-6 lg:col-span-3 ${className}`}>
        <CardHeader className="border-b pb-2 pt-3 px-4 h-[72px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">System Logger</CardTitle>
              <CardDescription className="text-xs">Service monitoring engine</CardDescription>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${loggerStatus.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                loggerStatus.status === 'Active' ? 'bg-green-500' : 
                loggerStatus.status === 'Delayed' ? 'bg-orange-500' : 
                loggerStatus.status === 'Inactive' ? 'bg-red-500' : 
                'bg-slate-400'
              }`}></div>
              {loggerStatus.status}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {isLoading && !pingStats ? (
            <div className="flex h-[140px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="h-[140px] flex items-center justify-center flex-col space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-red-500 text-center">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPingStats}
                className="mt-2"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Logger State Toggle Section */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Monitoring Status</h3>
                  <p className="text-xs text-slate-500 mt-1">Service health monitoring</p>
                </div>
                <div className="relative">
                  {isToggling && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  )}
                  <Switch 
                    disabled={isToggling}
                    checked={isActive}
                    onCheckedChange={handleToggleLogger}
                    aria-label="Toggle logger status"
                  />
                </div>
              </div>
              
              {/* Monitor Stats Section */}
              <div className="bg-slate-50 rounded-md p-3 mt-4">
                <h4 className="text-xs font-medium text-slate-700 mb-2">Monitor Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center text-xs">
                      <Clock className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                      <span className="text-slate-600 font-medium mr-1">Last check:</span>
                      <span>{timeSinceLastPing()}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Activity className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                      <span className="text-slate-600 font-medium mr-1">Next check:</span>
                      <span>{timeUntilNextPing()}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center text-xs">
                      <Clock className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                      <span className="text-slate-600 font-medium mr-1">Interval:</span>
                      <span>{getIntervalValue()}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Server className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                      <span className="text-slate-600 font-medium mr-1">Services:</span>
                      <span>{getServiceCount()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Debug Console Button */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  size="default"
                  className="justify-center h-10"
                  onClick={() => window.open("/debug/ping", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Debug
                </Button>
                <Button
                  variant="default"
                  size="default"
                  className="justify-center h-10"
                  onClick={() => {
                    if (handleNavigation) {
                      handleNavigation("settings", "general");
                    } else {
                      window.location.href = "/admin?tab=settings&section=general";
                    }
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Stop Monitoring System</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop the monitoring system? This will disable automatic service health checks.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Warning</p>
                <p className="text-xs text-amber-700 mt-1">
                  Stopping the monitoring system will prevent the detection of service outages
                  and may result in missed incidents. Status page will not be updated.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmStopLogger}>
              Stop Monitoring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 