"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Activity, ExternalLink, AlertTriangle, RotateCw, Clock, Server, Github, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface LoggerStatusCardProps {
  handleNavigation?: (tab: string, section?: string) => void;
  className?: string;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

// Simple tooltip component
const Tooltip = ({ text, children }: TooltipProps) => (
  <div className="group relative inline-block">
    {children}
    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 dark:bg-gray-900 text-white text-xs rounded p-1 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 pointer-events-none">
      {text}
      <svg className="absolute text-gray-800 dark:text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
      </svg>
    </div>
  </div>
);

export const LoggerStatusCard = ({ handleNavigation, className = "" }: LoggerStatusCardProps) => {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [intervalStats, setIntervalStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const router = useRouter();

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

  useEffect(() => {
    fetchPingStats();
    
    // Refresh ping stats every 15 seconds
    const dataRefreshInterval = setInterval(fetchPingStats, 15000);
    
    // Update time counters every second for real-time display
    const timeUpdateInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {
      clearInterval(dataRefreshInterval);
      clearInterval(timeUpdateInterval);
    };
  }, []);

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
    
    if (seconds > 90) {
      return { status: 'Critical', color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' };
    } else if (seconds > 60) {
      return { status: 'Warning', color: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400' };
    } else {
      return { status: 'Healthy', color: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' };
    }
  };

  const loggerStatus = getLoggerStatus();
  const secondsSinceLastPing = pingStats?.lastPing ? Math.floor((currentTime - pingStats.lastPing) / 1000) : 0;

  return (
    <Card className={`overflow-hidden border col-span-6 lg:col-span-3 ${className}`}>
      <CardHeader className="border-b pb-2 pt-3 px-4 h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">System Logger</CardTitle>
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
          <div className="flex h-[120px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
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
                    secondsSinceLastPing > 90 ? 'text-red-600 dark:text-red-400' : 
                    secondsSinceLastPing > 60 ? 'text-orange-600 dark:text-orange-400' : 
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
                  {/* Time labels */}
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Last ping</span>
                    <span>Expected</span>
                    <span>Current</span>
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
                        width: `${Math.min(100, (100 * secondsSinceLastPing) / Math.max(secondsSinceLastPing, pingStats.intervalSeconds || 300))}%` 
                      }}
                    ></div>
                    
                    {/* Expected time marker */}
                    <Tooltip text={`Expected ping after: ${pingStats.intervalSeconds || 300}s`}>
                      <div 
                        className="absolute h-full w-0.5 bg-slate-600 dark:bg-slate-400 z-10"
                        style={{ 
                          left: `${Math.min(100, (100 * (pingStats.intervalSeconds || 300)) / Math.max(secondsSinceLastPing, pingStats.intervalSeconds || 300))}%` 
                        }}
                      ></div>
                    </Tooltip>
                  </div>
                  
                  {/* Time values */}
                  <div className="relative text-[10px] mt-1">
                    {/* Start time */}
                    <span className="absolute left-0 text-slate-500 dark:text-slate-400">0s</span>
                    
                    {/* Expected time - centered */}
                    <div className="absolute left-1/2 transform -translate-x-1/2">
                      <Tooltip text="Expected time interval">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {pingStats.intervalSeconds || 300}s
                        </span>
                      </Tooltip>
                    </div>
                    
                    {/* Current time */}
                    <div className="absolute right-0">
                      <Tooltip text={secondsSinceLastPing > (pingStats.intervalSeconds || 300) ? 
                        `Overdue by ${secondsSinceLastPing - (pingStats.intervalSeconds || 300)}s` : 
                        "Time since last ping"}>
                        <span className={`font-medium ${
                          secondsSinceLastPing > 1.5 * (pingStats.intervalSeconds || 300) ? 'text-red-600 dark:text-red-400' : 
                          secondsSinceLastPing > (pingStats.intervalSeconds || 300) ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-slate-600 dark:text-slate-400'
                        }`}>
                          {secondsSinceLastPing}s
                          {secondsSinceLastPing > (pingStats.intervalSeconds || 300) && 
                            ` (+${secondsSinceLastPing - (pingStats.intervalSeconds || 300)}s)`}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  
                  {/* Add height to account for absolute positioning */}
                  <div className="h-4"></div>
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
                      <Tooltip text="Number of successful ping runs">
                        <span className="text-slate-600 dark:text-slate-400 border-b border-dotted border-slate-300 dark:border-slate-700">Success count:</span>
                      </Tooltip>
                      <span className="text-right dark:text-slate-300">
                        {pingStats?.recentHistory ? pingStats.recentHistory.filter((entry: any) => 
                          entry.source === 'github-action').length : '0'}
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