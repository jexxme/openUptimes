'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime, formatTimeConsistent } from '../../lib/utils/timeUtils';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const router = useRouter();

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev].slice(0, 100));
  };

  const fetchPingStats = async () => {
    try {
      setIsLoading(true);
      addLog('Fetching ping stats...');
      
      const response = await fetch('/api/ping-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch ping stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setPingStats(data);
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
      
      const response = await fetch(`/api/ping`);
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

  useEffect(() => {
    fetchPingStats();
    fetchSiteSettings();
    getPingStatus();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(fetchPingStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Format relative time with color coding
  const formatRelativeTimeWithStatus = (seconds: number) => {
    const statusClass = seconds > 90 ? 'text-red-600 font-bold' : seconds > 60 ? 'text-orange-500' : 'text-green-600';
    return <span className={statusClass}>{seconds} seconds ago</span>;
  };

  // Create a simple tooltip component
  const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
    <div className="group relative inline-block">
      {children}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded p-1 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 pointer-events-none">
        {text}
        <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
        </svg>
      </div>
    </div>
  );

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

  // Calculate interval stats
  const calculateIntervalStats = () => {
    if (!pingStats?.recentHistory || pingStats.recentHistory.length < 2) {
      return null;
    }
    
    const history = pingStats.recentHistory;
    const intervals = [];
    
    for (let i = 0; i < history.length - 1; i++) {
      const interval = Math.round((history[i].timestamp - history[i+1].timestamp) / 1000);
      intervals.push(interval);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    
    // Calculate expected interval from cron (simplistic)
    const cronSchedule = pingStats.githubAction?.schedule || '*/5 * * * *';
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
      expectedInterval
    };
  };

  const intervalStats = calculateIntervalStats();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ping System Debug</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and troubleshoot the service monitoring system
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => router.push('/debug/ping/github')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            GitHub Actions Config
          </button>
          <button 
            onClick={() => router.push('/admin')} 
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Dashboard
          </button>
        </div>
      </div>
      
      {/* System Status and Interval Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            System Status
          </h2>
          
          {isLoading && !pingStats ? (
            <div className="flex justify-center py-6">
              <div className="flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-gray-600">Loading stats...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                  pingStats?.lastPing && (Date.now() - pingStats.lastPing > 90000)
                    ? "bg-red-100 text-red-800"
                    : pingStats?.lastPing && (Date.now() - pingStats.lastPing > 60000)
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
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
              <div className="flex justify-between">
                <Tooltip text="Time when the last ping check was performed">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Last ping:</span>
                </Tooltip>
                <span>{formatTime(pingStats?.lastPing)}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Time elapsed since the last ping check">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Since last ping:</span>
                </Tooltip>
                {pingStats?.lastPing ? (
                  formatRelativeTimeWithStatus(Math.floor((Date.now() - pingStats.lastPing) / 1000))
                ) : (
                  <span>N/A</span>
                )}
              </div>
              <div className="flex justify-between">
                <Tooltip text="Estimated time for the next GitHub Action run">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Next run:</span>
                </Tooltip>
                <span>{pingStats?.nextEstimatedRun ? formatTimeConsistent(pingStats.nextEstimatedRun) : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Time remaining until next ping">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Wait time:</span>
                </Tooltip>
                <span>{timeUntilNextRun()}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="GitHub Action schedule">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Schedule:</span>
                </Tooltip>
                <span>
                  {pingStats?.githubAction?.schedule ? 
                    formatCronSchedule(pingStats.githubAction.schedule) : 
                    'Not configured'}
                </span>
              </div>
              <div className="flex justify-between pt-2 mt-1 border-t border-gray-100">
                <Tooltip text="Last time this page was refreshed">
                  <span className="text-gray-600 border-b border-dotted border-gray-300">Updated:</span>
                </Tooltip>
                <span>{formatTimeConsistent(lastUpdate.getTime())}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-medium text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Interval Analysis
            </h2>
            {intervalStats && (
              <button 
                onClick={() => {
                  fetchPingStats();
                  addLog('Interval statistics cleared');
                }} 
                className="text-xs text-red-600 hover:text-red-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Stats
              </button>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
            {!intervalStats ? (
              <p className="text-gray-500 py-2 text-center">Not enough data for interval analysis (need at least 2 pings)</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <Tooltip text="The expected interval based on GitHub Actions schedule">
                      <span className="text-gray-600 border-b border-dotted border-gray-300">Expected interval:</span>
                        </Tooltip>
                    <span className="font-medium">{intervalStats.expectedInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average time between recorded pings">
                      <span className="text-gray-600 border-b border-dotted border-gray-300">Actual avg interval:</span>
                        </Tooltip>
                    <span className={`font-medium ${Math.abs(intervalStats.avgInterval - intervalStats.expectedInterval) > 5 ? 'text-amber-600' : 'text-gray-800'}`}>{intervalStats.avgInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average deviation from expected interval">
                      <span className="text-gray-600 border-b border-dotted border-gray-300">Average drift:</span>
                        </Tooltip>
                    <span className={`font-medium ${intervalStats.avgDrift > 5 ? 'text-amber-600' : 'text-green-600'}`}>±{intervalStats.avgDrift}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Range of observed intervals">
                      <span className="text-gray-600 border-b border-dotted border-gray-300">Min/Max interval:</span>
                        </Tooltip>
                    <span className="font-medium">{intervalStats.minInterval}s / {intervalStats.maxInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Based on sample of recorded ping intervals">
                      <span className="text-gray-600 border-b border-dotted border-gray-300">Sample size:</span>
                        </Tooltip>
                    <span className="font-medium">{intervalStats.sampleSize} intervals</span>
                  </div>
                  </div>
                  <div>
                    <Tooltip text="How consistently GitHub Actions maintains the schedule">
                    <p className="text-center mb-2 font-medium text-gray-700 border-b border-dotted border-gray-300">Timing Consistency</p>
                    </Tooltip>
                  <div className="bg-gray-200 rounded-full h-5 overflow-hidden mb-2">
                      <div 
                        className={`h-full ${
                          intervalStats.consistency > 90 ? 'bg-green-500' : 
                          intervalStats.consistency > 70 ? 'bg-yellow-500' : 
                          'bg-orange-500'
                        }`} 
                        style={{ width: `${intervalStats.consistency}%` }}
                      ></div>
                    </div>
                  <p className="text-xs text-center font-medium">
                      {intervalStats.consistency}% ({
                        intervalStats.consistency > 90 ? 'Excellent' : 
                        intervalStats.consistency > 70 ? 'Good' : 
                        intervalStats.consistency > 50 ? 'Fair' : 
                        'Poor'
                      })
                    </p>
                  <p className="text-xs text-gray-500 text-center mt-1.5">
                      {intervalStats.consistency < 70 ? 
                        "Inconsistent timing may be due to GitHub Actions scheduler load." : 
                        "Timing is within acceptable range."}
                    </p>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Configuration Status Card */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <h2 className="text-sm font-medium text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuration Status
            </h2>
            <button 
              onClick={() => router.push('/debug/ping/github')} 
              className="ml-3 text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Configure Settings
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${
              pingStats?.lastPing && (Date.now() - pingStats.lastPing > 90000)
                ? "bg-red-100 text-red-800"
                : pingStats?.lastPing && (Date.now() - pingStats.lastPing > 60000)
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
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
              (!pingStats?.githubAction?.enabled || !pingStats?.githubAction?.repository || !siteSettings?.apiKey)
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }`}>
              <span className="mr-1">Setup:</span>
              {(!pingStats?.githubAction?.enabled || !pingStats?.githubAction?.repository || !siteSettings?.apiKey)
                ? "Incomplete"
                : "Complete"}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            {/* GitHub Actions Status */}
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <div className="flex items-center mb-2">
                <div className={`h-3 w-3 rounded-full mr-2 ${pingStats?.githubAction?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <h3 className="text-sm font-medium text-gray-700">GitHub Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-gray-600">Status:</div>
                <div className="font-medium">
                  {pingStats?.githubAction?.enabled ? 
                    <span className="text-green-600">Enabled</span> : 
                    <span className="text-gray-600">Disabled</span>}
                </div>
                
                <div className="text-gray-600">Schedule:</div>
                <div className="font-medium text-gray-800">
                  {pingStats?.githubAction?.schedule || 'Not set'}
                </div>
                
                <div className="text-gray-600">Repository:</div>
                <div className="font-medium text-gray-800 truncate">
                  {pingStats?.githubAction?.repository || 'Not configured'}
                </div>
                
                <div className="text-gray-600">Workflow:</div>
                <div className="font-medium text-gray-800">
                  {pingStats?.githubAction?.workflow || 'Not set'}
                </div>
              </div>
              {!pingStats?.githubAction?.enabled && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-1.5 rounded">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>GitHub Actions is disabled. Scheduled checks won't run.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {/* API Authentication Status */}
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <div className="flex items-center mb-2">
                <div className={`h-3 w-3 rounded-full mr-2 ${siteSettings?.apiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <h3 className="text-sm font-medium text-gray-700">API Authentication</h3>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-gray-600">API Key:</div>
                <div className="font-medium">
                  {siteSettings?.apiKey ? 
                    <span className="text-green-600">Configured</span> : 
                    <span className="text-amber-600">Not configured</span>}
                </div>
                
                <div className="text-gray-600">Secret Name:</div>
                <div className="font-medium text-gray-800">
                  {siteSettings?.githubAction?.secretName || 'PING_API_KEY'}
                </div>
              </div>
              {!siteSettings?.apiKey && pingStats?.githubAction?.enabled && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-1.5 rounded">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-medium text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Activity Logs
            </h2>
            <button 
              onClick={() => setLogs([])} 
              className="text-xs text-red-600 hover:text-red-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 p-3">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="px-3 py-1.5 hover:bg-gray-100 break-all border-b border-gray-100 last:border-0">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Manual Actions
          </h2>
          <div className="space-y-3">
            <button 
              onClick={triggerPing}
              className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-green-300 flex items-center transition-all duration-200"
            >
              <div className="h-9 w-9 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              <div className="ml-3 text-left">
                <h3 className="font-medium text-gray-900 text-sm">Trigger Manual Ping</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Run an immediate check of all services and update their status
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push('/debug/ping/github')}
              className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-blue-300 flex items-center transition-all duration-200"
            >
              <div className="h-9 w-9 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              <div className="ml-3 text-left">
                <h3 className="font-medium text-gray-900 text-sm">Configure GitHub Actions</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage schedule, API key, and workflow settings
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Recent Ping History */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Recent Ping History
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              {pingStats?.recentHistory?.length || 0} entries
            </span>
            <button 
              onClick={() => fetchPingStats()} 
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 mb-1">Average Execution</div>
            <div className="text-sm font-medium">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.round(pingStats.recentHistory.reduce((sum: number, entry: any) => sum + entry.executionTime, 0) / pingStats.recentHistory.length)}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 mb-1">Fastest Ping</div>
            <div className="text-sm font-medium text-green-600">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.min(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 mb-1">Slowest Ping</div>
            <div className="text-sm font-medium text-amber-600">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.max(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200 text-center">
            <div className="text-xs text-gray-500 mb-1">Services Checked</div>
            <div className="text-sm font-medium">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? pingStats.recentHistory[0].servicesChecked 
                : 'N/A'}
            </div>
          </div>
        </div>
        
        {/* History Table */}
        <div className="overflow-auto rounded-md border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">#</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">Timestamp</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">Execution</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">Services</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">Source</th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-700 border-b border-gray-200">Run ID</th>
              </tr>
            </thead>
            <tbody>
              {pingStats?.recentHistory?.map((entry: any, i: number) => {
                // Calculate trend indicators for execution time
                const prevEntry = i < pingStats.recentHistory.length - 1 ? pingStats.recentHistory[i+1] : null;
                const executionTrend = prevEntry ? 
                  entry.executionTime > prevEntry.executionTime ? '↑' : 
                  entry.executionTime < prevEntry.executionTime ? '↓' : '→' 
                  : '';
                
                const executionDiff = prevEntry ? 
                  `${Math.abs(entry.executionTime - prevEntry.executionTime)}ms` : '';
                
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                    <td className="py-2.5 px-3 border-b border-gray-100">{i + 1}</td>
                    <td className="py-2.5 px-3 border-b border-gray-100">{formatTime(entry.timestamp)}</td>
                    <td className="py-2.5 px-3 text-right border-b border-gray-100">
                      <Tooltip text={executionDiff ? `Changed by ${executionDiff} ${executionTrend}` : 'Execution time'}>
                      <span className={entry.executionTime > 1000 ? 'text-red-500 font-medium' : 
                                       entry.executionTime > 500 ? 'text-amber-500' : 
                                       'text-green-600'}>
                        {entry.executionTime}ms
                      {executionTrend && (
                            <span className="ml-1 text-gray-500">
                          {executionTrend}
                        </span>
                      )}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="py-2.5 px-3 text-right border-b border-gray-100 font-medium">{entry.servicesChecked}</td>
                    <td className="py-2.5 px-3 text-center border-b border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        entry.source === 'github' ? 'bg-blue-100 text-blue-800' :
                        entry.source === 'manual' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {entry.source || 'legacy'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right border-b border-gray-100 font-mono">
                      {entry.runId || '-'}
                    </td>
                  </tr>
                );
              })}
              {(!pingStats?.recentHistory || pingStats.recentHistory.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-4 px-3 text-center text-gray-500">No ping history available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Execution Time Legend */}
        <div className="mt-3 text-xs text-gray-600 flex flex-wrap">
          <span className="inline-flex items-center mr-4 mb-1">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-1"></span> Fast (&lt;500ms)
          </span>
          <span className="inline-flex items-center mr-4 mb-1">
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1"></span> Moderate (500-1000ms)
          </span>
          <span className="inline-flex items-center mr-4 mb-1">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span> Slow (&gt;1000ms)
          </span>
          <span className="inline-flex items-center mb-1">
            <span className="text-gray-500 mr-1">↑↓</span> Change from previous ping
          </span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-xs text-gray-500 text-center pb-4">
        OpenUptimes Ping System Debug v3.0 (GitHub Actions)
      </div>
    </div>
  );
} 
