'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<string[]>([]);
  const [pingHistory, setPingHistory] = useState<any[]>([]);
  const [edgePingStatus, setEdgePingStatus] = useState<string>("Unknown");
  const [retries, setRetries] = useState(0);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [newInterval, setNewInterval] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const router = useRouter();

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev]);
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
      
      // Update edge ping status based on the ping stats data
      if (data.lastPing) {
        const secondsSinceLastPing = Math.floor((Date.now() - data.lastPing) / 1000);
        const secondsUntilNextPing = data.nextPing ? Math.floor((data.nextPing - Date.now()) / 1000) : null;
        
        // Determine edge ping status based on timing
        if (secondsSinceLastPing > 90) {
          setEdgePingStatus(`Warning: Last ping was ${secondsSinceLastPing}s ago (system may be stalled)`);
        } else if (secondsUntilNextPing !== null) {
          const statusText = secondsUntilNextPing <= 0 
            ? 'Imminent (< 1s)' 
            : `${secondsUntilNextPing}s`;
          setEdgePingStatus(`Active: Next ping in ${statusText} (Last: ${secondsSinceLastPing}s ago)`);
        } else {
          setEdgePingStatus(`Active: Last ping ${secondsSinceLastPing}s ago`);
        }
      } else {
        setEdgePingStatus('Inactive: No pings recorded yet');
      }
      
      // Process any ping events first (actual service pings)
      if (data.pingEvents && data.pingEvents.length > 0) {
        // Check if we already have these events in our history
        setPingHistory(prevHistory => {
          let updated = false;
          const newHistory = [...prevHistory];
          
          // Add any missing ping events
          for (const event of data.pingEvents) {
            // Skip events we already have
            if (newHistory.some(entry => 
                entry.type === 'Service Ping' && 
                entry.timestamp === event.timestamp)) {
              continue;
            }
            
            // Add the new event
            newHistory.unshift({
              timestamp: event.timestamp,
              source: 'ping',
              type: 'Service Ping',
              lastPing: event.timestamp,
              nextPing: event.timestamp + (event.interval * 1000),
              timeSinceLastPing: Math.floor((Date.now() - event.timestamp) / 1000),
              interval: event.interval,
              cycleId: event.cycleId
            });
            updated = true;
          }
          
          return updated ? newHistory.slice(0, 50) : prevHistory;
        });
      }
      
      // Add this ping stat to history array with a clearer type
      setPingHistory(prev => {
        // Don't add duplicate status checks that are too close together
        if (prev.length > 0 && 
            prev[0].type === 'Status Check' && 
            Date.now() - prev[0].timestamp < 3000) {
          return prev;
        }
        
        // Check if we just detected a new ping since our last check
        const lastRecordedPing = prev.length > 0 && prev[0].lastPing ? prev[0].lastPing : null;
        const isNewPingDetected = data.lastPing && lastRecordedPing && data.lastPing !== lastRecordedPing;
        
        // Calculate interval from the previous ping when a new ping is detected
        const interval = isNewPingDetected 
          ? Math.floor((data.lastPing - lastRecordedPing) / 1000)
          : null;
        
        const newHistory = [
          { 
            timestamp: Date.now(), 
            source: 'stats',
            type: 'Status Check',
            lastPing: data.lastPing, 
            nextPing: data.nextPing,
            nextPingCountdown: data.nextPingCountdown,
            timeSinceLastPing: data.lastPing ? Math.floor((Date.now() - data.lastPing) / 1000) : null,
            interval,
            isNewPingDetected
          }, 
          ...prev
        ];
        
        // Keep only the most recent 50 entries to avoid performance issues
        return newHistory.slice(0, 50);
      });

      // Auto-retry if ping is overdue more than 30 seconds
      if (data.lastPing && (Date.now() - data.lastPing > 90000)) {
        setRetries(prev => {
          if (prev < 3) {
            const newCount = prev + 1;
            addLog(`Ping is overdue by ${Math.floor((Date.now() - data.lastPing)/1000)}s. Auto-retry attempt ${newCount}`);
            setTimeout(() => triggerPing('edge-ping'), 1000);
            return newCount;
          }
          return prev;
        });
      } else {
        setRetries(0);
      }
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
      
      // Refresh ping data to pick up new interval
      setTimeout(fetchPingStats, 1000);
    } catch (err) {
      addLog(`Error saving interval: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerPing = async (endpoint: string) => {
    try {
      addLog(`Triggering ping via ${endpoint}...`);
      
      // Special handling for edge-ping to check its status
      if (endpoint === 'edge-ping') {
        setEdgePingStatus("Triggering ping cycle...");
      }
      
      const pingUrl = new URL(`/api/${endpoint}`, window.location.origin);
      
      // Add debug mode flag if enabled
      if (debugMode && endpoint === 'edge-ping') {
        pingUrl.searchParams.set('debug', 'true');
        addLog(`Debug mode enabled for edge ping`);
      }
      
      const response = await fetch(pingUrl.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to trigger ping: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Ping triggered successfully via ${endpoint}`);
      
      // Add to ping history with source information and more detailed type
      setPingHistory(prev => {
        const newHistory = [
          { 
            timestamp: Date.now(),
            source: endpoint,
            type: endpoint === 'edge-ping' ? 'Edge Cycle Start' : 
                  endpoint === 'ping' ? 'Manual Ping' : 'Status Check',
            lastPing: data.timestamp || Date.now(),
            nextPing: data.nextPing,
            nextPingCountdown: data.nextPingIn ? Math.floor(data.nextPingIn / 1000) : null,
            timeSinceLastPing: 0, // Just triggered
            interval: data.refreshInterval ? Math.floor(data.refreshInterval / 1000) : null,
            cycleId: data.cycleId || null
          }, 
          ...prev
        ];
        return newHistory;
      });
      
      if (endpoint === 'edge-ping') {
        if (data.actualInterval) {
          addLog(`Edge ping configured with interval: ${data.actualInterval/1000}s, next ping in: ${data.nextPingIn/1000}s`);
        }
        
        const nextPingTime = new Date(Date.now() + data.nextPingIn);
        const hours = nextPingTime.getHours().toString().padStart(2, '0');
        const minutes = nextPingTime.getMinutes().toString().padStart(2, '0');
        const seconds = nextPingTime.getSeconds().toString().padStart(2, '0');
        const formattedNextPingTime = `${hours}:${minutes}:${seconds}`;
        
        setEdgePingStatus(`Active: Next ping in ${Math.round(data.nextPingIn/1000)}s (${formattedNextPingTime})`);
        
        // Schedule a status update, but don't set to "Checking status..." anymore
        setTimeout(() => {
          fetchPingStats(); // This will update the status automatically
        }, Math.min(data.nextPingIn + 2000, 10000));
      }
      
      // Refresh ping stats after a short delay
      setTimeout(fetchPingStats, 1000);
    } catch (err) {
      addLog(`Error triggering ping: ${(err as Error).message}`);
      if (endpoint === 'edge-ping') {
        setEdgePingStatus(`Error: ${(err as Error).message}`);
      }
    }
  };

  const testEdgePingConnection = async () => {
    try {
      addLog("Testing edge ping cycle connection...");
      const testUrl = new URL(window.location.origin + '/api/edge-ping');
      testUrl.searchParams.set('test', 'true');
      
      // Add debug mode for more verbose output if enabled
      if (debugMode) {
        testUrl.searchParams.set('debug', 'true');
        addLog("Debug mode enabled for test");
      }
      
      const response = await fetch(testUrl.toString());
      const data = await response.json();
      
      addLog(`Edge function connection test: ${response.ok ? 'SUCCESS' : 'FAILED'}`);
      addLog(`Response: ${JSON.stringify(data)}`);
    } catch (err) {
      addLog(`Edge connection test error: ${(err as Error).message}`);
    }
  };

  // Add cancel ping cycles function
  const cancelPingCycles = async () => {
    try {
      addLog("Cancelling all ping cycles...");
      const cancelUrl = new URL(window.location.origin + '/api/ping-scheduler');
      cancelUrl.searchParams.set('action', 'cancel');
      
      const response = await fetch(cancelUrl.toString());
      const data = await response.json();
      
      addLog(`Cancellation response: ${JSON.stringify(data)}`);
      
      // Refresh stats after cancellation
      setTimeout(fetchPingStats, 1000);
    } catch (err) {
      addLog(`Cancellation error: ${(err as Error).message}`);
    }
  };

  // Add hard reset function to reset all components
  const hardReset = async () => {
    try {
      setIsLoading(true);
      addLog('Performing hard reset of ping system...');
      
      // First try to clear any history data
      setPingHistory([]);
      
      // Cancel any existing ping cycles
      await cancelPingCycles();
      
      // Wait briefly for cancellation to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Next, trigger a direct ping to establish new timing
      addLog('Triggering direct ping...');
      await triggerPing('ping');
      
      // Wait briefly for ping to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then restart the edge ping cycle with debug mode if enabled
      addLog('Starting fresh edge ping cycle...');
      await triggerPing('edge-ping');
      
      // Reset local state
      setRetries(0);
      
      addLog('Hard reset completed. System should resume normal operation.');
      
      // Refresh stats after a short delay
      setTimeout(fetchPingStats, 2000);
    } catch (err) {
      addLog(`Error during hard reset: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPingStats();
    fetchSiteSettings();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(fetchPingStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Format timestamp with consistent format for hydration
  const formatTimeConsistent = (timestamp: number | Date | null) => {
    if (!timestamp) return 'Never';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
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
    if (!pingStats?.nextPing) return 'N/A';
    const seconds = Math.floor((pingStats.nextPing - Date.now()) / 1000);
    return seconds > 0 ? `${seconds} seconds` : 'Imminent';
  };

  // Format duration 
  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    return `${seconds}s`;
  };

  // Format relative time with color coding
  const formatRelativeTimeWithStatus = (seconds: number) => {
    const statusClass = seconds > 90 ? 'text-red-600 font-bold' : seconds > 60 ? 'text-orange-500' : 'text-green-600';
    return <span className={statusClass}>{seconds} seconds ago</span>;
  };

  // Calculate interval timing statistics
  const calculateIntervalStats = () => {
    if (pingHistory.length < 3) return null;
    
    const intervals = [];
    let totalDrift = 0;
    const configInterval = siteSettings ? Math.floor(siteSettings.refreshInterval / 1000) : 60;
    
    // Calculate intervals between consecutive pings
    for (let i = 0; i < pingHistory.length - 1; i++) {
      const curr = pingHistory[i];
      const prev = pingHistory[i + 1];
      if (curr.lastPing && prev.lastPing) {
        const interval = Math.floor((curr.lastPing - prev.lastPing) / 1000);
        intervals.push(interval);
        totalDrift += Math.abs(interval - configInterval);
      }
    }
    
    if (intervals.length === 0) return null;
    
    // Calculate statistics
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgDrift = totalDrift / intervals.length;
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    const consistency = 100 - (avgDrift / configInterval * 100);
    
    return {
      avgInterval: Math.round(avgInterval),
      avgDrift: Math.round(avgDrift),
      maxInterval,
      minInterval,
      consistency: Math.max(0, Math.min(100, Math.round(consistency))),
      configInterval,
      sampleSize: intervals.length
    };
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

  // Get interval stats for display
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
                <span>{pingStats?.nextPing ? formatTimeConsistent(new Date(pingStats.nextPing)) : 'Unknown'}</span>
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
                <span>{formatTimeConsistent(lastUpdate)}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-3 rounded shadow md:col-span-2">
          <h2 className="text-base font-semibold mb-2">System Health</h2>
          
          <div className="bg-gray-50 p-2 rounded text-sm">
            {(() => {
              // No ping data yet
              if (!pingStats?.lastPing) {
                return (
                  <div className="flex items-start gap-2">
                    <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs font-medium">NO DATA</span>
                    <div>
                      <p className="text-sm">No ping data recorded. Try triggering a ping.</p>
                    </div>
                  </div>
                );
              }
              
              // Calculate time metrics
              const secondsSinceLastPing = Math.floor((Date.now() - pingStats.lastPing) / 1000);
              const refreshInterval = siteSettings ? Math.floor(siteSettings.refreshInterval / 1000) : 60;
              
              // Critical delay
              if (secondsSinceLastPing > refreshInterval * 1.5) {
                return (
                  <div className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-medium">CRITICAL</span>
                    <div>
                      <p>Ping overdue by {secondsSinceLastPing - refreshInterval}s</p>
                      <p className="text-xs text-gray-600 mt-1">Try "Hard Reset" to restart the system</p>
                    </div>
                  </div>
                );
              }
              
              // Warning delay
              if (secondsSinceLastPing > refreshInterval * 1.2) {
                return (
                  <div className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs font-medium">WARNING</span>
                    <div>
                      <p>Ping delayed by {secondsSinceLastPing - refreshInterval}s</p>
                      <p className="text-xs text-gray-600 mt-1">Monitor for a few more cycles</p>
                    </div>
                  </div>
                );
              }
              
              // Healthy
              return (
                <div className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">HEALTHY</span>
                  <div>
                    <p>System is operating normally</p>
                    <p className="text-xs text-gray-600 mt-1">Last ping: {secondsSinceLastPing}s ago | Next: {pingStats.nextPing ? Math.max(0, Math.floor((pingStats.nextPing - Date.now()) / 1000)) : 'Unknown'}s</p>
                  </div>
                </div>
              );
            })()}
            
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div className={`p-1.5 rounded ${edgePingStatus.includes("Error") ? "bg-red-50" : edgePingStatus.includes("Active") ? "bg-green-50" : "bg-gray-50"}`}>
                <Tooltip text="Edge function that maintains the ping cycle">
                  <p className="font-medium border-b border-dotted border-gray-300">Edge Function</p>
                </Tooltip>
                <p className={`text-xs ${edgePingStatus.includes("Error") ? "text-red-600" : edgePingStatus.includes("Active") ? "text-green-600" : "text-gray-500"}`}>
                  {edgePingStatus.includes("Error") ? "Error" : 
                   edgePingStatus.includes("Active") ? "Running" : "Unknown"}
                </p>
              </div>
              <div className={`p-1.5 rounded ${!pingStats?.lastPing ? "bg-gray-50" : (Date.now() - pingStats.lastPing > 90000) ? "bg-red-50" : "bg-green-50"}`}>
                <Tooltip text="Service check process that pings monitored endpoints">
                  <p className="font-medium border-b border-dotted border-gray-300">Ping Process</p>
                </Tooltip>
                <p className={`text-xs ${!pingStats?.lastPing ? "text-gray-500" : (Date.now() - pingStats.lastPing > 90000) ? "text-red-600" : "text-green-600"}`}>
                  {!pingStats?.lastPing ? "No data" : 
                   (Date.now() - pingStats.lastPing > 90000) ? "Stalled" : "Active"}
                </p>
              </div>
              <div className={`p-1.5 rounded ${retries > 0 ? "bg-orange-50" : !pingStats?.lastPing ? "bg-gray-50" : "bg-green-50"}`}>
                <Tooltip text="Auto-recovery mechanism that attempts to restart stalled pings">
                  <p className="font-medium border-b border-dotted border-gray-300">Recovery</p>
                </Tooltip>
                <p className={`text-xs ${retries > 0 ? "text-orange-600" : !pingStats?.lastPing ? "text-gray-500" : "text-green-600"}`}>
                  {retries > 0 ? `${retries} retries` : !pingStats?.lastPing ? "Inactive" : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded shadow mb-4">
        <h2 className="text-base font-semibold mb-2">Interval Analysis</h2>
        <div className="bg-gray-50 p-2 rounded text-sm">
          {!intervalStats ? (
            <p className="text-gray-500">Not enough data for interval analysis (need at least 3 pings)</p>
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
                      <span className={Math.abs(intervalStats.avgInterval - intervalStats.configInterval) > 10 ? 'text-orange-500' : ''}>{intervalStats.avgInterval}s</span>
                    </div>
                    <div className="flex justify-between">
                      <Tooltip text="Average deviation from the configured interval">
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
                      "Inconsistent timing may be caused by edge function cold starts, network delays, or server load." : 
                      "Timing is within acceptable range."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow">
          <h2 className="text-base font-semibold mb-3">Ping Actions</h2>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <h3 className="text-sm font-medium mb-2">Monitor Functions</h3>
              <div className="flex flex-col space-y-2">
                <div>
                  <button 
                    onClick={() => fetchPingStats()} 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm"
                    disabled={isLoading}
                  >
                    Refresh Status
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Updates status display without triggering checks</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => testEdgePingConnection()} 
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Test Connection
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Verify edge function connectivity</p>
                </div>
                
                <div>
                  <button 
                    onClick={cancelPingCycles} 
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Cancel Ping Cycles
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Terminate all current ping cycles</p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Debug Mode:</span>
                  <button
                    onClick={() => {
                      setDebugMode(!debugMode);
                      addLog(`Debug mode ${debugMode ? 'disabled' : 'enabled'}`);
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      debugMode 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {debugMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <h3 className="text-sm font-medium mb-2">Ping Controls</h3>
              <div className="flex flex-col space-y-2">
                <div>
                  <button 
                    onClick={() => triggerPing('edge-ping')} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Start Ongoing Ping Cycle
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Begins self-sustaining ping scheduler via edge function</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => triggerPing('ping')} 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded text-sm"
                  >
                    Run One-Time Ping
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Execute a single ping check immediately</p>
                </div>
                
                <div>
                  <button 
                    onClick={hardReset} 
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm"
                    disabled={isLoading}
                  >
                    Hard Reset System
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Completely restart ping monitoring system</p>
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
            <h2 className="text-base font-semibold">Debug Logs</h2>
            <button 
              onClick={() => setLogs([])} 
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Clear
            </button>
          </div>
          <div className="bg-gray-50 p-2 rounded h-32 overflow-y-auto font-mono text-xs">
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
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold">Ping History</h2>
          <button 
            onClick={() => setPingHistory([])} 
            className="text-red-500 hover:text-red-700 text-xs"
          >
            Clear
          </button>
        </div>
        
        <div className="bg-gray-50 p-2 rounded mb-2 text-xs text-gray-600">
          <h3 className="font-medium mb-1">Understanding Ping History</h3>
          <p>This table shows the timeline of ping-related events in the system:</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li><span className="font-medium text-green-600">Manual Ping</span>: Direct ping triggered by clicking "Run One-Time Ping"</li>
            <li><span className="font-medium text-blue-600">Edge Cycle Start</span>: Beginning of an automated ping cycle</li>
            <li><span className="font-medium text-purple-600">Service Ping</span>: Actual ping of services detected (shows real interval)</li>
            <li><span className="font-medium text-gray-600">Status Check</span>: Refreshing this UI without triggering pings</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 p-2 rounded h-48 overflow-y-auto text-xs">
          {pingHistory.length === 0 ? (
            <p className="text-gray-500">No history yet</p>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-300">
                <tr>
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Time</th>
                  <th className="text-left py-1">Event Type</th>
                  <th className="text-left py-1">Last Ping Time</th>
                  <th className="text-left py-1 text-center">
                    <span className="border-b border-dotted border-gray-400" title="Time between consecutive pings">Interval</span>
                  </th>
                  <th className="text-left py-1 text-center">
                    <span className="border-b border-dotted border-gray-400" title="Time since the last ping occurred">Age</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pingHistory.map((entry, i) => {
                  // Determine the event type style
                  const typeStyle = 
                    entry.type === 'Manual Ping' ? 'text-green-600 font-medium' :
                    entry.type === 'Edge Cycle Start' ? 'text-blue-600 font-medium' :
                    entry.type === 'Service Ping' ? 'text-purple-600 font-medium' :
                    'text-gray-600';
                  
                  // Determine if this was an actual ping or just a UI refresh
                  const isActualPing = entry.type !== 'Status Check';
                  
                  // Determine if there was a new ping since the last check (for status checks)
                  const isNewPing = i < pingHistory.length - 1 && 
                                    entry.lastPing && 
                                    pingHistory[i+1].lastPing && 
                                    entry.lastPing !== pingHistory[i+1].lastPing;
                
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-1">{pingHistory.length - i}</td>
                      <td className="py-1">
                        {(() => {
                          const date = new Date(entry.timestamp);
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          const seconds = date.getSeconds().toString().padStart(2, '0');
                          return `${hours}:${minutes}:${seconds}`;
                        })()}
                      </td>
                      <td className={`py-1 ${typeStyle}`}>
                        {entry.type}
                        {isNewPing && entry.type === 'Status Check' && (
                          <span className="ml-1 text-purple-600 text-xs">*</span>
                        )}
                      </td>
                      <td className="py-1">
                        {entry.lastPing 
                          ? (() => {
                              const date = new Date(entry.lastPing);
                              const hours = date.getHours().toString().padStart(2, '0');
                              const minutes = date.getMinutes().toString().padStart(2, '0');
                              const seconds = date.getSeconds().toString().padStart(2, '0');
                              return `${hours}:${minutes}:${seconds}`;
                            })()
                          : 'Never'}
                      </td>
                      <td className={`py-1 text-center ${entry.interval && entry.interval > 5 ? 'font-medium' : ''}`}>
                        {entry.interval !== null 
                          ? `${entry.interval}s` 
                          : isActualPing 
                            ? '-' 
                            : 'N/A'}
                      </td>
                      <td className={`py-1 text-center ${
                        entry.timeSinceLastPing > 90 
                          ? 'text-red-500 font-medium' 
                          : entry.timeSinceLastPing > 60 
                            ? 'text-orange-500' 
                            : ''
                      }`}>
                        {entry.timeSinceLastPing !== null 
                          ? `${entry.timeSinceLastPing}s` 
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {pingHistory.length > 0 && pingHistory.some(entry => entry.type === 'Status Check' && entry.interval) && (
          <div className="mt-1 text-xs text-gray-500">
            * Purple dots indicate a new ping was detected during a status check
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        For development and debugging purposes only
      </div>
    </div>
  );
} 