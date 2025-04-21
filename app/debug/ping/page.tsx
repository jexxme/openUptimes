'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime, formatTimeConsistent } from '../../lib/utils/timeUtils';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import DebugNav from '@/app/components/debug/DebugNav';
import PingHistory from '@/app/components/debug/PingHistory';
import Tooltip from '@/app/components/debug/Tooltip';
import { 
  CronJob, 
  listCronJobs,
  validateCronExpression,
  describeCronExpression,
  getNextRunTime,
  startJob,
  stopJob
} from '../../lib/client/cronClient';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [intervalStats, setIntervalStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [activeCronJobs, setActiveCronJobs] = useState<number>(0);
  const [isCronLoading, setIsCronLoading] = useState(true);
  const router = useRouter();
  const { theme } = useTheme();

  // Instead of forcing light mode, we'll just track theme changes
  useEffect(() => {
    // No longer forcing light theme, instead respecting user preference
    addLog(`Using ${theme} theme mode`);
    
    return () => {
      // No need to reset theme on unmount
    };
  }, [theme]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev].slice(0, 100));
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

  const fetchPingStats = async (resetIntervals = false) => {
    try {
      setIsLoading(true);
      addLog('Fetching ping stats...');
      
      // If reset is requested, call the reset API first
      if (resetIntervals) {
        addLog('Resetting interval statistics...');
        try {
          const resetResponse = await fetch('/api/ping?action=reset_intervals');
          if (!resetResponse.ok) {
            throw new Error(`Failed to reset intervals: ${resetResponse.status} ${resetResponse.statusText}`);
          }
          addLog('Interval statistics reset successfully');
        } catch (resetErr) {
          addLog(`Error resetting intervals: ${(resetErr as Error).message}`);
        }
      }
      
      // Request all ping history entries by adding limit=0 parameter
      const response = await fetch('/api/ping-stats?limit=0');
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Ensure we're using all available entries
      if (data.recentHistory) {
        addLog(`Processing ${data.recentHistory.length} ping history entries`);
      }
      
      setPingStats(data);
      
      // Calculate interval stats based on fetched data
      const stats = calculateIntervalStats(data);
      setIntervalStats(stats);
      if (stats) {
        addLog(`Interval statistics updated successfully (${stats.sampleSize} intervals since last reset)`);
      } else {
        addLog('Not enough data for interval statistics since last reset');
      }
      
      setLastUpdate(new Date());
      addLog('Ping stats updated successfully');
    } catch (err) {
      setError((err as Error).message);
      addLog(`Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      addLog('Fetching site settings...');
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSiteSettings(data);
      addLog('Site settings loaded successfully');
    } catch (err) {
      addLog(`Error loading settings: ${(err as Error).message}`);
    }
  };

  const triggerPing = async () => {
    try {
      addLog(`Triggering manual ping...`);
      
      const response = await fetch(`/api/ping?source=manual`);
      if (!response.ok) {
        throw new Error(`Failed to trigger ping: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Ping triggered successfully: ${data.status}`);
      
      // Refresh ping stats after a short delay
      setTimeout(fetchPingStats, 1000);
    } catch (err) {
      addLog(`Error triggering ping: ${(err as Error).message}`);
    }
  };

  const getPingStatus = async () => {
    try {
      addLog('Checking ping loop status...');
      
      const response = await fetch('/api/ping?action=status');
      if (!response.ok) {
        throw new Error(`Failed to get ping status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Ping loop active: ${data.pingLoopActive}`);
      
      return data;
    } catch (err) {
      addLog(`Error checking ping status: ${(err as Error).message}`);
      return null;
    }
  };

  // Function to fetch cron jobs
  const fetchCronJobs = async () => {
    try {
      setIsCronLoading(true);
      addLog('Fetching cron jobs...');
      
      const jobs = await listCronJobs();
      setCronJobs(jobs);
      setActiveCronJobs(jobs.filter(job => job.status === 'running').length);
      
      addLog(`Fetched ${jobs.length} cron jobs`);
    } catch (err) {
      addLog(`Error loading cron jobs: ${(err as Error).message}`);
    } finally {
      setIsCronLoading(false);
    }
  };

  useEffect(() => {
    fetchPingStats();
    fetchSiteSettings();
    getPingStatus();
    fetchCronJobs();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(() => {
      fetchPingStats();
      fetchCronJobs();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Format relative time with color coding
  const formatRelativeTimeWithStatus = (seconds: number) => {
    const statusClass = seconds > 90 ? 'text-red-600 font-bold' : seconds > 60 ? 'text-orange-500' : 'text-green-600';
    return <span className={statusClass}>{seconds} seconds ago</span>;
  };

  // Format GitHub Action cron schedule for display
  const formatCronSchedule = (cronExpression: string) => {
    if (!cronExpression) return 'Invalid schedule';
    
    // Simple human-readable conversion for common patterns
    if (cronExpression === '* * * * *') return 'Every minute (requires minimum 5 minutes for GitHub Actions)';
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
      const mins = match ? match[1] : '';
      const interval = parseInt(mins);
      
      if (interval < 5) {
        return `Every ${mins} minute${interval > 1 ? 's' : ''} (below GitHub Actions 5-minute minimum)`;
      }
      
      return `Every ${mins} minute${interval > 1 ? 's' : ''}`;
    }
    
    return cronExpression;
  };

  // Calculate time since last ping
  const timeSinceLastPing = () => {
    if (!pingStats?.lastPing) return 'N/A';
    const seconds = Math.floor((Date.now() - pingStats.lastPing) / 1000);
    return `${seconds} seconds ago`;
  };

  // Calculate time until next ping
  const timeUntilNextRun = () => {
    if (!pingStats?.timeUntilNextRun) return 'N/A';
    return pingStats.timeUntilNextRun > 0 ? `${Math.floor(pingStats.timeUntilNextRun / 1000)} seconds` : 'Imminent';
  };

  return (
    <div className="bg-background text-foreground">
      <DebugNav />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ping System Debug</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage the ping system that checks your services
            </p>
          </div>
          {pingStats?.githubAction && (
            <div className="flex space-x-3">
              <button
                onClick={triggerPing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Trigger Manual Ping
              </button>
            </div>
          )}
        </div>
        
        {/* System Status and Interval Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              System Status
            </h2>
            
            {isLoading && !pingStats ? (
              <div className="flex justify-center py-6">
                <div className="flex flex-col items-center">
                  <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading stats...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            ) : (
              <div className="bg-accent p-3 rounded-md border border-border">
                {/* Status Header with Badge */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-foreground">Ping Service</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                    pingStats?.lastPing && (Date.now() - pingStats.lastPing > 90000)
                      ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                      : pingStats?.lastPing && (Date.now() - pingStats.lastPing > 60000)
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                  }`}>
                    {pingStats?.lastPing 
                      ? (Date.now() - pingStats.lastPing > 90000)
                        ? "Critical: Overdue"
                        : (Date.now() - pingStats.lastPing > 60000)
                        ? "Warning: Delayed"
                        : "Healthy"
                      : "No Data"}
                  </span>
                </div>
                
                {/* Visual Progress Bar */}
                {pingStats?.lastPing && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <Tooltip text="Time elapsed since the last ping">
                        <span className="text-muted-foreground">Last ping: {formatTime(pingStats?.lastPing)}</span>
                      </Tooltip>
                      <span className="font-medium">
                        {Math.floor((Date.now() - pingStats.lastPing) / 1000)}s ago
                      </span>
                    </div>
                    <div className="bg-muted rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full ${
                          Math.floor((Date.now() - pingStats.lastPing) / 1000) > 90 ? 'bg-red-500 dark:bg-red-600' : 
                          Math.floor((Date.now() - pingStats.lastPing) / 1000) > 60 ? 'bg-yellow-500 dark:bg-yellow-600' : 
                          'bg-green-500 dark:bg-green-600'
                        }`} 
                        style={{ width: `${Math.min(100, Math.floor((Date.now() - pingStats.lastPing) / 1000) / (pingStats.intervalSeconds || 300) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Key Information */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex justify-between">
                    <Tooltip text="Next ping based on active systems">
                      <span className="text-muted-foreground border-b border-dotted border-border">Next ping:</span>
                    </Tooltip>
                    <span>{(() => {
                      // Combine GitHub Actions and Cron Jobs to determine next ping
                      let nextTimes = [];
                      
                      // Add GitHub Actions estimated run if enabled
                      if (pingStats?.githubAction?.enabled && pingStats?.nextEstimatedRun) {
                        nextTimes.push({
                          time: pingStats.nextEstimatedRun,
                          source: 'GitHub'
                        });
                      }
                      
                      // Add next cron job run if any are active
                      if (activeCronJobs > 0) {
                        const activeJobs = cronJobs
                          .filter(job => job.status === 'running' && job.nextRun)
                          .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                          
                        if (activeJobs.length > 0) {
                          nextTimes.push({
                            time: activeJobs[0].nextRun || 0,
                            source: 'Cron'
                          });
                        }
                      }
                      
                      // If no active pinging systems, return unknown
                      if (nextTimes.length === 0) return 'Unknown';
                      
                      // Return the next scheduled ping
                      nextTimes.sort((a, b) => a.time - b.time);
                      const next = nextTimes[0];
                      
                      return `${formatTimeConsistent(next.time)} (${next.source})`;
                    })()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <Tooltip text="Time remaining until next ping">
                      <span className="text-muted-foreground border-b border-dotted border-border">Wait time:</span>
                    </Tooltip>
                    <span>{(() => {
                      // Combine GitHub Actions and Cron Jobs to determine wait time
                      let nextTimes = [];
                      
                      // Add GitHub Actions wait time if enabled
                      if (pingStats?.githubAction?.enabled && pingStats?.timeUntilNextRun) {
                        nextTimes.push(pingStats.timeUntilNextRun);
                      }
                      
                      // Add next cron job wait time if any are active
                      if (activeCronJobs > 0) {
                        const activeJobs = cronJobs
                          .filter(job => job.status === 'running' && job.nextRun)
                          .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                          
                        if (activeJobs.length > 0) {
                          const waitTime = activeJobs[0].nextRun ? activeJobs[0].nextRun - Date.now() : 0;
                          if (waitTime > 0) nextTimes.push(waitTime);
                        }
                      }
                      
                      // If no active pinging systems, return N/A
                      if (nextTimes.length === 0) return 'N/A';
                      
                      // Return the shortest wait time
                      nextTimes.sort((a, b) => a - b);
                      const waitTime = nextTimes[0];
                      
                      return waitTime > 0 ? `${Math.floor(waitTime / 1000)} seconds` : 'Imminent';
                    })()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <Tooltip text="Active ping systems">
                      <span className="text-muted-foreground border-b border-dotted border-border">Active systems:</span>
                    </Tooltip>
                    <span>
                      {(() => {
                        let systems = [];
                        if (pingStats?.githubAction?.enabled) systems.push('GitHub');
                        if (activeCronJobs > 0) systems.push(`Cron (${activeCronJobs})`);
                        return systems.length > 0 ? systems.join(', ') : 'None';
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <Tooltip text="Last time this page was refreshed">
                      <span className="text-muted-foreground border-b border-dotted border-border">Updated:</span>
                    </Tooltip>
                    <span>{formatTimeConsistent(lastUpdate.getTime())}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-card p-4 rounded-lg shadow-sm border border-border md:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Interval Analysis
              </h2>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {intervalStats && (
                  <>
                    <Tooltip text="Only using ping data since last reset">
                      <span className="text-xs text-muted-foreground border-dotted border-b border-border">
                        Since: {formatTime(pingStats?.lastIntervalReset || 0)}
                      </span>
                    </Tooltip>
                  </>
                )}
              </div>
              {intervalStats && (
                <button 
                  onClick={() => fetchPingStats(true)} 
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Reset Stats
                </button>
              )}
            </div>
            <div className="bg-accent p-3 rounded-md border border-border text-sm">
              {!intervalStats ? (
                <p className="text-muted-foreground py-2 text-center">Not enough data for interval analysis (need at least 2 pings)</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <Tooltip text="The expected interval based on GitHub Actions schedule">
                          <span className="text-muted-foreground border-b border-dotted border-border">Expected interval:</span>
                        </Tooltip>
                        <span className="font-medium">{intervalStats.expectedInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average time between recorded pings">
                          <span className="text-muted-foreground border-b border-dotted border-border">Actual avg interval:</span>
                        </Tooltip>
                        <span className={`font-medium ${Math.abs(intervalStats.avgInterval - intervalStats.expectedInterval) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {intervalStats.avgInterval}s
                          {Math.abs(intervalStats.avgInterval - intervalStats.expectedInterval) > 5 && 
                            <span className="ml-1 text-xs">
                              ({intervalStats.avgInterval > intervalStats.expectedInterval ? '+' : '-'}
                              {Math.abs(intervalStats.avgInterval - intervalStats.expectedInterval)}s)
                            </span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average deviation from expected interval">
                          <span className="text-muted-foreground border-b border-dotted border-border">Average drift:</span>
                        </Tooltip>
                        <span className={`font-medium ${intervalStats.avgDrift > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>±{intervalStats.avgDrift}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Range of observed intervals">
                          <span className="text-muted-foreground border-b border-dotted border-border">Min/Max interval:</span>
                        </Tooltip>
                        <span className="font-medium">{intervalStats.minInterval}s / {intervalStats.maxInterval}s</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Tooltip text="How consistently GitHub Actions maintains the schedule">
                          <span className="font-medium text-foreground border-b border-dotted border-border">Timing Consistency</span>
                        </Tooltip>
                        <div className="flex items-center space-x-1.5">
                          <Tooltip text="Intervals analyzed since last reset">
                            <div className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              {intervalStats.sampleSize} / {intervalStats.totalSamples - 1}
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <div className="bg-muted rounded-full h-5 overflow-hidden mb-2">
                          <div 
                            className={`h-full ${
                              intervalStats.consistency > 90 ? 'bg-green-500 dark:bg-green-600' : 
                              intervalStats.consistency > 70 ? 'bg-yellow-500 dark:bg-yellow-600' : 
                              'bg-orange-500 dark:bg-orange-600'
                            }`} 
                            style={{ width: `${intervalStats.consistency}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs text-muted-foreground">Poor</span>
                          <span className="text-xs font-medium">
                            {intervalStats.consistency}% ({
                              intervalStats.consistency > 90 ? 'Excellent' : 
                              intervalStats.consistency > 70 ? 'Good' : 
                              intervalStats.consistency > 50 ? 'Fair' : 
                              'Poor'
                            })
                          </span>
                          <span className="text-xs text-muted-foreground">Excellent</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-1 ${
                          intervalStats.sampleSize < 3 ? 'bg-amber-500 dark:bg-amber-600' : 
                          intervalStats.sampleSize < 10 ? 'bg-yellow-500 dark:bg-yellow-600' : 
                          'bg-green-500 dark:bg-green-600'
                        }`}></div>
                        <span className="text-xs text-muted-foreground">
                          {intervalStats.sampleSize < 3 ? 
                            'Limited data - more samples needed for reliable analysis' : 
                            intervalStats.sampleSize < 10 ? 
                            'Moderate sample size - analysis is becoming more reliable' : 
                            'Good sample size - analysis is statistically reliable'}
                        </span>
                      </div>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Configuration Status Card */}
        <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <h2 className="text-sm font-medium text-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuration Status
              </h2>
              <div className="flex items-center space-x-3 ml-3">
                <button 
                  onClick={() => router.push('/debug/ping/github')} 
                  className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-800 dark:hover:text-blue-400 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  GitHub Settings
                </button>
                <button 
                  onClick={() => router.push('/debug/ping/cron')} 
                  className="text-xs text-indigo-600 dark:text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-400 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cron Settings
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${
                pingStats?.lastPing && (Date.now() - pingStats.lastPing > 90000)
                  ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                  : pingStats?.lastPing && (Date.now() - pingStats.lastPing > 60000)
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
              }`}>
                <span className="mr-1">Ping Status:</span>
                {pingStats?.lastPing 
                  ? (Date.now() - pingStats.lastPing > 90000)
                    ? "Critical"
                    : (Date.now() - pingStats.lastPing > 60000)
                    ? "Warning"
                    : "Healthy"
                  : "Unknown"}
              </div>
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${
                (!pingStats?.githubAction?.enabled && activeCronJobs === 0)
                  ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
              }`}>
                <span className="mr-1">System:</span>
                {(!pingStats?.githubAction?.enabled && activeCronJobs === 0)
                  ? "No Active Services"
                  : "Operational"}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              {/* GitHub Actions Status */}
              <div className="bg-accent p-3 rounded-md border border-border">
                <div className="flex items-center mb-2">
                  <div className={`h-3 w-3 rounded-full mr-2 ${pingStats?.githubAction?.enabled ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <h3 className="text-sm font-medium text-foreground">GitHub Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-muted-foreground">Status:</div>
                  <div className="font-medium">
                    {pingStats?.githubAction?.enabled ? 
                      <span className="text-green-600 dark:text-green-400">Enabled</span> : 
                      <span className="text-muted-foreground">Disabled</span>}
                  </div>
                  
                  <div className="text-muted-foreground">Schedule:</div>
                  <div className="font-medium text-foreground">
                    {pingStats?.githubAction?.schedule || 'Not set'}
                  </div>
                  
                  <div className="text-muted-foreground">Repository:</div>
                  <div className="font-medium text-foreground truncate">
                    {pingStats?.githubAction?.repository || 'Not configured'}
                  </div>
                  
                  <div className="text-muted-foreground">Workflow:</div>
                  <div className="font-medium text-foreground">
                    {pingStats?.githubAction?.workflow || 'Not set'}
                  </div>
                </div>
                {!pingStats?.githubAction?.enabled && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>GitHub Actions workflow is disabled</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Cron Jobs Status */}
              <div className="bg-accent p-3 rounded-md border border-border">
                <div className="flex items-center mb-2">
                  <div className={`h-3 w-3 rounded-full mr-2 ${activeCronJobs > 0 ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <h3 className="text-sm font-medium text-foreground">Cron Jobs</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-muted-foreground">Status:</div>
                  <div className="font-medium">
                    {activeCronJobs > 0 ? 
                      <span className="text-green-600 dark:text-green-400">Active</span> : 
                      <span className="text-muted-foreground">Inactive</span>}
                  </div>
                  
                  <div className="text-muted-foreground">Total Jobs:</div>
                  <div className="font-medium text-foreground">
                    {isCronLoading ? 'Loading...' : cronJobs.length}
                  </div>
                  
                  <div className="text-muted-foreground">Active Jobs:</div>
                  <div className="font-medium text-foreground">
                    {isCronLoading ? 'Loading...' : activeCronJobs}
                  </div>
                  
                  <div className="text-muted-foreground">Next Run:</div>
                  <div className="font-medium text-foreground">
                    {(() => {
                      if (isCronLoading) return 'Loading...';
                      
                      const activeJobs = cronJobs.filter(job => job.status === 'running' && job.nextRun);
                      if (activeJobs.length === 0) return 'N/A';
                      
                      const sortedJobs = [...activeJobs].sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                      const nextJob = sortedJobs[0];
                      
                      return formatTimeConsistent(nextJob.nextRun || 0);
                    })()}
                  </div>
                </div>
                {cronJobs.length > 0 && activeCronJobs === 0 && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No active cron jobs running</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* API Authentication Status */}
              <div className="bg-accent p-3 rounded-md border border-border">
                <div className="flex items-center mb-2">
                  <div className={`h-3 w-3 rounded-full mr-2 ${siteSettings?.apiKey ? 'bg-green-500 dark:bg-green-600' : 'bg-amber-500 dark:bg-amber-600'}`}></div>
                  <h3 className="text-sm font-medium text-foreground">API Authentication</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-muted-foreground">API Key:</div>
                  <div className="font-medium">
                    {siteSettings?.apiKey ? 
                      <span className="text-green-600 dark:text-green-400">Configured</span> : 
                      <span className="text-amber-600 dark:text-amber-400">Not configured</span>}
                  </div>
                  
                  <div className="text-muted-foreground">Secret Name:</div>
                  <div className="font-medium text-foreground">
                    {siteSettings?.githubAction?.secretName || 'PING_API_KEY'}
                  </div>
                </div>
                {!siteSettings?.apiKey && (pingStats?.githubAction?.enabled || activeCronJobs > 0) && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>API key not configured. Authentication may fail.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Logs and Manual Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">        
          <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Logs
              </h2>
              <button 
                onClick={() => setLogs([])} 
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Logs
              </button>
            </div>
            <div className="bg-accent border border-border rounded-md h-64 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground p-3">No logs yet</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="px-3 py-1.5 hover:bg-accent/70 dark:hover:bg-muted/30 break-all border-b border-border/50 last:border-0">{log}</div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Manual Actions
            </h2>
            <div className="space-y-3">
              <button 
                onClick={triggerPing}
                className="w-full bg-card hover:bg-accent/50 rounded-md p-3 border border-border hover:border-primary/30 flex items-center transition-all duration-200"
              >
                <div className="h-9 w-9 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                <div className="ml-3 text-left">
                  <h3 className="font-medium text-foreground text-sm">Trigger Manual Ping</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Run an immediate check of all services and update their status
                  </p>
                </div>
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/debug/ping/github')}
                  className="flex-1 bg-card hover:bg-accent/50 rounded-md p-3 border border-border hover:border-blue-300 dark:hover:border-blue-700 flex items-center transition-all duration-200"
                >
                  <div className="h-9 w-9 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className="font-medium text-foreground text-sm">GitHub Actions</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage schedule and workflow settings
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/debug/ping/cron')}
                  className="flex-1 bg-card hover:bg-accent/50 rounded-md p-3 border border-border hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center transition-all duration-200"
                >
                  <div className="h-9 w-9 bg-indigo-500 dark:bg-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className="font-medium text-foreground text-sm">Cron Jobs</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create and manage scheduled ping jobs
                    </p>
                  </div>
                </button>
              </div>

              {cronJobs.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-medium text-foreground mb-2">Quick Cron Job Actions</h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto p-1">
                    {cronJobs.slice(0, 3).map((job) => (
                      <div 
                        key={job.id}
                        className="flex items-center justify-between bg-accent p-2 rounded-md border border-border"
                      >
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full ${job.status === 'running' ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                          <span className="ml-2 text-xs font-medium truncate max-w-[120px]" title={job.name}>
                            {job.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {job.status === 'running' ? (
                            <button
                              onClick={() => stopJob(job.id)}
                              className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => startJob(job.id)}
                              className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {cronJobs.length > 3 && (
                      <div className="text-center text-xs text-indigo-600 dark:text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-400">
                        <Link href="/debug/ping/cron">
                          View all {cronJobs.length} jobs →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Ping History - Now using the PingHistory component */}
        <PingHistory 
          pingStats={pingStats} 
          onRefresh={() => fetchPingStats()} 
          onReset={() => fetchPingStats(true)}
        />
        
        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center pb-4">
          OpenUptimes Ping System Debug v3.1 (GitHub Actions + Cron Jobs)
        </div>
      </div>
    </div>
  );
}