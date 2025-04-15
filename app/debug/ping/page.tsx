'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PingDebugPage() {
  const [pingStats, setPingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<string[]>([]);
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="space-y-2">
            <button 
              onClick={() => fetchPingStats()} 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              disabled={isLoading}
            >
              Refresh Stats
            </button>
            <button 
              onClick={() => triggerPing('edge-ping')} 
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
            >
              Trigger Edge Ping
            </button>
            <button 
              onClick={() => triggerPing('ping-scheduler')} 
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
            >
              Trigger Ping Scheduler
            </button>
            <button 
              onClick={() => triggerPing('ping')} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
            >
              Trigger Direct Ping
            </button>
            <button 
              onClick={() => router.push('/')} 
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Debug Logs</h2>
        <div className="bg-gray-100 p-3 rounded h-60 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Note: This page is intended for development and debugging purposes only.</p>
      </div>
    </div>
  );
} 