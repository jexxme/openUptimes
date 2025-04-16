'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [githubSettings, setGithubSettings] = useState({
    schedule: '*/5 * * * *',
    repository: '',
    workflow: 'ping.yml',
    secretName: 'PING_API_KEY',
    enabled: true
  });
  const [newInterval, setNewInterval] = useState<string>("");
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
      
      // Update GitHub action settings
      if (data.githubAction) {
        setGithubSettings(data.githubAction);
      }
      
      setNewInterval(Math.floor(data.refreshInterval / 1000).toString());
      addLog('Site settings loaded successfully');
    } catch (err) {
      addLog(`Error loading settings: ${(err as Error).message}`);
    }
  };

  const generateApiKey = () => {
    // Generate a random string of 32 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedApiKey(key);
    addLog('Generated new API key');
  };

  const saveGithubSettings = async () => {
    try {
      setIsSaving(true);
      addLog(`Saving GitHub Action settings...`);
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubAction: githubSettings
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status} ${response.statusText}`);
      }
      
      const updatedSettings = await response.json();
      setSiteSettings(updatedSettings);
      addLog(`GitHub Action settings saved successfully`);
      
      // Refresh stats
      await fetchPingStats();
    } catch (err) {
      addLog(`Error saving settings: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveRefreshInterval = async () => {
    try {
      setIsSaving(true);
      const intervalMs = parseInt(newInterval) * 1000;
      if (isNaN(intervalMs) || intervalMs < 10000) {
        throw new Error("Interval must be at least 10 seconds");
      }
      
      addLog(`Saving new refresh interval: ${newInterval} seconds...`);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshInterval: intervalMs
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status} ${response.statusText}`);
      }
      
      const updatedSettings = await response.json();
      setSiteSettings(updatedSettings);
      addLog(`Refresh interval saved successfully: ${newInterval} seconds`);
      
      // Restart ping loop to apply new interval
      await triggerPing();
    } catch (err) {
      addLog(`Error saving interval: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
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

  // Format timestamp with consistent format for hydration
  const formatTimeConsistent = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    
    // Use simple string formatting instead of locale-dependent functions
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  // Format timestamp (with date included)
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    
    // Use simple string formatting for consistent server/client rendering
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
    if (cronExpression === '* * * * *') return 'Every minute';
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
      const mins = match ? match[1] : '';
      return `Every ${mins} minute${parseInt(mins) > 1 ? 's' : ''}`;
    }
    
    return cronExpression;
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
    let expectedInterval = 300; // Default 5 minutes
    if (cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = cronSchedule.match(/^\*\/(\d+) \* \* \* \*$/);
      if (match) {
        expectedInterval = parseInt(match[1]) * 60;
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
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ping System Debug</h1>
        <div className="space-x-2">
          <button 
            onClick={() => router.push('/admin')} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
          >
            Admin Dashboard
          </button>
          <button 
            onClick={() => router.push('/')} 
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            Home
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow">
          <h2 className="text-base font-semibold mb-2">System Status</h2>
          
          {isLoading && !pingStats ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={
                  pingStats?.lastPing && (Date.now() - pingStats.lastPing > 90000)
                    ? "text-red-500 font-bold"
                    : pingStats?.lastPing && (Date.now() - pingStats.lastPing > 60000)
                    ? "text-orange-500 font-bold"
                    : "text-green-600 font-bold"
                }>
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
                  <span className="font-medium border-b border-dotted border-gray-300">Last ping:</span>
                </Tooltip>
                <span>{formatTime(pingStats?.lastPing)}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Time elapsed since the last ping check">
                  <span className="font-medium border-b border-dotted border-gray-300">Since last ping:</span>
                </Tooltip>
                {pingStats?.lastPing ? (
                  formatRelativeTimeWithStatus(Math.floor((Date.now() - pingStats.lastPing) / 1000))
                ) : (
                  <span>N/A</span>
                )}
              </div>
              <div className="flex justify-between">
                <Tooltip text="Estimated time for the next GitHub Action run">
                  <span className="font-medium border-b border-dotted border-gray-300">Next run:</span>
                </Tooltip>
                <span>{pingStats?.nextEstimatedRun ? formatTimeConsistent(pingStats.nextEstimatedRun) : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Time remaining until next ping">
                  <span className="font-medium border-b border-dotted border-gray-300">Wait time:</span>
                </Tooltip>
                <span>{timeUntilNextRun()}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="GitHub Action schedule">
                  <span className="font-medium border-b border-dotted border-gray-300">Schedule:</span>
                </Tooltip>
                <span>
                  {pingStats?.githubAction?.schedule ? 
                    formatCronSchedule(pingStats.githubAction.schedule) : 
                    'Not configured'}
                </span>
              </div>
              <div className="flex justify-between pt-1 mt-1 border-t border-gray-100">
                <Tooltip text="Last time this page was refreshed">
                  <span className="font-medium border-b border-dotted border-gray-300">Updated:</span>
                </Tooltip>
                <span>{formatTimeConsistent(lastUpdate.getTime())}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-3 rounded shadow md:col-span-2">
          <h2 className="text-base font-semibold mb-2">Interval Analysis</h2>
          <div className="bg-gray-50 p-2 rounded text-sm">
            {!intervalStats ? (
              <p className="text-gray-500">Not enough data for interval analysis (need at least 2 pings)</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Tooltip text="The expected interval based on GitHub Actions schedule">
                          <span className="font-medium border-b border-dotted border-gray-300">Expected interval:</span>
                        </Tooltip>
                        <span>{intervalStats.expectedInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average time between recorded pings">
                          <span className="font-medium border-b border-dotted border-gray-300">Actual avg interval:</span>
                        </Tooltip>
                        <span className={Math.abs(intervalStats.avgInterval - intervalStats.expectedInterval) > 5 ? 'text-orange-500' : ''}>{intervalStats.avgInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average deviation from expected interval">
                          <span className="font-medium border-b border-dotted border-gray-300">Average drift:</span>
                        </Tooltip>
                        <span className={intervalStats.avgDrift > 5 ? 'text-orange-500' : 'text-green-600'}>±{intervalStats.avgDrift}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Range of observed intervals">
                          <span className="font-medium border-b border-dotted border-gray-300">Min/Max interval:</span>
                        </Tooltip>
                        <span>{intervalStats.minInterval}s / {intervalStats.maxInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Based on sample of recorded ping intervals">
                          <span className="font-medium border-b border-dotted border-gray-300">Sample size:</span>
                        </Tooltip>
                        <span>{intervalStats.sampleSize} intervals</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Tooltip text="How consistently GitHub Actions maintains the schedule">
                      <p className="text-center mb-1 font-medium border-b border-dotted border-gray-300">Timing Consistency</p>
                    </Tooltip>
                    <div className="bg-gray-200 rounded-full h-4 overflow-hidden mb-1">
                      <div 
                        className={`h-full ${
                          intervalStats.consistency > 90 ? 'bg-green-500' : 
                          intervalStats.consistency > 70 ? 'bg-yellow-500' : 
                          'bg-orange-500'
                        }`} 
                        style={{ width: `${intervalStats.consistency}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-center">
                      {intervalStats.consistency}% ({
                        intervalStats.consistency > 90 ? 'Excellent' : 
                        intervalStats.consistency > 70 ? 'Good' : 
                        intervalStats.consistency > 50 ? 'Fair' : 
                        'Poor'
                      })
                    </p>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {intervalStats.consistency < 70 ? 
                        "Inconsistent timing may be due to GitHub Actions scheduler load." : 
                        "Timing is within acceptable range."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow">
          <h2 className="text-base font-semibold mb-2">GitHub Actions Configuration</h2>
          <div className="bg-gray-50 p-3 rounded">
            {/* Configuration Status Banner */}
            <div className={`mb-3 p-2 rounded flex items-center ${siteSettings?.githubAction?.enabled ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className={`h-3 w-3 rounded-full mr-2 ${siteSettings?.githubAction?.enabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className={`text-xs font-medium ${siteSettings?.githubAction?.enabled ? 'text-green-800' : 'text-yellow-800'}`}>
                {siteSettings?.githubAction?.enabled 
                  ? 'GitHub Actions integration is enabled' 
                  : 'GitHub Actions integration is disabled'}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Schedule (Cron Expression)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={githubSettings.schedule}
                    onChange={e => setGithubSettings({...githubSettings, schedule: e.target.value})}
                    className="flex-grow border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder="*/5 * * * *"
                  />
                  <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-xs flex items-center">
                    <span className="text-blue-800 whitespace-nowrap">{formatCronSchedule(githubSettings.schedule)}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">Format: minute hour day month weekday</p>
                  <a href="https://crontab.guru" target="_blank" className="text-xs text-blue-500 hover:underline">Need help?</a>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={githubSettings.repository}
                  onChange={e => setGithubSettings({...githubSettings, repository: e.target.value})}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="username/repo"
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">Your GitHub repository in the format owner/repo</p>
                  {githubSettings.repository && (
                    <a 
                      href={`https://github.com/${githubSettings.repository}`} 
                      target="_blank" 
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View repo →
                    </a>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Workflow Filename
                </label>
                <div className="flex">
                  <div className="bg-gray-200 text-gray-700 text-xs px-2 py-1.5 rounded-l border border-gray-300 border-r-0 flex items-center">
                    .github/workflows/
                  </div>
                  <input
                    type="text"
                    value={githubSettings.workflow}
                    onChange={e => setGithubSettings({...githubSettings, workflow: e.target.value})}
                    className="flex-grow border border-gray-300 rounded-r px-2 py-1.5 text-sm"
                    placeholder="ping.yml"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Name of the workflow file (typically ping.yml)</p>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-1 relative">
                {/* Highlight banner if API key has been generated */}
                {generatedApiKey && (
                  <div className="absolute -top-2 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 bg-green-500 text-white text-xs rounded-full shadow-md animate-pulse">
                      API Key Generated! ↓
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 p-2 rounded mb-3">
                  <h3 className="text-sm font-medium text-blue-800 mb-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    About the API Key
                  </h3>
                  <p className="text-xs text-blue-700">
                    The API key is a security token used to authenticate GitHub Actions with your application.
                    You'll need to:
                  </p>
                  <ol className="text-xs text-blue-700 list-decimal list-inside mt-1 space-y-1">
                    <li>Create a secure random string to use as your key</li>
                    <li>Add it as a repository secret in GitHub (Settings → Secrets → Actions)</li>
                    <li>Enter the name of that secret below (default: PING_API_KEY)</li>
                  </ol>
                  
                  <div className="mt-2 border border-blue-200 rounded bg-white p-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-medium text-blue-800">Setting up a GitHub Secret</p>
                      <button 
                        onClick={generateApiKey}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs py-1 px-2 rounded flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Generate API Key
                      </button>
                    </div>
                    
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex items-start">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-medium text-xs mr-1 mt-0.5 flex-shrink-0">1</span>
                        <div>
                          <p>Go to GitHub repository → Settings → Secrets and variables → Actions</p>
                          {githubSettings.repository && (
                            <a 
                              href={`https://github.com/${githubSettings.repository}/settings/secrets/actions/new`} 
                              target="_blank" 
                              className="text-blue-500 hover:underline text-xs mt-0.5 inline-block"
                            >
                              Go to secrets page →
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-medium text-xs mr-1 flex-shrink-0">2</span>
                        <span>Click "New repository secret"</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-medium text-xs mr-1 flex-shrink-0">3</span>
                        <span>Name: <code className="bg-gray-100 px-1 py-0.5 rounded">{githubSettings.secretName}</code></span>
                      </div>
                      <div className="flex items-start">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 font-medium text-xs mr-1 mt-0.5 flex-shrink-0">4</span>
                        <div className="flex-grow">
                          <span>Value: </span>
                          {generatedApiKey ? (
                            <div className="mt-1 bg-green-50 border border-green-100 rounded p-2">
                              <div className="flex justify-between items-center">
                                <code className="text-xs bg-white px-1 py-0.5 rounded text-green-800 max-w-[200px] truncate">{generatedApiKey}</code>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedApiKey);
                                    addLog('API key copied to clipboard');
                                  }}
                                  className="text-xs text-green-700 hover:text-green-900 ml-1 flex items-center"
                                  title="Copy to clipboard"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  Copy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span>
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">your-secure-api-key</code>
                              <button 
                                onClick={generateApiKey}
                                className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
                              >
                                Generate one now
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  GitHub Secret Name
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={githubSettings.secretName}
                    onChange={e => setGithubSettings({...githubSettings, secretName: e.target.value})}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder="PING_API_KEY"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Name of the GitHub secret you created (usually PING_API_KEY)</p>
              </div>
              
              <div className="flex items-center bg-gray-100 p-2 rounded">
                <input
                  id="enabled"
                  type="checkbox"
                  checked={githubSettings.enabled}
                  onChange={e => setGithubSettings({...githubSettings, enabled: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="enabled" className="ml-2 text-sm">
                  <span className="font-medium text-gray-700">Enable GitHub Actions</span>
                  <p className="text-xs text-gray-500 mt-0.5">Turn this on after setting up the workflow file</p>
                </label>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={saveGithubSettings}
                  disabled={isSaving}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save GitHub Action Settings
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Current Configuration Summary */}
            {siteSettings?.githubAction && (
              <div className="mt-4 border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-medium text-gray-700">Current Configuration</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {siteSettings.lastModified ? new Date(siteSettings.lastModified).toLocaleString() : 'Unknown'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 text-xs">
                  <pre className="overflow-auto max-h-24 text-gray-800">{JSON.stringify(siteSettings.githubAction, null, 2)}</pre>
                </div>
              </div>
            )}
            
            <div className="pt-1 mt-3 text-xs flex justify-between items-center border-t border-gray-200">
              <a href="/docs/github-actions-setup" className="text-blue-500 hover:underline flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View setup guide
              </a>
              
              <button 
                onClick={triggerPing} 
                className="text-green-600 hover:text-green-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Trigger manual ping
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-3 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-semibold">Activity Logs</h2>
            <button 
              onClick={() => setLogs([])} 
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Clear
            </button>
          </div>
          <div className="bg-gray-50 p-2 rounded h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1 break-all">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded shadow mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold">Recent Ping History</h2>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {pingStats?.recentHistory?.length || 0} entries
            </span>
            <button 
              onClick={() => fetchPingStats()} 
              className="text-blue-500 hover:text-blue-700 text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Average Execution</div>
            <div className="text-sm font-semibold">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.round(pingStats.recentHistory.reduce((sum: number, entry: any) => sum + entry.executionTime, 0) / pingStats.recentHistory.length)}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Fastest Ping</div>
            <div className="text-sm font-semibold">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.min(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Slowest Ping</div>
            <div className="text-sm font-semibold">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? `${Math.max(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Services Checked</div>
            <div className="text-sm font-semibold">
              {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
                ? pingStats.recentHistory[0].servicesChecked 
                : 'N/A'}
            </div>
          </div>
        </div>
        
        <div className="overflow-auto max-h-48 bg-gray-50 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium">#</th>
                <th className="text-left py-2 px-3 font-medium">Timestamp</th>
                <th className="text-right py-2 px-3 font-medium">Execution</th>
                <th className="text-right py-2 px-3 font-medium">Services</th>
                <th className="text-center py-2 px-3 font-medium">Source</th>
                <th className="text-right py-2 px-3 font-medium">Run ID</th>
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
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-3">{i + 1}</td>
                    <td className="py-2 px-3">{formatTime(entry.timestamp)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={entry.executionTime > 1000 ? 'text-red-500 font-medium' : 
                                       entry.executionTime > 500 ? 'text-orange-500' : 
                                       'text-green-600'}>
                        {entry.executionTime}ms
                      </span>
                      {executionTrend && (
                        <span className="ml-1 text-gray-500" title={`Changed by ${executionDiff}`}>
                          {executionTrend}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">{entry.servicesChecked}</td>
                    <td className="py-2 px-3 text-center">
                      {entry.source || 'legacy'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {entry.runId || '-'}
                    </td>
                  </tr>
                );
              })}
              {(!pingStats?.recentHistory || pingStats.recentHistory.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-center text-gray-500">No ping history yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <span className="inline-block mr-3">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-1"></span> Fast (&lt;500ms)
          </span>
          <span className="inline-block mr-3">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span> Moderate (500-1000ms)
          </span>
          <span className="inline-block">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span> Slow (&gt;1000ms)
          </span>
        </div>
      </div>
      
      {/* Manual Ping Action Card */}
      <div className="bg-white p-3 rounded shadow mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Manual Actions</h2>
          <div className="text-xs text-gray-500">Testing &amp; Troubleshooting</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className="bg-gradient-to-r from-green-50 to-green-100 rounded p-3 border border-green-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={triggerPing}
          >
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-green-800">Trigger Manual Ping</h3>
                <p className="text-xs text-green-700">Check all services now</p>
              </div>
            </div>
            <p className="text-xs text-green-600">
              This will immediately check all services and update their status without waiting for GitHub Actions. Useful for testing your setup.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded p-3 border border-blue-200">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-blue-800">GitHub Actions Status</h3>
                <p className="text-xs text-blue-700">Workflow: {githubSettings.workflow}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-blue-600">
                View your GitHub Actions workflow runs to troubleshoot scheduling issues.
              </p>
              {githubSettings.repository && (
                <a 
                  href={`https://github.com/${githubSettings.repository}/actions`} 
                  target="_blank" 
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  View Runs →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        OpenUptimes Ping System Debug v3.0 (GitHub Actions)
      </div>
    </div>
  );
} 
