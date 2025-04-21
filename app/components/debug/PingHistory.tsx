import { useState, useEffect } from 'react';
import { formatTime, formatTimeConsistent } from '../../lib/utils/timeUtils';
import Tooltip from './Tooltip';

type PingHistoryProps = {
  pingStats: any;
  onRefresh: () => void;
  onReset?: () => void;
}

export default function PingHistory({ pingStats, onRefresh, onReset }: PingHistoryProps) {
  const [visibleHistoryCount, setVisibleHistoryCount] = useState<number>(10);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [currentTTL, setCurrentTTL] = useState<number>(24 * 60 * 60); // Default 24 hours
  const [isLoadingTTL, setIsLoadingTTL] = useState<boolean>(true);
  const [isUpdatingTTL, setIsUpdatingTTL] = useState<boolean>(false);

  // Function to show more history entries
  const showMoreHistory = () => {
    // Increase by 10 or show all remaining
    const remaining = (pingStats?.recentHistory?.length || 0) - visibleHistoryCount;
    const increment = Math.min(remaining, 10);
    setVisibleHistoryCount(visibleHistoryCount + increment);
  };

  // Function to clear all ping history
  const clearPingHistory = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch('/api/ping-history', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear ping history');
      }
      
      // Refresh data after deletion
      onRefresh();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error clearing ping history:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to update TTL
  const updateTTL = async (ttlValue: number) => {
    try {
      setIsUpdatingTTL(true);
      const response = await fetch('/api/ping-history/ttl', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: ttlValue }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update TTL');
      }
      
      setCurrentTTL(ttlValue);
    } catch (error) {
      console.error('Error updating TTL:', error);
    } finally {
      setIsUpdatingTTL(false);
    }
  };

  // Fetch current TTL on component mount
  useEffect(() => {
    const fetchTTL = async () => {
      try {
        setIsLoadingTTL(true);
        const response = await fetch('/api/ping-history/ttl');
        
        if (!response.ok) {
          throw new Error('Failed to fetch TTL');
        }
        
        const data = await response.json();
        setCurrentTTL(data.ttl);
      } catch (error) {
        console.error('Error fetching TTL:', error);
      } finally {
        setIsLoadingTTL(false);
      }
    };
    
    fetchTTL();
  }, []);

  // TTL options in seconds
  const ttlOptions = [
    { value: 60 * 60, label: '1 hour' },
    { value: 6 * 60 * 60, label: '6 hours' },
    { value: 12 * 60 * 60, label: '12 hours' },
    { value: 24 * 60 * 60, label: '24 hours' },
    { value: 3 * 24 * 60 * 60, label: '3 days' },
    { value: 7 * 24 * 60 * 60, label: '7 days' },
    { value: 30 * 24 * 60 * 60, label: '30 days' },
    { value: 90 * 24 * 60 * 60, label: '90 days' },
    { value: 0, label: 'Unlimited' },
  ];

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-foreground flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Recent Ping History
        </h2>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-muted-foreground">
            {pingStats?.recentHistory?.length || 0} entries
          </span>
          <button 
            onClick={onRefresh} 
            className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-800 dark:hover:text-blue-400 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Management Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-accent/50 p-2 rounded-md mb-4 gap-3 border border-border/60">
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap">History TTL:</span>
          <select 
            value={currentTTL}
            onChange={(e) => updateTTL(Number(e.target.value))}
            disabled={isUpdatingTTL || isLoadingTTL}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            {ttlOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isUpdatingTTL && <span className="ml-2 text-xs text-muted-foreground">Updating...</span>}
        </div>

        <div className="flex items-center">
          {!showDeleteConfirm ? (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 px-2 py-1 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear History
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-red-600 dark:text-red-400">Confirm clear?</span>
              <button 
                onClick={clearPingHistory} 
                disabled={isDeleting}
                className="text-xs bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 px-2 py-1 rounded"
              >
                {isDeleting ? 'Clearing...' : 'Yes, Clear All'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warning for unlimited TTL */}
      {currentTTL === 0 && (
        <div className="bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-400 p-2 rounded-md mb-4 text-xs flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            <strong>Warning:</strong> Unlimited TTL means history entries will never expire. This can lead to increased Redis memory usage over time.
            Consider setting a reasonable TTL if you're storing large amounts of ping history data.
          </span>
        </div>
      )}
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-accent rounded-md p-3 border border-border text-center">
          <div className="text-xs text-muted-foreground mb-1">Average Execution</div>
          <div className="text-sm font-medium">
            {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
              ? `${Math.round(pingStats.recentHistory.reduce((sum: number, entry: any) => sum + entry.executionTime, 0) / pingStats.recentHistory.length)}ms` 
              : 'N/A'}
          </div>
        </div>
        
        <div className="bg-accent rounded-md p-3 border border-border text-center">
          <div className="text-xs text-muted-foreground mb-1">Fastest Ping</div>
          <div className="text-sm font-medium text-green-600 dark:text-green-400">
            {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
              ? `${Math.min(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
              : 'N/A'}
          </div>
        </div>
        
        <div className="bg-accent rounded-md p-3 border border-border text-center">
          <div className="text-xs text-muted-foreground mb-1">Slowest Ping</div>
          <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
              ? `${Math.max(...pingStats.recentHistory.map((entry: any) => entry.executionTime))}ms` 
              : 'N/A'}
          </div>
        </div>
        
        <div className="bg-accent rounded-md p-3 border border-border text-center">
          <div className="text-xs text-muted-foreground mb-1">Services Checked</div>
          <div className="text-sm font-medium">
            {pingStats?.recentHistory && pingStats.recentHistory.length > 0 
              ? pingStats.recentHistory[0].servicesChecked 
              : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Execution Time Legend */}
      <div className="mt-3 text-xs text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          <div>
            <span className="font-medium text-foreground">Execution Time:</span>
            <div className="flex flex-wrap mt-1">
              <span className="inline-flex items-center mr-4 mb-1">
                <span className="inline-block w-2 h-2 bg-green-600 dark:bg-green-500 rounded-full mr-1"></span> Fast (&lt;500ms)
              </span>
              <span className="inline-flex items-center mr-4 mb-1">
                <span className="inline-block w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full mr-1"></span> Moderate (500-1000ms)
              </span>
              <span className="inline-flex items-center mr-4 mb-1">
                <span className="inline-block w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full mr-1"></span> Slow (&gt;1000ms)
              </span>
              <span className="inline-flex items-center mb-1">
                <span className="text-muted-foreground mr-1">↑↓</span> Change from previous ping
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium text-foreground">Source Types:</span>
            <div className="flex flex-wrap mt-1">
              <span className="inline-flex items-center mr-3 mb-1">
                <span className="inline-block px-1 py-0 text-xs bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 rounded mr-1">GitHub</span> 
                GitHub Actions workflow
              </span>
              <span className="inline-flex items-center mr-3 mb-1">
                <span className="inline-block px-1 py-0 text-xs bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 rounded mr-1">Cron</span> 
                Scheduled cron job
              </span>
              <span className="inline-flex items-center mb-1">
                <span className="inline-block px-1 py-0 text-xs bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400 rounded mr-1">Manual</span> 
                User-triggered ping
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* History Table */}
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-accent sticky top-0">
            <tr>
              <th className="text-left py-2.5 px-3 font-medium text-foreground border-b border-border">#</th>
              <th className="text-left py-2.5 px-3 font-medium text-foreground border-b border-border">Timestamp</th>
              <th className="text-right py-2.5 px-3 font-medium text-foreground border-b border-border">Execution</th>
              <th className="text-right py-2.5 px-3 font-medium text-foreground border-b border-border">Services</th>
              <th className="text-center py-2.5 px-3 font-medium text-foreground border-b border-border">Source</th>
              <th className="text-right py-2.5 px-3 font-medium text-foreground border-b border-border">Interval</th>
              <th className="text-right py-2.5 px-3 font-medium text-foreground border-b border-border">Run ID</th>
            </tr>
          </thead>
          <tbody>
            {pingStats?.recentHistory?.slice(0, visibleHistoryCount).map((entry: any, i: number) => {
              // Calculate trend indicators for execution time
              const prevEntry = i < pingStats.recentHistory.length - 1 ? pingStats.recentHistory[i+1] : null;
              const executionTrend = prevEntry ? 
                entry.executionTime > prevEntry.executionTime ? '↑' : 
                entry.executionTime < prevEntry.executionTime ? '↓' : '→' 
                : '';
              
              const executionDiff = prevEntry ? 
                `${Math.abs(entry.executionTime - prevEntry.executionTime)}ms` : '';
              
              // Calculate interval since last ping of the same source type
              let intervalDisplay = '-';
              if (entry.source && entry.source !== 'internal' && entry.source !== 'manual') {
                // Find the previous entry with the same source
                const prevSameSourceIndex = pingStats.recentHistory.findIndex((item: any, idx: number) => 
                  idx > i && item.source === entry.source && (item.source !== 'internal' && item.source !== 'manual')
                );
                
                if (prevSameSourceIndex !== -1) {
                  const prevSameSource = pingStats.recentHistory[prevSameSourceIndex];
                  const intervalMs = entry.timestamp - prevSameSource.timestamp;
                  const intervalSec = Math.round(intervalMs / 1000);
                  const intervalMin = Math.floor(intervalSec / 60);
                  
                  if (intervalMin > 0) {
                    intervalDisplay = `${intervalMin}m ${intervalSec % 60}s`;
                  } else {
                    intervalDisplay = `${intervalSec}s`;
                  }
                }
              }
              
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-card hover:bg-accent/70' : 'bg-accent hover:bg-accent/70'}>
                  <td className="py-2.5 px-3 border-b border-border/50">{i + 1}</td>
                  <td className="py-2.5 px-3 border-b border-border/50">{formatTime(entry.timestamp)}</td>
                  <td className="py-2.5 px-3 text-right border-b border-border/50">
                    <Tooltip text={executionDiff ? `Changed by ${executionDiff} ${executionTrend}` : 'Execution time'}>
                      <span className={entry.executionTime > 1000 ? 'text-red-500 dark:text-red-400 font-medium' : 
                                      entry.executionTime > 500 ? 'text-amber-500 dark:text-amber-400' : 
                                      'text-green-600 dark:text-green-400'}>
                        {entry.executionTime}ms
                        {executionTrend && (
                          <span className="ml-1 text-muted-foreground">
                            {executionTrend}
                          </span>
                        )}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="py-2.5 px-3 text-right border-b border-border/50 font-medium">{entry.servicesChecked}</td>
                  <td className="py-2.5 px-3 text-center border-b border-border/50">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      entry.source === 'github-action' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400' :
                      entry.source === 'cron-job' ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400' :
                      entry.source === 'manual' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400' :
                      entry.source === 'internal' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                    }`}>
                      {(() => {
                        switch(entry.source) {
                          case 'github-action': return 'GitHub';
                          case 'cron-job': return 'Cron';
                          case 'manual': return 'Manual';
                          case 'internal': return 'Internal';
                          default: return entry.source || 'Legacy';
                        }
                      })()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right border-b border-border/50 font-mono">
                    {intervalDisplay}
                  </td>
                  <td className="py-2.5 px-3 text-right border-b border-border/50 font-mono">
                    {entry.runId || '-'}
                  </td>
                </tr>
              );
            })}
            {(!pingStats?.recentHistory || pingStats.recentHistory.length === 0) && (
              <tr>
                <td colSpan={7} className="py-4 px-3 text-center text-muted-foreground">No ping history available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Show More Button */}
      {pingStats?.recentHistory && pingStats.recentHistory.length > visibleHistoryCount && (
        <div className="mt-3 flex justify-center">
          <button 
            onClick={showMoreHistory} 
            className="text-blue-600 dark:text-blue-500 hover:text-blue-800 dark:hover:text-blue-400 text-xs flex items-center px-3 py-1.5 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Show More ({Math.min(10, pingStats.recentHistory.length - visibleHistoryCount)} of {pingStats.recentHistory.length - visibleHistoryCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}