'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime, formatTimeConsistent } from '../../lib/utils/timeUtils';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import DebugNav from '@/app/components/debug/DebugNav';
import PingHistory from '@/app/components/debug/PingHistory';
import Tooltip from '@/app/components/debug/Tooltip';
import SystemStatus from '@/app/components/debug/SystemStatus';
import IntervalAnalysis from '@/app/components/debug/IntervalAnalysis';
import ConfigurationStatus from '@/app/components/debug/ConfigurationStatus';
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10);
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

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefresh && refreshInterval > 0) {
      addLog(`Auto-refresh enabled: refreshing every ${refreshInterval} seconds`);
      intervalId = setInterval(() => {
        addLog('Auto-refresh: fetching updated data...');
        fetchPingStats();
        fetchCronJobs();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

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
      resetTime: lastResetTime,
      intervals: intervals // Store the original intervals for further calculations
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
          // Reset interval stats in the client state
          setIntervalStats(null);
          
          // Call the API to reset intervals on the server
          const resetResponse = await fetch('/api/ping?action=reset_intervals');
          if (!resetResponse.ok) {
            throw new Error(`Failed to reset intervals: ${resetResponse.status} ${resetResponse.statusText}`);
          }
          addLog('Interval statistics reset successfully');
          
          // Slight delay to ensure the data is properly reset before fetching new data
          await new Promise(resolve => setTimeout(resolve, 100));
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
    fetchCronJobs();
    
    // If auto-refresh is enabled, don't create this interval since it's handled by the auto-refresh effect
    if (!autoRefresh) {
      // Refresh stats every 5 seconds
      const interval = setInterval(() => {
        fetchPingStats();
        fetchCronJobs();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

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
            <div className="flex space-x-3 items-center">
              <div className="flex items-center mr-3">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  className="mr-2"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
                  Auto-refresh
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="ml-2 text-sm border border-border rounded px-1 py-0.5 text-muted-foreground bg-background"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>
              <button 
                onClick={() => fetchPingStats()}
                className="bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                title="Refresh data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* System Status and Interval Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <SystemStatus 
            pingStats={pingStats}
            isLoading={isLoading}
            error={error}
            cronJobs={cronJobs}
            activeCronJobs={activeCronJobs}
            lastUpdate={lastUpdate}
          />
          
          <IntervalAnalysis
            intervalStats={intervalStats}
            pingStats={pingStats}
            fetchPingStats={fetchPingStats}
            cronJobs={cronJobs}
            activeCronJobs={activeCronJobs}
          />
        </div>
        
        {/* Configuration Status Card */}
        <ConfigurationStatus
          pingStats={pingStats}
          siteSettings={siteSettings}
          cronJobs={cronJobs}
          activeCronJobs={activeCronJobs}
          isCronLoading={isCronLoading}
        />
        
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
          OpenUptimes Ping System Debug v3.1
        </div>
      </div>
    </div>
  );
}