import { formatTime } from '../../lib/utils/timeUtils';
import Tooltip from './Tooltip';
import { CronJob } from '../../lib/client/cronClient';

interface IntervalAnalysisProps {
  intervalStats: any;
  pingStats: any;
  fetchPingStats: (resetIntervals?: boolean) => Promise<void>;
  cronJobs?: CronJob[];
  activeCronJobs?: number;
}

export default function IntervalAnalysis({ 
  intervalStats, 
  pingStats,
  fetchPingStats,
  cronJobs = [],
  activeCronJobs = 0
}: IntervalAnalysisProps) {
  // Detect which system is active
  const isCronActive = activeCronJobs > 0;
  const isGithubActive = !!(pingStats?.githubAction?.active);
  
  // Find the active cron job with the shortest interval
  const getActiveCronInterval = () => {
    if (cronJobs.length === 0 || activeCronJobs === 0) return null;
    
    const runningJobs = cronJobs.filter(job => job.status === 'running');
    if (runningJobs.length === 0) return null;
    
    // Get expected intervals from cron expressions
    const intervals = runningJobs.map(job => {
      const exp = job.cronExpression;
      // Simple parsing for */n format (minutes)
      if (exp.match(/^\*\/(\d+) \* \* \* \*$/)) {
        const match = exp.match(/^\*\/(\d+) \* \* \* \*$/);
        const minutes = match ? parseInt(match[1]) : 5;
        return { job, seconds: minutes * 60 };
      }
      // Default to 5 minutes for other formats
      return { job, seconds: 300 };
    });
    
    // Find the job with the shortest interval
    return intervals.sort((a, b) => a.seconds - b.seconds)[0];
  };
  
  // Get info about the active ping system
  const activeCronInterval = getActiveCronInterval();
  const activeSystemName = isCronActive ? 'Cron Job' : isGithubActive ? 'GitHub Actions' : 'None';
  const activeSystemInterval = isCronActive && activeCronInterval 
    ? activeCronInterval.seconds 
    : intervalStats?.expectedInterval || null;
  
  const activeCronJob = activeCronInterval?.job;
  
  // Simplified calculation of interval statistics
  const processIntervalStats = () => {
    if (!intervalStats || !intervalStats.intervals || intervalStats.intervals.length === 0) {
      return null;
    }
    
    // Get the expected interval based on active system
    const expectedInterval = activeSystemInterval || intervalStats.expectedInterval;
    
    // Get intervals - copy to avoid modifying original
    const intervals = [...intervalStats.intervals];
    
    // Basic stats
    const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    
    // Calculate drift (deviation from expected interval)
    const driftValues = intervals.map(i => Math.abs(i - expectedInterval));
    const avgDrift = Math.round(driftValues.reduce((a, b) => a + b, 0) / driftValues.length);
    
    // Calculate consistency as a percentage (100% = perfect, 0% = completely inconsistent)
    // A drift of 0 is perfect (100%), higher drift reduces consistency
    // Normalize so that a drift equal to the interval itself would be 0% consistency
    const consistency = Math.round(Math.max(0, Math.min(100, 100 - ((avgDrift / expectedInterval) * 100))));
    
    // Additional stats for tooltips
    const driftStats = {
      values: driftValues,
      max: Math.max(...driftValues),
      min: Math.min(...driftValues),
      median: [...driftValues].sort((a, b) => a - b)[Math.floor(driftValues.length / 2)],
      percentage: Math.round((avgDrift / expectedInterval) * 100)
    };
    
    return {
      avgInterval,
      avgDrift,
      consistency,
      driftStats,
      expectedInterval
    };
  };
  
  // Process stats
  const processedStats = processIntervalStats();
  
  // Create displayStats with all necessary information
  const displayStats = intervalStats && processedStats ? {
    ...intervalStats,
    avgDrift: processedStats.avgDrift,
    consistency: processedStats.consistency,
    driftStats: processedStats.driftStats,
    activeSystemInterval: processedStats.expectedInterval,
    avgInterval: processedStats.avgInterval
  } : null;
  
  // Format drift statistics tooltip
  const formatDriftStats = () => {
    if (!displayStats || !displayStats.driftStats) return "No detailed drift data available";
    
    return `
      Drift Stats:
      • Min: ${displayStats.driftStats.min}s
      • Max: ${displayStats.driftStats.max}s 
      • Median: ${displayStats.driftStats.median}s
      • Avg: ${displayStats.avgDrift}s (${displayStats.driftStats.percentage}% of expected interval)
      
      Drift measures how far ping intervals deviate from the expected interval.
      Lower values indicate more consistent timing.
    `;
  };
  
  // Format consistency tooltip
  const formatConsistencyStats = () => {
    if (!displayStats) return "No consistency data available";
    
    let qualityDescription;
    if (displayStats.consistency > 90) {
      qualityDescription = "Excellent - Very reliable timing with minimal drift";
    } else if (displayStats.consistency > 70) {
      qualityDescription = "Good - Reliable timing with acceptable drift";
    } else if (displayStats.consistency > 50) {
      qualityDescription = "Fair - Timing shows some irregularity but is functional";
    } else {
      qualityDescription = "Poor - Significant timing irregularities detected";
    }
    
    return `
      Consistency: ${displayStats.consistency}% (${
        displayStats.consistency > 90 ? 'Excellent' : 
        displayStats.consistency > 70 ? 'Good' : 
        displayStats.consistency > 50 ? 'Fair' : 'Poor'
      })
      
      ${qualityDescription}
      
      Based on ${displayStats.sampleSize} intervals since last reset.
      Calculated as: 100% - (avg drift / expected interval × 100%)
      
      Perfect consistency (100%) would mean all intervals match the expected interval exactly.
    `;
  };
  
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border md:col-span-2">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-foreground flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Interval Analysis
          <Tooltip text="Analyzes the time intervals between pings to evaluate system reliability">
            <span className="ml-1 text-xs text-muted-foreground border-dotted border-b border-border">?</span>
          </Tooltip>
        </h2>
      </div>
      
      {/* Active System Indicator */}
      <div className="bg-muted/30 p-2 rounded-md mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isCronActive ? 'bg-indigo-500' : isGithubActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          <span className="text-xs font-medium">Active System: {activeSystemName}</span>
          <Tooltip text={`${isCronActive 
            ? 'Using the Cron Job system with jobs managed through internal scheduler' 
            : isGithubActive 
              ? 'Using GitHub Actions workflow triggered by schedule' 
              : 'No active ping system detected'}`}>
            <span className="ml-1 text-xs text-muted-foreground border-dotted border-b border-border">details</span>
          </Tooltip>
        </div>
        {isCronActive && activeCronJob && (
          <Tooltip text={`Cron Job: ${activeCronJob.name}
Schedule: ${activeCronJob.cronExpression}
Status: ${activeCronJob.status}
Last Run: ${activeCronJob.lastRun ? new Date(activeCronJob.lastRun).toISOString() : 'Never'}
Next Run: ${activeCronJob.nextRun ? new Date(activeCronJob.nextRun).toISOString() : 'Unknown'}`}>
            <span className="text-xs text-muted-foreground">
              Job: {activeCronJob.name} ({activeCronJob.cronExpression})
            </span>
          </Tooltip>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {displayStats && (
            <>
              <Tooltip text={`Statistics are calculated using ping data recorded since ${new Date(pingStats?.lastIntervalReset || 0).toISOString()}. 
Only intervals after this timestamp are considered for calculations.
Reset to start fresh interval analysis.`}>
                <span className="text-xs text-muted-foreground border-dotted border-b border-border">
                  Since: {formatTime(pingStats?.lastIntervalReset || 0)}
                </span>
              </Tooltip>
            </>
          )}
        </div>
        {displayStats && (
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
      
      {/* Analysis Content */}
      <div className="bg-accent p-3 rounded-md border border-border text-sm">
        {(!intervalStats && !isCronActive) ? (
          <p className="text-muted-foreground py-2 text-center">Not enough data for interval analysis (need at least 2 pings)</p>
        ) : !intervalStats && isCronActive ? (
          <p className="text-muted-foreground py-2 text-center">Using Cron Job system. Historical ping data not yet available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <Tooltip text={`Expected time between pings based on ${isCronActive ? `active cron job schedule (${activeCronJob?.cronExpression || 'unknown'})` : `GitHub Actions schedule (${pingStats?.githubAction?.schedule || 'unknown'})`}. 
This is the target interval that the system attempts to maintain.`}>
                  <span className="text-muted-foreground border-b border-dotted border-border">Expected interval:</span>
                </Tooltip>
                <Tooltip text={`${displayStats.activeSystemInterval} seconds between each ping 
Based on: ${isCronActive ? 'Cron schedule' : 'GitHub Actions schedule'}
This is the theoretical interval that should occur between pings.`}>
                  <span className="font-medium">{displayStats.activeSystemInterval}s</span>
                </Tooltip>
              </div>
              <div className="flex justify-between">
                <Tooltip text={`The arithmetic mean of all intervals between consecutive pings.
Calculated from ${displayStats.sampleSize} intervals.
Raw intervals: [${displayStats.intervals?.slice(0, 5).join(', ')}${displayStats.intervals?.length > 5 ? '...' : ''}]`}>
                  <span className="text-muted-foreground border-b border-dotted border-border">Actual avg interval:</span>
                </Tooltip>
                <Tooltip text={`Average: ${displayStats.avgInterval}s
Difference from expected: ${Math.abs(displayStats.avgInterval - displayStats.activeSystemInterval)}s
Direction: ${displayStats.avgInterval > displayStats.activeSystemInterval ? 'Longer than expected' : 'Shorter than expected'}
This shows how the actual ping timing compares to the scheduled interval.`}>
                  <span className={`font-medium ${Math.abs(displayStats.avgInterval - displayStats.activeSystemInterval) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                    {displayStats.avgInterval}s
                    {Math.abs(displayStats.avgInterval - displayStats.activeSystemInterval) > 5 && 
                      <span className="ml-1 text-xs">
                        ({displayStats.avgInterval > displayStats.activeSystemInterval ? '+' : '-'}
                        {Math.abs(displayStats.avgInterval - displayStats.activeSystemInterval)}s)
                      </span>
                    }
                  </span>
                </Tooltip>
              </div>
              <div className="flex justify-between">
                <Tooltip text={formatDriftStats()}>
                  <span className="text-muted-foreground border-b border-dotted border-border">Average drift:</span>
                </Tooltip>
                <Tooltip text={`Average deviation: ±${displayStats.avgDrift}s
${displayStats.avgDrift > 10 
  ? 'High drift indicates inconsistent timing - investigate scheduler issues' 
  : displayStats.avgDrift > 5 
    ? 'Moderate drift - timing shows some inconsistency but is acceptable' 
    : 'Low drift - timing is very consistent'}

Drift measures how much each interval varies from the expected timing.
Consistency rating: ${displayStats.consistency}%`}>
                  <span className={`font-medium ${displayStats.avgDrift > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                    ±{displayStats.avgDrift}s
                  </span>
                </Tooltip>
              </div>
              <div className="flex justify-between">
                <Tooltip text={`The smallest and largest intervals observed between pings.
Wide ranges indicate inconsistent timing.
Sample size: ${displayStats.sampleSize} intervals
Variance: ${displayStats.maxInterval - displayStats.minInterval}s`}>
                  <span className="text-muted-foreground border-b border-dotted border-border">Min/Max interval:</span>
                </Tooltip>
                <Tooltip text={`Min: ${displayStats.minInterval}s (${Math.round((displayStats.minInterval/displayStats.activeSystemInterval)*100)}% of expected)
Max: ${displayStats.maxInterval}s (${Math.round((displayStats.maxInterval/displayStats.activeSystemInterval)*100)}% of expected)
Range: ${displayStats.maxInterval - displayStats.minInterval}s

${(displayStats.maxInterval - displayStats.minInterval) > displayStats.activeSystemInterval 
  ? 'Warning: High variance detected - timing is inconsistent' 
  : 'Variance is within acceptable range'}`}>
                  <span className="font-medium">{displayStats.minInterval}s / {displayStats.maxInterval}s</span>
                </Tooltip>
              </div>
              
              {isCronActive && (
                <div className="flex justify-between">
                  <Tooltip text="Estimated time until the next ping will be triggered by the cron system">
                    <span className="text-muted-foreground border-b border-dotted border-border">Next ping:</span>
                  </Tooltip>
                  <Tooltip text={activeCronJob?.nextRun ? `Next execution: ${new Date(activeCronJob.nextRun).toISOString()}
Job: ${activeCronJob.name}
Schedule: ${activeCronJob.cronExpression}` : 'Unable to determine next execution time'}>
                    <span className="font-medium">
                      {activeCronJob?.nextRun ? (
                        `${Math.max(0, Math.round((activeCronJob.nextRun - Date.now()) / 1000))}s`
                      ) : (
                        'Unknown'
                      )}
                    </span>
                  </Tooltip>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Tooltip text={formatConsistencyStats()}>
                  <span className="font-medium text-foreground border-b border-dotted border-border">Timing Consistency</span>
                </Tooltip>
                <div className="flex items-center space-x-1.5">
                  <Tooltip text={`Analyzed ${displayStats.sampleSize} intervals out of ${displayStats.totalSamples - 1} total intervals in history.
Only intervals since the last reset (${formatTime(pingStats?.lastIntervalReset || 0)}) are used for analysis.

${displayStats.sampleSize < 5 
  ? 'Warning: Limited sample size may affect reliability of analysis' 
  : 'Sample size is sufficient for meaningful analysis'}`}>
                    <div className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      {displayStats.sampleSize} / {displayStats.totalSamples - 1}
                    </div>
                  </Tooltip>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="bg-muted rounded-full h-5 overflow-hidden mb-2">
                  <div 
                    className={`h-full ${
                      displayStats.consistency > 90 ? 'bg-green-500 dark:bg-green-600' : 
                      displayStats.consistency > 70 ? 'bg-yellow-500 dark:bg-yellow-600' : 
                      'bg-orange-500 dark:bg-orange-600'
                    }`} 
                    style={{ width: `${displayStats.consistency}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-muted-foreground">Poor</span>
                  <Tooltip text={`Consistency Score: ${displayStats.consistency}%
${displayStats.consistency > 90 
  ? 'Excellent - Very consistent timing with minimal deviation' 
  : displayStats.consistency > 70 
    ? 'Good - Consistent timing with acceptable deviation' 
    : displayStats.consistency > 50 
      ? 'Fair - Some timing inconsistencies detected' 
      : 'Poor - Significant timing issues detected, investigate scheduler'}

Based on average drift of ${displayStats.avgDrift}s relative to expected interval of ${displayStats.activeSystemInterval}s.
Formula: 100% - (${displayStats.avgDrift}s / ${displayStats.activeSystemInterval}s × 100%)`}>
                    <span className="text-xs font-medium">
                      {displayStats.consistency}% ({
                        displayStats.consistency > 90 ? 'Excellent' : 
                        displayStats.consistency > 70 ? 'Good' : 
                        displayStats.consistency > 50 ? 'Fair' : 
                        'Poor'
                      })
                    </span>
                  </Tooltip>
                  <span className="text-xs text-muted-foreground">Excellent</span>
                </div>
              </div>
              <div className="mt-2 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${
                  displayStats.sampleSize < 3 ? 'bg-amber-500 dark:bg-amber-600' : 
                  displayStats.sampleSize < 10 ? 'bg-yellow-500 dark:bg-yellow-600' : 
                  'bg-green-500 dark:bg-green-600'
                }`}></div>
                <Tooltip text={`${displayStats.sampleSize < 3 
  ? 'Warning: Very limited data - reliability of analysis is questionable' 
  : displayStats.sampleSize < 10 
    ? 'Moderate data - analysis is becoming more reliable but more samples would improve accuracy' 
    : 'Good sample size - statistical analysis is reliable'}
  
Sample size: ${displayStats.sampleSize} intervals
Total available: ${displayStats.totalSamples - 1} intervals
Used for analysis: ${Math.round((displayStats.sampleSize / (displayStats.totalSamples - 1)) * 100)}% of available data`}>
                  <span className="text-xs text-muted-foreground">
                    {displayStats.sampleSize < 3 ? 
                      'Limited data - more samples needed for reliable analysis' : 
                      displayStats.sampleSize < 10 ? 
                      'Moderate sample size - analysis is becoming more reliable' : 
                      'Good sample size - analysis is statistically reliable'}
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 