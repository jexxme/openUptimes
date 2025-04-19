"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ExternalLink, AlertTriangle, RotateCw, Clock, Server, Github, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface LoggerStatusCardProps {
  handleNavigation?: (tab: string, section?: string) => void;
  className?: string;
  preloadedPingStats?: any;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

// Simple tooltip component
const Tooltip = ({ text, children }: TooltipProps) => (
  <div className="group relative inline-block">
    {children}
    <div 
      className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                bg-gray-800 dark:bg-gray-900 text-white text-xs rounded p-2
                bottom-full left-1/2 transform -translate-x-1/2 mb-2
                z-[100] shadow-lg pointer-events-none w-48"
      style={{ 
        maxWidth: "200px",
        overflow: "visible" 
      }}
    >
      <div className="text-center">{text}</div>
      <div className="absolute w-3 h-3 bg-gray-800 dark:bg-gray-900 transform rotate-45 left-1/2 -ml-1.5 -bottom-1.5"></div>
    </div>
  </div>
);

export const LoggerStatusCard = ({ handleNavigation, className = "", preloadedPingStats = null }: LoggerStatusCardProps) => {
  console.log("[LoggerStatusCard] Rendering with preloaded data:", !!preloadedPingStats);
  const [pingStats, setPingStats] = useState<any>(preloadedPingStats);
  const [isLoading, setIsLoading] = useState(!preloadedPingStats);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const router = useRouter();
  
  // Track if this is the first render
  const isFirstRender = useRef(true);
  // Track if we've finished initial setup
  const initialSetupComplete = useRef(false);

  // Define calculateIntervalStats function before using it
  const calculateIntervalStats = (data: any = pingStats) => {
    if (!data?.recentHistory || data.recentHistory.length < 2) {
      return null;
    }
    
    // Filter history to only include entries since the last reset
    const lastResetTime = data.lastIntervalReset || 0;
    const history = data.recentHistory.filter((entry: any) => {
      const entryTime = typeof entry.timestamp === 'number' ? 
        entry.timestamp : new Date(entry.timestamp).getTime();
      return entryTime >= lastResetTime;
    });
    
    // If not enough entries since reset, return null
    if (history.length < 2) {
      return null;
    }
    
    const intervals = [];
    
    for (let i = 0; i < history.length - 1; i++) {
      // Ensure we're working with numbers for the calculation
      const currentTime = typeof history[i].timestamp === 'number' ? 
        history[i].timestamp : new Date(history[i].timestamp).getTime();
      
      const nextTime = typeof history[i+1].timestamp === 'number' ? 
        history[i+1].timestamp : new Date(history[i+1].timestamp).getTime();
      
      // Only add valid intervals
      if (!isNaN(currentTime) && !isNaN(nextTime)) {
        const interval = Math.round((currentTime - nextTime) / 1000);
        if (interval > 0) intervals.push(interval);
      }
    }
    
    // If no valid intervals found
    if (intervals.length === 0) return null;
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    
    // Calculate expected interval from cron (simplistic)
    const cronSchedule = data.githubAction?.schedule || '*/5 * * * *';
    let expectedInterval = 300; // Default 5 minutes (GitHub Actions minimum)
    if (cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/);
      if (match) {
        const minutes = parseInt(match[1]);
        // Enforce minimum 5 minutes for GitHub Actions
        expectedInterval = Math.max(5, minutes) * 60;
      }
    }
    
    const avgDrift = intervals.map(i => Math.abs(i - expectedInterval)).reduce((a, b) => a + b, 0) / intervals.length;
    const consistency = 100 - (avgDrift / expectedInterval * 100);
    
    return {
      avgInterval: Math.round(avgInterval),
      minInterval,
      maxInterval,
      avgDrift: Math.round(avgDrift),
      consistency: Math.round(Math.max(0, Math.min(100, consistency))),
      sampleSize: intervals.length,
      totalSamples: data.recentHistory.length,
      expectedInterval,
      resetTime: lastResetTime
    };
  };
  
  // Calculate initial interval stats from preloaded data if available
  const [intervalStats, setIntervalStats] = useState<any>(
    preloadedPingStats ? calculateIntervalStats(preloadedPingStats) : null
  );

  const fetchPingStats = async () => {
    console.log("[LoggerStatusCard] Fetching ping stats. First render:", isFirstRender.current);
    try {
      setIsLoading(true);
      const response = await fetch('/api/ping-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("[LoggerStatusCard] Ping stats fetched successfully");
      setPingStats(data);
      
      // Calculate interval stats based on fetched data
      const stats = calculateIntervalStats(data);
      setIntervalStats(stats);
      
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      console.error("[LoggerStatusCard] Error fetching ping stats:", err);
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

  // Initialize interval stats when preloaded data is provided
  useEffect(() => {
    console.log("[LoggerStatusCard] Initial useEffect for preloaded data. Have data:", !!preloadedPingStats);
    
    if (preloadedPingStats && !intervalStats && !initialSetupComplete.current) {
      console.log("[LoggerStatusCard] Using preloaded data for initial setup");
      const stats = calculateIntervalStats(preloadedPingStats);
      setIntervalStats(stats);
      setIsLoading(false);
      initialSetupComplete.current = true;
    }
  }, [preloadedPingStats, intervalStats]);

  useEffect(() => {
    console.log("[LoggerStatusCard] Setting up data refresh and timer intervals");
    
    // Only fetch initially if we don't have preloaded data and this is the first load
    if (!preloadedPingStats && isFirstRender.current && !initialSetupComplete.current) {
      console.log("[LoggerStatusCard] No preloaded data available, fetching on first render");
      fetchPingStats();
      initialSetupComplete.current = true;
    }
    
    isFirstRender.current = false;
    
    // Refresh ping stats every 15 seconds
    const dataRefreshInterval = setInterval(() => {
      console.log("[LoggerStatusCard] Refreshing data on interval");
      fetchPingStats();
    }, 15000);
    
    // Update time counters every second for real-time display
    const timeUpdateInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {
      console.log("[LoggerStatusCard] Cleaning up intervals");
      clearInterval(dataRefreshInterval);
      clearInterval(timeUpdateInterval);
    };
  }, [preloadedPingStats]);

  // Calculate time since last ping with proper formatting
  const timeSinceLastPing = () => {
    if (!pingStats?.lastPing) return 'N/A';
    const seconds = Math.floor((currentTime - pingStats.lastPing) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  // Calculate time until next ping with better formatting
  const timeUntilNextPing = () => {
    if (!pingStats?.timeUntilNextRun) return 'N/A';
    
    const secondsUntil = Math.floor(pingStats.timeUntilNextRun / 1000) - Math.floor((currentTime - lastUpdated) / 1000);
    
    if (secondsUntil <= 0) return 'Imminent';
    
    if (secondsUntil < 60) {
      return `${secondsUntil}s`;
    }
    
    const minutes = Math.floor(secondsUntil / 60);
    if (minutes < 60) {
      return `${minutes}m ${secondsUntil % 60}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  // Format estimated next run time with better human readability
  const formatEstimatedRunTime = () => {
    if (!pingStats?.nextEstimatedRun) return 'Unknown';
    
    const estimatedTime = typeof pingStats.nextEstimatedRun === 'number' ? 
      pingStats.nextEstimatedRun : new Date(pingStats.nextEstimatedRun).getTime();
    
    // If the estimated time is in the past or within 30 seconds
    if (estimatedTime < currentTime + 30000) {
      return 'Imminent';
    }
    
    // Calculate seconds until next run
    const secondsUntil = Math.floor((estimatedTime - currentTime) / 1000);
    
    // Format nicely
    if (secondsUntil < 60) {
      return `in ${secondsUntil}s`;
    } else if (secondsUntil < 3600) {
      const minutes = Math.floor(secondsUntil / 60);
      return `in ${minutes}m ${secondsUntil % 60}s`;
    } else {
      const hours = Math.floor(secondsUntil / 3600);
      const minutes = Math.floor((secondsUntil % 3600) / 60);
      return `in ${hours}h ${minutes}m`;
    }
  };

  // Format GitHub Action cron schedule
  const formatCronSchedule = (cronExpression: string) => {
    if (!cronExpression) return 'Invalid schedule';
    
    // Simple human-readable conversion for common patterns
    if (cronExpression === '* * * * *') return 'Every minute (GitHub: 5min min)';
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
      const mins = match ? match[1] : '';
      const interval = parseInt(mins);
      
      if (interval < 5) {
        return `Every ${mins}m (GitHub: 5min min)`;
      }
      
      return `Every ${mins}m`;
    }
    
    return cronExpression;
  };

  // Get last GitHub Actions ping time
  const getLastGitHubActionsPing = () => {
    if (!pingStats?.recentHistory || pingStats.recentHistory.length === 0) {
      return 'Never';
    }
    
    // Find the most recent GitHub Actions ping
    const githubPing = pingStats.recentHistory.find((entry: any) => 
      entry.source === 'github-action'
    );
    
    if (!githubPing) {
      return 'Not found';
    }
    
    // Calculate time since this ping occurred
    const pingTime = typeof githubPing.timestamp === 'number' ? 
      githubPing.timestamp : new Date(githubPing.timestamp).getTime();
    
    const seconds = Math.floor((currentTime - pingTime) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
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
    if (!pingStats?.lastPing) return { status: 'Unknown', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };
    
    const seconds = Math.floor((currentTime - pingStats.lastPing) / 1000);
    const interval = pingStats.intervalSeconds || 300;
    
    if (seconds > 1.5 * interval) {
      return { status: 'Critical', color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' };
    } else if (seconds > interval) {
      return { status: 'Warning', color: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400' };
    } else {
      return { status: 'Healthy', color: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' };
    }
  };

  const loggerStatus = getLoggerStatus();
  const secondsSinceLastPing = pingStats?.lastPing ? Math.floor((currentTime - pingStats.lastPing) / 1000) : 0;

  // Add debug render message
  console.log("[LoggerStatusCard] Rendering with state:", {
    hasData: !!pingStats,
    isLoading,
    hasError: !!error,
    hasIntervalStats: !!intervalStats
  });

  return (
    <Card className={`overflow-visible border ${className}`}>
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">System Logger</CardTitle>
            <CardDescription className="text-xs">Service monitoring engine</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/debug/ping')}
              className="h-7 px-2 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Debug
            </Button>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${loggerStatus.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                loggerStatus.status === 'Healthy' ? 'bg-green-500' : 
                loggerStatus.status === 'Warning' ? 'bg-orange-500' : 
                loggerStatus.status === 'Critical' ? 'bg-red-500' : 
                'bg-slate-400'
              }`}></div>
              {loggerStatus.status}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading && !pingStats ? (
          <div className="space-y-3">
            {/* Skeleton for the progress bar and status */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              
              {/* Skeleton for the timeline status bar */}
              <div className="mt-3 mb-2">
                <div className="relative h-5 mb-1">
                  <Skeleton className="h-3 w-8 absolute bottom-0 left-1/3 transform -translate-x-1/2" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
                <div className="flex text-[10px] mt-1 relative">
                  <Skeleton className="h-2 w-4 absolute left-0" />
                  <Skeleton className="h-2 w-6 absolute left-2/3 transform -translate-x-1/2" />
                  <Skeleton className="h-2 w-6 absolute right-0" />
                </div>
                <div className="h-5"></div>
              </div>
            </div>
            
            {/* Skeleton for the stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: GitHub + Performance */}
              <div className="space-y-3">
                {/* GitHub Actions Status Skeleton */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Skeleton className="h-2 w-2 rounded-full mr-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-18" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                </div>
                
                {/* Performance Skeleton */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Timing */}
              <div className="space-y-3">
                {/* Timing Skeleton */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-18" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
                
                {/* Stats Skeleton */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-5" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-18" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="h-[120px] flex items-center justify-center flex-col space-y-2">
            <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-2" />
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
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
          <div className="space-y-3">
            {/* Progress Bar and Status */}
            {pingStats?.lastPing && (
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <Tooltip text="Last time GitHub Actions triggered a ping">
                    <span className="text-slate-600 dark:text-slate-400">Last GitHub ping:</span>
                  </Tooltip>
                  <span className={`font-medium ${
                    secondsSinceLastPing > 1.5 * (pingStats.intervalSeconds || 300) ? 'text-red-600 dark:text-red-400' : 
                    secondsSinceLastPing > (pingStats.intervalSeconds || 300) ? 'text-orange-600 dark:text-orange-400' : 
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {getLastGitHubActionsPing()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <Tooltip text="Expected interval based on GitHub Actions schedule">
                    <span className="text-slate-600 dark:text-slate-400">Expected interval:</span>
                  </Tooltip>
                  <span className="font-medium dark:text-slate-300">
                    {pingStats?.githubAction?.schedule ? 
                      formatCronSchedule(pingStats.githubAction.schedule) : 
                      'Not configured'}
                  </span>
                </div>

                {/* Timeline Status Bar */}
                <div className="mt-3 mb-2">
                  {/* Current time indicator */}
                  <div className="relative h-5 mb-1">
                    <span 
                      className={`absolute font-medium text-[10px] ${
                        secondsSinceLastPing > 1.5 * (pingStats.intervalSeconds || 300) ? 'text-red-600 dark:text-red-400' : 
                        secondsSinceLastPing > (pingStats.intervalSeconds || 300) ? 'text-orange-600 dark:text-orange-400' : 
                        'text-green-600 dark:text-green-400'
                      }`}
                      style={{ 
                        left: `${Math.min(100, (100 * secondsSinceLastPing) / (1.5 * (pingStats.intervalSeconds || 300)))}%`,
                        bottom: '0',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {secondsSinceLastPing}s
                    </span>
                  </div>
                
                  {/* Timeline bar */}
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                    {/* Elapsed time section */}
                    <div 
                      className={`absolute h-full ${
                        secondsSinceLastPing > pingStats.intervalSeconds ? 
                          (secondsSinceLastPing > 1.5 * pingStats.intervalSeconds ? 'bg-red-500' : 'bg-yellow-500') : 
                          'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (100 * secondsSinceLastPing) / (1.5 * (pingStats.intervalSeconds || 300)))}%` 
                      }}
                    ></div>
                    
                    {/* Expected time marker */}
                    <div 
                      className="absolute h-full w-0.5 bg-slate-600 dark:bg-slate-400 z-10"
                      style={{ 
                        left: `${100 * 2/3}%` 
                      }}
                    ></div>
                  </div>
                  
                  {/* Time labels */}
                  <div className="flex text-[10px] mt-1 relative">
                    {/* Start time */}
                    <span className="absolute left-0 text-slate-500 dark:text-slate-400">0s</span>
                    
                    {/* Expected time - at 2/3 position */}
                    <span 
                      className="absolute text-slate-600 dark:text-slate-400 font-medium"
                      style={{ left: `${100 * 2/3}%`, transform: 'translateX(-50%)' }}
                    >
                      {pingStats.intervalSeconds || 300}s
                    </span>
                    
                    {/* Critical time - right end */}
                    <span className="absolute right-0 text-red-600 dark:text-red-400 font-medium">
                      {Math.round(1.5 * (pingStats.intervalSeconds || 300))}s
                    </span>
                  </div>
                  
                  {/* Add height to account for absolute positioning */}
                  <div className="h-5"></div>
                </div>
              </div>
            )}
            
            {/* Stats Grid - Combined Display */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: GitHub + Performance */}
              <div className="space-y-3">
                {/* GitHub Actions Status */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <div className={`h-2 w-2 rounded-full mr-1.5 ${pingStats?.githubAction?.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                      <Github className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" />
                      GitHub Actions
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="GitHub Actions workflow status">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Status:</span>
                      </Tooltip>
                      <span className="text-right">
                        {pingStats?.githubAction?.enabled ? 
                          <span className="text-green-600 dark:text-green-400">Enabled</span> : 
                          <span className="text-slate-400 dark:text-slate-500">Disabled</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Tooltip text="Number of successful ping runs (limited to last 10 entries)">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Success rate:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {pingStats?.recentHistory ? 
                          (() => {
                            const githubRuns = pingStats.recentHistory.filter((entry: any) => 
                              entry.source === 'github-action');
                            const count = githubRuns.length;
                            // Show only the percentage
                            return `${Math.round((count/10) * 100)}%`;
                          })() : 
                          '0%'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Performance */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Activity className="h-3 w-3 text-slate-500 dark:text-slate-400 mr-1" />
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Performance</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="Average execution time">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Execution:</span>
                      </Tooltip>
                      <span className={pingStats?.recentHistory?.length > 0 && 
                        Math.round(pingStats.recentHistory.reduce((sum: number, entry: any) => sum + entry.executionTime, 0) / pingStats.recentHistory.length) > 500 ? 
                        'text-amber-600 dark:text-amber-400 font-medium' : 'dark:text-slate-300'}>
                        {pingStats?.recentHistory?.length > 0 
                          ? `${Math.round(pingStats.recentHistory.reduce((sum: number, entry: any) => sum + entry.executionTime, 0) / pingStats.recentHistory.length)}ms` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Tooltip text="Fastest/slowest execution time">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Min/Max:</span>
                      </Tooltip>
                      <span>
                        {pingStats?.recentHistory?.length > 0 
                          ? <><span className="text-green-600 dark:text-green-400">{Math.min(...pingStats.recentHistory.map((e: any) => e.executionTime))}</span>/
                             <span className={Math.max(...pingStats.recentHistory.map((e: any) => e.executionTime)) > 500 ? 'text-amber-600 dark:text-amber-400' : ''}>
                               {Math.max(...pingStats.recentHistory.map((e: any) => e.executionTime))}
                             </span>ms</>
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Timing */}
              <div className="space-y-3">
                {/* Timing */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Calendar className="h-3 w-3 text-slate-500 dark:text-slate-400 mr-1" />
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Timing</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="Wait time until next service check">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Next check:</span>
                      </Tooltip>
                      <span className="font-medium">{timeUntilNextPing()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Tooltip text="Estimated time for the next GitHub Action run">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Next run:</span>
                      </Tooltip>
                      <span>
                        {formatEstimatedRunTime()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Server className="h-3 w-3 text-slate-500 dark:text-slate-400 mr-1" />
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Stats</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="Services being monitored">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Services:</span>
                      </Tooltip>
                      <span>{getServiceCount()}</span>
                    </div>
                    {intervalStats && (
                      <div className="flex justify-between items-center">
                        <Tooltip text="Scheduling consistency">
                          <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Consistency:</span>
                        </Tooltip>
                        <span className={
                          intervalStats.consistency > 90 ? 'text-green-600 dark:text-green-400' : 
                          intervalStats.consistency > 70 ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-orange-600 dark:text-orange-400'
                        }>
                          {intervalStats.consistency}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 