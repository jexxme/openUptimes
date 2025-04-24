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
import { Activity, ExternalLink, AlertTriangle, RotateCw, Clock, Server, Github, Calendar, Terminal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface LoggerStatusCardProps {
  handleNavigation?: (tab: string, section?: string) => void;
  className?: string;
  preloadedPingStats?: any;
  cronJobs?: any[];
  activeCronJobs?: number;
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

export const LoggerStatusCard = ({ 
  handleNavigation, 
  className = "", 
  preloadedPingStats = null,
  cronJobs = [],
  activeCronJobs = 0
}: LoggerStatusCardProps) => {

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

  // Detect which system is active
  const isCronActive = activeCronJobs > 0;
  const isGithubActive = !!(pingStats?.githubAction?.enabled);
  
  // Get active ping system name
  const getActiveSystem = () => {
    if (isCronActive) return { name: 'Cron Job', color: 'bg-indigo-500' };
    if (isGithubActive) return { name: 'GitHub Actions', color: 'bg-green-500' };
    return { name: 'None', color: 'bg-slate-500' };
  };
  
  const activeSystem = getActiveSystem();

  // Find the active cron job with the shortest interval
  const getActiveCronInterval = () => {
    if (cronJobs.length === 0 || activeCronJobs === 0) return null;
    
    const runningJobs = cronJobs.filter((job: any) => job.status === 'running');
    if (runningJobs.length === 0) return null;
    
    // Get expected intervals from cron expressions
    const intervals = runningJobs.map((job: any) => {
      const exp = job.cronExpression;
      // Simple parsing for */n format (minutes)
      if (exp.match(/^\*\/(\d+) \* \* \* \*$/)) {
        const match = exp.match(/^\*\/(\d+) \* \* \* \*$/);
        const minutes = match ? parseInt(match[1]) : 5;
        return { job, seconds: minutes * 60 };
      }
      // Default to 5 minutes for other formats
      return { job, seconds: 300 };
    });
    
    // Find the job with the shortest interval
    return intervals.sort((a, b) => a.seconds - b.seconds)[0];
  };
  
  // Get active cron job info
  const activeCronInterval = getActiveCronInterval();
  const activeCronJob = activeCronInterval?.job;
  
  // Get the expected interval based on active system
  const getSystemInterval = () => {
    if (isCronActive && activeCronInterval) {
      return activeCronInterval.seconds;
    }
    
    if (isGithubActive && pingStats?.githubAction?.schedule) {
      // Parse GitHub schedule
      const cronSchedule = pingStats.githubAction.schedule;
      if (cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/)) {
        const match = cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/);
        if (match) {
          const minutes = parseInt(match[1]);
          // Enforce minimum 5 minutes for GitHub Actions
          return Math.max(5, minutes) * 60;
        }
      }
      return 300; // Default GitHub interval is 5 minutes
    }
    
    // When no active system is detected, use fallback interval
    if (pingStats?.intervalSeconds) {
      return pingStats.intervalSeconds;
    }
    
    // Fall back to default interval
    return 300; // 5 minutes default
  };
  
  const systemInterval = getSystemInterval();

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
    
    // Use the expected interval from the active system
    const expectedInterval = systemInterval;
    
    const avgDrift = intervals.map(i => Math.abs(i - expectedInterval)).reduce((a, b) => a + b, 0) / intervals.length;
    const consistency = 100 - (avgDrift / expectedInterval * 100);
    
    return {
      avgInterval: Math.round(avgInterval),
      minInterval,
      maxInterval,
      avgDrift: Math.round(avgDrift),
      consistency: Math.round(Math.max(0, Math.min(100, consistency))),
      intervals,
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

    try {
      setIsLoading(true);
      const response = await fetch('/api/ping-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      setPingStats(data);
      
      // Calculate interval stats based on fetched data
      const stats = calculateIntervalStats(data);
      setIntervalStats(stats);
      
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

      return null;
    }
  };

  // Initialize interval stats when preloaded data is provided
  useEffect(() => {

    if (preloadedPingStats && !intervalStats && !initialSetupComplete.current) {

      const stats = calculateIntervalStats(preloadedPingStats);
      setIntervalStats(stats);
      setIsLoading(false);
      initialSetupComplete.current = true;
    }
  }, [preloadedPingStats, intervalStats]);

  useEffect(() => {

    // Only fetch initially if we don't have preloaded data and this is the first load
    if (!preloadedPingStats && isFirstRender.current && !initialSetupComplete.current) {

      fetchPingStats();
      initialSetupComplete.current = true;
    }
    
    isFirstRender.current = false;
    
    // Refresh ping stats every 15 seconds
    const dataRefreshInterval = setInterval(() => {

      fetchPingStats();
    }, 15000);
    
    // Update time counters every second for real-time display
    const timeUpdateInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {

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

  // Calculate time until next ping based on active system
  const timeUntilNextPing = () => {
    // For cron jobs, use the nextRun time from the active job
    if (isCronActive && activeCronJob?.nextRun) {
      const secondsUntil = Math.max(0, Math.round((activeCronJob.nextRun - currentTime) / 1000));
      
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
    }
    
    // For GitHub Actions or when no active system is detected
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

  // Format estimated next run time
  const formatEstimatedRunTime = () => {
    // For cron jobs, show next run from cron system
    if (isCronActive && activeCronJob?.nextRun) {
      const secondsUntil = Math.max(0, Math.round((activeCronJob.nextRun - currentTime) / 1000));
      
      if (secondsUntil <= 30) {
        return 'Imminent';
      }
      
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
    }
    
    // For GitHub Actions or when no active system is detected
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

  // Get last ping time by source
  const getLastPingBySource = (source: string) => {
    if (!pingStats?.recentHistory || pingStats.recentHistory.length === 0) {
      return 'Never';
    }
    
    // Find the most recent ping of the specified source
    const ping = pingStats.recentHistory.find((entry: any) => 
      entry.source === source
    );
    
    if (!ping) {
      return 'Not found';
    }
    
    // Calculate time since this ping occurred
    const pingTime = typeof ping.timestamp === 'number' ? 
      ping.timestamp : new Date(ping.timestamp).getTime();
    
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

  // Get last GitHub Actions ping time
  const getLastGitHubActionsPing = () => getLastPingBySource('github-action');
  
  // Get last Cron Job ping time
  const getLastCronPing = () => getLastPingBySource('cron-job');
  
  // Get last ping time from any source
  const getLastAnyPing = () => {
    if (!pingStats?.lastPing) return 'Never';
    
    const seconds = Math.floor((currentTime - pingStats.lastPing) / 1000);
    
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
  
  // Format a cron expression
  const formatCronSchedule = (cronExpression: string) => {
    if (!cronExpression) return 'Invalid schedule';
    
    // Simple human-readable conversion for common patterns
    if (cronExpression === '* * * * *') return 'Every minute';
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
      const mins = match ? match[1] : '';
      
      return `Every ${mins}m`;
    }
    
    return cronExpression;
  };
  
  // Format GitHub Action cron schedule
  const formatGitHubSchedule = (cronExpression: string) => {
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
    const interval = systemInterval;
    
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
              {/* Left Column: Ping Systems */}
              <div className="space-y-3">
                {/* GitHub Actions Status */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <div className={`h-2 w-2 rounded-full mr-1.5 ${isGithubActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
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
                      <Tooltip text="Last GitHub Actions ping">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Last run:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {getLastGitHubActionsPing()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Cron Job Status */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <div className={`h-2 w-2 rounded-full mr-1.5 ${isCronActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                      <Terminal className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" />
                      Cron Job
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="Cron Job system status">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Status:</span>
                      </Tooltip>
                      <span className="text-right">
                        {isCronActive ? 
                          <span className="text-indigo-600 dark:text-indigo-400">Active ({activeCronJobs})</span> : 
                          <span className="text-slate-400 dark:text-slate-500">Inactive</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Tooltip text="Last cron job ping">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Last run:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {getLastCronPing()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Timing and Stats */}
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
                      <Tooltip text={`Estimated time for the next ${
                        isCronActive ? "Cron Job" : 
                        isGithubActive ? "GitHub Action" : 
                        "run"
                      } run`}>
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Next run:</span>
                      </Tooltip>
                      <span>
                        {formatEstimatedRunTime()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Performance & Stats */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Activity className="h-3 w-3 text-slate-500 dark:text-slate-400 mr-1" />
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Performance</h4>
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
                {/* Active System Indicator */}
                <div className="flex justify-between items-center mb-1 text-xs">
                  <Tooltip text="Current system used for monitoring">
                    <span className="text-slate-600 dark:text-slate-400">Active system:</span>
                  </Tooltip>
                  <div className="flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${activeSystem.color}`}></div>
                    <span className="font-medium dark:text-slate-300">
                      {activeSystem.name}
                    </span>
                  </div>
                </div>
                
                {/* Last Ping Time based on active system */}
                <div className="flex justify-between items-center mb-1 text-xs">
                  <Tooltip text={`Last time ${activeSystem.name} triggered a ping`}>
                    <span className="text-slate-600 dark:text-slate-400">Last ping:</span>
                  </Tooltip>
                  <span className={`font-medium ${
                    secondsSinceLastPing > 1.5 * systemInterval ? 'text-red-600 dark:text-red-400' : 
                    secondsSinceLastPing > systemInterval ? 'text-orange-600 dark:text-orange-400' : 
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {isCronActive ? getLastCronPing() : 
                     isGithubActive ? getLastGitHubActionsPing() :
                     getLastAnyPing()}
                  </span>
                </div>
                
                {/* Expected interval based on active system */}
                <div className="flex justify-between items-center mb-1 text-xs">
                  <Tooltip text={`Expected interval ${
                    isCronActive ? "based on Cron Job schedule" : 
                    isGithubActive ? "based on GitHub Actions schedule" :
                    "based on default settings"
                  }`}>
                    <span className="text-slate-600 dark:text-slate-400">Expected interval:</span>
                  </Tooltip>
                  <span className="font-medium dark:text-slate-300">
                    {isCronActive && activeCronJob ? 
                      formatCronSchedule(activeCronJob.cronExpression) : 
                     isGithubActive && pingStats?.githubAction?.schedule ? 
                      formatGitHubSchedule(pingStats.githubAction.schedule) : 
                      `Every ${Math.round(systemInterval / 60)}m`}
                  </span>
                </div>
              </div>
            )}
            
            {/* Timeline Status Bar */}
            <div className="mt-3 mb-2">
              {/* Current time indicator */}
              <div className="relative h-5 mb-1">
                <span 
                  className={`absolute font-medium text-[10px] ${
                    secondsSinceLastPing > 1.5 * systemInterval ? 'text-red-600 dark:text-red-400' : 
                    secondsSinceLastPing > systemInterval ? 'text-orange-600 dark:text-orange-400' : 
                    'text-green-600 dark:text-green-400'
                  }`}
                  style={{ 
                    left: `${Math.min(100, (100 * secondsSinceLastPing) / (1.5 * systemInterval))}%`,
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
                    secondsSinceLastPing > systemInterval ? 
                      (secondsSinceLastPing > 1.5 * systemInterval ? 'bg-red-500' : 'bg-yellow-500') : 
                      'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (100 * secondsSinceLastPing) / (1.5 * systemInterval))}%` 
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
                  {systemInterval}s
                </span>
                
                {/* Critical time - right end */}
                <span className="absolute right-0 text-red-600 dark:text-red-400 font-medium">
                  {Math.round(1.5 * systemInterval)}s
                </span>
              </div>
              
              {/* Add height to account for absolute positioning */}
              <div className="h-5"></div>
            </div>
            
            {/* Stats Grid - Combined Display */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: Ping Systems */}
              <div className="space-y-3">
                {/* GitHub Actions Status */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <div className={`h-2 w-2 rounded-full mr-1.5 ${isGithubActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
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
                      <Tooltip text="Last GitHub Actions ping">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Last run:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {getLastGitHubActionsPing()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Cron Job Status */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <div className={`h-2 w-2 rounded-full mr-1.5 ${isCronActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <h3 className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                      <Terminal className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" />
                      Cron Job
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <Tooltip text="Cron Job system status">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Status:</span>
                      </Tooltip>
                      <span className="text-right">
                        {isCronActive ? 
                          <span className="text-indigo-600 dark:text-indigo-400">Active ({activeCronJobs})</span> : 
                          <span className="text-slate-400 dark:text-slate-500">Inactive</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Tooltip text="Last cron job ping">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Last run:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {getLastCronPing()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Timing and Stats */}
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
                      <Tooltip text={`Estimated time for the next ${
                        isCronActive ? "Cron Job" : 
                        isGithubActive ? "GitHub Action" : 
                        "run"
                      } run`}>
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Next run:</span>
                      </Tooltip>
                      <span>
                        {formatEstimatedRunTime()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Performance & Stats */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Activity className="h-3 w-3 text-slate-500 dark:text-slate-400 mr-1" />
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Performance</h4>
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