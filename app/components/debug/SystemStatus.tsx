import { formatTime, formatTimeConsistent } from '../../lib/utils/timeUtils';
import Tooltip from './Tooltip';
import { CronJob } from '../../lib/client/cronClient';

interface SystemStatusProps {
  pingStats: any;
  isLoading: boolean;
  error: string | null;
  cronJobs: CronJob[];
  activeCronJobs: number;
  lastUpdate: Date;
}

export default function SystemStatus({ 
  pingStats, 
  isLoading, 
  error, 
  cronJobs, 
  activeCronJobs, 
  lastUpdate 
}: SystemStatusProps) {
  // Calculate overall ping system status
  const getSystemStatus = () => {
    const hasGitHubAction = pingStats?.githubAction?.enabled;
    const hasCronJobs = activeCronJobs > 0;
    
    // No active ping systems
    if (!hasGitHubAction && !hasCronJobs) {
      return {
        status: 'critical',
        label: 'Critical: No Active Systems',
        color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
      };
    }
    
    // Check if the last ping is too old
    if (pingStats?.lastPing) {
      const secondsSinceLastPing = Math.floor((Date.now() - pingStats.lastPing) / 1000);
      
      if (secondsSinceLastPing > 90) {
        return {
          status: 'warning',
          label: 'Warning: Delayed Pings',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
        };
      }
    }
    
    // System is healthy
    return {
      status: 'healthy',
      label: 'Healthy',
      color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
    };
  };
  
  const systemStatus = getSystemStatus();

  return (
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
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground">Ping Systems</span>
            <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${systemStatus.color}`}>
              {systemStatus.label}
            </span>
          </div>
          
          {/* Active Systems Grid */}
          <div className="grid grid-cols-1 gap-2 mb-3">
            {pingStats?.githubAction && (
              <div className={`border rounded-md p-2 ${pingStats.githubAction.enabled ? 'border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20' : 'border-border bg-muted/30'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    GitHub Actions
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${pingStats.githubAction.enabled ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-400'}`}>
                    {pingStats.githubAction.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-1.5 text-xs grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-muted-foreground">Schedule:</span>
                    <div className="font-mono">{pingStats.githubAction.schedule || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. Next Run:</span>
                    <div>{pingStats.nextEstimatedRun ? formatTimeConsistent(pingStats.nextEstimatedRun) : 'Unknown'}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className={`border rounded-md p-2 ${activeCronJobs > 0 ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-border bg-muted/30'}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cron Jobs
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${activeCronJobs > 0 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-400'}`}>
                  {activeCronJobs > 0 ? `${activeCronJobs} Active` : 'Inactive'}
                </span>
              </div>
              <div className="mt-1.5 text-xs grid grid-cols-2 gap-1">
                <div>
                  <span className="text-muted-foreground">Total Jobs:</span>
                  <div>{cronJobs.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Run:</span>
                  <div>
                    {(() => {
                      const nextRunJobs = cronJobs
                        .filter(job => job.nextRun && job.status === 'running')
                        .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                      
                      if (nextRunJobs.length === 0) return 'N/A';
                      return formatTimeConsistent(nextRunJobs[0].nextRun || 0);
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Key Information */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/30 p-2 rounded border border-border">
              <div className="text-xs font-medium mb-1">Last Ping</div>
              <div className="text-sm">
                {pingStats?.lastPing ? (
                  <Tooltip text={new Date(pingStats.lastPing).toISOString()}>
                    <span>{formatTimeConsistent(pingStats.lastPing)}</span>
                  </Tooltip>
                ) : (
                  'Never'
                )}
              </div>
              {pingStats?.lastPing && (
                <div className="text-xs mt-1">
                  <span className={`${
                    Math.floor((Date.now() - pingStats.lastPing) / 1000) > 90 ? 'text-red-600 dark:text-red-400' : 
                    Math.floor((Date.now() - pingStats.lastPing) / 1000) > 60 ? 'text-amber-600 dark:text-amber-400' : 
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {Math.floor((Date.now() - pingStats.lastPing) / 1000)}s ago
                  </span>
                </div>
              )}
            </div>
            
            <div className="bg-muted/30 p-2 rounded border border-border">
              <div className="text-xs font-medium mb-1">Next Ping</div>
              <div className="text-sm">
                {(() => {
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
                  
                  return (
                    <Tooltip text={next.source + ': ' + new Date(next.time).toISOString()}>
                      <span>{formatTimeConsistent(next.time)}</span>
                    </Tooltip>
                  );
                })()}
              </div>
              <div className="text-xs mt-1">
                {(() => {
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
                  
                  return waitTime > 0 ? `In ${Math.floor(waitTime / 1000)}s` : 'Imminent';
                })()}
              </div>
            </div>
          </div>
          
          {systemStatus.status === 'critical' && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 p-2 rounded">
              No active ping systems! Enable at least one in the Configuration section.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 