'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<string[]>([]);
  const [pingHistory, setPingHistory] = useState<any[]>([]);
  const router = useRouter();

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev.slice(0, 19)]);
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
      
      // Add this ping stat to history array for debugging
      setPingHistory(prev => {
        const newHistory = [
          { 
            timestamp: Date.now(), 
            lastPing: data.lastPing, 
            nextPing: data.nextPing,
            nextPingCountdown: data.nextPingCountdown
          }, 
          ...prev
        ];
        // Keep only last 20 entries
        return newHistory.slice(0, 20);
      });
    } catch (err) {
      setError((err as Error).message);
      addLog(`Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPing = async (endpoint: string) => {
    try {
      addLog(`Triggering ping via ${endpoint}...`);
      const response = await fetch(`/api/${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Failed to trigger ping: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Ping triggered successfully via ${endpoint}`);
      addLog(`Response: ${JSON.stringify(data)}`);
      
      // Refresh ping stats after a short delay
      setTimeout(fetchPingStats, 1000);
    } catch (err) {
      addLog(`Error triggering ping: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    fetchPingStats();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(fetchPingStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Format timestamp
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ping System Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Ping System Status</h2>
          
          {isLoading && !pingStats ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Last updated:</span>
                <span>{lastUpdate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Last ping:</span>
                <span>{formatTime(pingStats?.lastPing)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time since last ping:</span>
                <span>{timeSinceLastPing()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Next ping:</span>
                <span>{formatTime(pingStats?.nextPing)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time until next ping:</span>
                <span>{timeUntilNextPing()}</span>
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="font-medium">System timestamp:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="space-y-4">
            <div>
              <button 
                onClick={() => fetchPingStats()} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-1"
                disabled={isLoading}
              >
                Refresh Stats
              </button>
              <p className="text-xs text-gray-500">Fetch the latest ping statistics without triggering a new ping</p>
            </div>
            
            <div>
              <button 
                onClick={() => triggerPing('edge-ping')} 
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded mb-1"
              >
                Trigger Edge Ping
              </button>
              <p className="text-xs text-gray-500">Start the self-sustaining ping cycle through the edge function - this is the main ping bootstrap mechanism</p>
            </div>
            
            <div>
              <button 
                onClick={() => triggerPing('ping-scheduler')} 
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded mb-1"
              >
                Trigger Ping Scheduler
              </button>
              <p className="text-xs text-gray-500">Directly call the ping scheduler which manages Redis locks and triggers the actual ping</p>
            </div>
            
            <div>
              <button 
                onClick={() => triggerPing('ping')} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded mb-1"
              >
                Trigger Direct Ping
              </button>
              <p className="text-xs text-gray-500">Directly call the ping endpoint that checks all services - bypasses scheduler and edge function</p>
            </div>
            
            <div>
              <button 
                onClick={() => router.push('/')} 
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded mb-1"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Ping History (Last 20 Entries)</h2>
          <div className="bg-gray-100 p-3 rounded h-60 overflow-y-auto text-xs">
            {pingHistory.length === 0 ? (
              <p className="text-gray-500">No history yet</p>
            ) : (
              <table className="w-full">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left font-medium py-1">#</th>
                    <th className="text-left font-medium py-1">Timestamp</th>
                    <th className="text-left font-medium py-1">Last Ping</th>
                    <th className="text-left font-medium py-1">Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {pingHistory.map((entry, i) => {
                    // Calculate intervals between pings when possible
                    const prevEntry = pingHistory[i + 1];
                    const interval = prevEntry && entry.lastPing && prevEntry.lastPing 
                      ? formatDuration(prevEntry.lastPing, entry.lastPing)
                      : 'N/A';
                      
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-1">{pingHistory.length - i}</td>
                        <td className="py-1">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                        <td className="py-1">
                          {entry.lastPing 
                            ? new Date(entry.lastPing).toLocaleTimeString() 
                            : 'Never'}
                        </td>
                        <td className="py-1">{interval}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 flex justify-between">
            <span>This table shows each time the page fetched stats and when each ping occurred</span>
            <button 
              onClick={() => setPingHistory([])} 
              className="text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Debug Logs</h2>
          <div className="bg-gray-100 p-3 rounded h-60 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1 break-all">{log}</div>
              ))
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 flex justify-between">
            <span>Action logs with timestamps</span>
            <button 
              onClick={() => setLogs([])} 
              className="text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Ping System Architecture</h2>
        <div className="text-sm space-y-2">
          <p><strong>1. Edge Function (edge-ping):</strong> Long-running Edge Runtime function that bootstraps the ping cycle and schedules the next ping</p>
          <p><strong>2. Ping Scheduler (ping-scheduler):</strong> Manages Redis locks to prevent duplicate pings and calls the ping endpoint</p>
          <p><strong>3. Ping Endpoint (ping):</strong> Performs the actual service checks and stores results in Redis</p>
          <p><strong>4. Stats Endpoint (ping-stats):</strong> Provides information about the ping system timing</p>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Note: This page is intended for development and debugging purposes only.</p>
      </div>
    </div>
  );
} 