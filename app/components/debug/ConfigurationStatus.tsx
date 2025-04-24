import { useRouter } from 'next/navigation';
import { CronJob } from '../../lib/client/cronClient';
import { formatTimeConsistent } from '../../lib/utils/timeUtils';

interface ConfigurationStatusProps {
  pingStats: any;
  siteSettings: any;
  cronJobs: CronJob[];
  activeCronJobs: number;
  isCronLoading: boolean;
}

export default function ConfigurationStatus({
  pingStats,
  siteSettings,
  cronJobs,
  activeCronJobs,
  isCronLoading
}: ConfigurationStatusProps) {
  const router = useRouter();

  // Calculate overall system configuration status
  const getConfigStatus = () => {
    const hasGitHubAction = pingStats?.githubAction?.enabled;
    const hasCronJobs = activeCronJobs > 0;
    const hasApiKey = siteSettings?.apiKey;
    
    // No active ping systems
    if (!hasGitHubAction && !hasCronJobs) {
      return {
        status: 'critical',
        label: 'Critical: No Active Systems',
        color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
      };
    }
    
    // Missing API key when services are configured
    if (!hasApiKey && (hasGitHubAction || hasCronJobs)) {
      return {
        status: 'warning',
        label: 'Warning: API Key Missing',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
      };
    }
    
    // System is configured properly
    return {
      status: 'configured',
      label: 'Configured',
      color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
    };
  };
  
  const configStatus = getConfigStatus();

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h2 className="text-sm font-medium text-foreground flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuration Status
          </h2>
          <div className="flex items-center space-x-3 ml-3">
            <button 
              onClick={() => router.push('/debug/ping/github')} 
              className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-800 dark:hover:text-blue-400 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              GitHub Settings
            </button>
            <button 
              onClick={() => router.push('/debug/ping/cron')} 
              className="text-xs text-indigo-600 dark:text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-400 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cron Settings
            </button>
          </div>
        </div>
        <div>
          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${configStatus.color}`}>
            {configStatus.label}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          {/* GitHub Actions Status */}
          <div className={`rounded-md p-3 border ${pingStats?.githubAction?.enabled ? 'border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20' : 'border-border bg-accent'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                GitHub Actions
              </h3>
              <span className={`text-xs px-1.5 py-0.5 rounded ${pingStats?.githubAction?.enabled ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-400'}`}>
                {pingStats?.githubAction?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div className="text-muted-foreground">Schedule:</div>
              <div className="font-medium text-foreground">
                {pingStats?.githubAction?.schedule || 'Not set'}
              </div>
              
              <div className="text-muted-foreground">Repository:</div>
              <div className="font-medium text-foreground truncate">
                {pingStats?.githubAction?.repository || 'Not configured'}
              </div>
              
              <div className="text-muted-foreground">Workflow:</div>
              <div className="font-medium text-foreground">
                {pingStats?.githubAction?.workflow || 'Not set'}
              </div>
              
              <div className="text-muted-foreground">API Key:</div>
              <div className="font-medium">
                {siteSettings?.apiKey ? 
                  <span className="text-green-600 dark:text-green-400">Configured</span> : 
                  <span className="text-amber-600 dark:text-amber-400">Not configured</span>}
              </div>
              
              <div className="text-muted-foreground">Secret Name:</div>
              <div className="font-medium text-foreground">
                {siteSettings?.githubAction?.secretName || 'PING_API_KEY'}
              </div>
            </div>
            
            {/* Combined warning for GitHub Actions */}
            {(!pingStats?.githubAction?.enabled || !siteSettings?.apiKey) && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {!pingStats?.githubAction?.enabled && !siteSettings?.apiKey ? (
                      "GitHub Actions disabled and API key missing"
                    ) : !pingStats?.githubAction?.enabled ? (
                      "GitHub Actions workflow is disabled"
                    ) : (
                      "API key not configured. Authentication may fail."
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Cron Jobs Status */}
          <div className={`rounded-md p-3 border ${activeCronJobs > 0 ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-border bg-accent'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cron Jobs
              </h3>
              <span className={`text-xs px-1.5 py-0.5 rounded ${activeCronJobs > 0 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-400'}`}>
                {activeCronJobs > 0 ? `${activeCronJobs} Active` : 'Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs">  
              <div className="text-muted-foreground">Total Jobs:</div>
              <div className="font-medium text-foreground">
                {isCronLoading ? 'Loading...' : cronJobs.length}
              </div>
              
              <div className="text-muted-foreground">Next Run:</div>
              <div className="font-medium text-foreground">
                {(() => {
                  if (isCronLoading) return 'Loading...';
                  
                  const activeJobs = cronJobs.filter(job => job.status === 'running' && job.nextRun);
                  if (activeJobs.length === 0) return 'N/A';
                  
                  const sortedJobs = [...activeJobs].sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
                  const nextJob = sortedJobs[0];
                  
                  return formatTimeConsistent(nextJob.nextRun || 0);
                })()}
              </div>
              
              <div className="text-muted-foreground">API Access:</div>
              <div className="font-medium">
                {siteSettings?.apiKey ? 
                  <span className="text-green-600 dark:text-green-400">Authenticated</span> : 
                  <span className="text-amber-600 dark:text-amber-400">Auth missing</span>}
              </div>
            </div>
            
            {/* Cron-specific warnings */}
            {(cronJobs.length > 0 && activeCronJobs === 0) && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No active cron jobs running</span>
                </div>
              </div>
            )}
            
            {/* API key warning for active Cron jobs */}
            {!siteSettings?.apiKey && activeCronJobs > 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>API key not configured. Cron job pings may fail authentication.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 