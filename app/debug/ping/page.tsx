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
  const [newInterval, setNewInterval] = useState<string>("");
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
      setNewInterval(Math.floor(data.refreshInterval / 1000).toString());
      addLog('Site settings loaded successfully');
    } catch (err) {
      addLog(`Error loading settings: ${(err as Error).message}`);
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
      await triggerPing('restart');
    } catch (err) {
      addLog(`Error saving interval: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerPing = async (action: string = '') => {
    try {
      const actionParam = action ? `?action=${action}` : '';
      addLog(`Triggering ping with action: ${action || 'none'}...`);
      
      const response = await fetch(`/api/ping${actionParam}`);
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
  const timeUntilNextPing = () => {
    if (!pingStats?.nextPingIn) return 'N/A';
    return pingStats.nextPingIn > 0 ? `${Math.floor(pingStats.nextPingIn / 1000)} seconds` : 'Imminent';
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

  // Calculate interval stats
  const calculateIntervalStats = () => {
    if (!pingStats?.recentHistory || pingStats.recentHistory.length < 2) {
      return null;
    }
    
    const history = pingStats.recentHistory;
    const intervals = [];
    const configInterval = siteSettings ? Math.floor(siteSettings.refreshInterval / 1000) : 60;
    
    for (let i = 0; i < history.length - 1; i++) {
      const interval = Math.round((history[i].timestamp - history[i+1].timestamp) / 1000);
      intervals.push(interval);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    const avgDrift = intervals.map(i => Math.abs(i - configInterval)).reduce((a, b) => a + b, 0) / intervals.length;
    const consistency = 100 - (avgDrift / configInterval * 100);
    
    return {
      avgInterval: Math.round(avgInterval),
      minInterval,
      maxInterval,
      avgDrift: Math.round(avgDrift),
      consistency: Math.round(Math.max(0, Math.min(100, consistency))),
      sampleSize: intervals.length,
      configInterval
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
                <Tooltip text="Scheduled time for the next ping check">
                  <span className="font-medium border-b border-dotted border-gray-300">Next ping:</span>
                </Tooltip>
                <span>{pingStats?.nextPing ? formatTimeConsistent(pingStats.nextPing) : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Time remaining until next ping">
                  <span className="font-medium border-b border-dotted border-gray-300">Wait time:</span>
                </Tooltip>
                <span>{timeUntilNextPing()}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip text="Configured time between ping checks">
                  <span className="font-medium border-b border-dotted border-gray-300">Interval:</span>
                </Tooltip>
                <span className={`${siteSettings && siteSettings.refreshInterval <= 10000 ? 'text-orange-500 font-medium' : ''}`}>
                  {siteSettings ? `${Math.floor(siteSettings.refreshInterval/1000)}s` : 'Loading...'}
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
                        <Tooltip text="The configured interval between ping checks">
                          <span className="font-medium border-b border-dotted border-gray-300">Configured interval:</span>
                        </Tooltip>
                        <span>{intervalStats.configInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average time between recorded pings">
                          <span className="font-medium border-b border-dotted border-gray-300">Actual avg interval:</span>
                        </Tooltip>
                        <span className={Math.abs(intervalStats.avgInterval - intervalStats.configInterval) > 5 ? 'text-orange-500' : ''}>{intervalStats.avgInterval}s</span>
                      </div>
                      <div className="flex justify-between">
                        <Tooltip text="Average deviation from configured interval">
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
                    <Tooltip text="How consistently the system maintains the configured interval">
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
                        "Inconsistent timing may be caused by cold starts or server load." : 
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
          <h2 className="text-base font-semibold mb-2">Ping Controls</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex flex-col space-y-2">
                <div>
                  <button 
                    onClick={() => triggerPing('start')} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Start Ping Loop
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Begin continuous ping monitoring</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => triggerPing()} 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Trigger One Ping
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Execute a single ping check without starting the loop</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => triggerPing('stop')} 
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Stop Ping Loop
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Halt continuous ping monitoring</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => fetchPingStats()} 
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Refresh Status
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Update the display without triggering a ping</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <h3 className="text-sm font-medium mb-2">Configuration</h3>
              <div className="flex items-end space-x-2">
                <div className="flex-grow">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ping Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={newInterval}
                    onChange={e => setNewInterval(e.target.value)}
                    min="10"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder="60"
                  />
                </div>
                <button
                  onClick={saveRefreshInterval}
                  disabled={isSaving}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm h-9"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">How often to check services (min 10 seconds)</p>
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
          <div className="bg-gray-50 p-2 rounded h-100 overflow-y-auto font-mono text-xs">
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
                <th className="text-center py-2 px-3 font-medium">Interval</th>
                <th className="text-right py-2 px-3 font-medium">Scheduled Next</th>
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
                      {Math.floor(entry.refreshInterval / 1000)}s
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatTimeConsistent(entry.nextScheduled)}
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
      
      <div className="text-xs text-gray-500 text-center">
        OpenUptimes Ping System Debug v2.0
      </div>
    </div>
  );
} 