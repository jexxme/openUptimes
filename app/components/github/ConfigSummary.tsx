'use client';

import { formatCronSchedule } from '../../lib/utils/timeUtils';

interface ConfigSummaryProps {
  siteSettings: any;
  onManualPing: () => void;
}

export default function ConfigSummary({ siteSettings, onManualPing }: ConfigSummaryProps) {
  const githubSettings = siteSettings?.githubAction;
  
  if (!githubSettings) {
    return null;
  }
  
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-foreground flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Current Configuration
        </h2>
        <span className="text-xs text-muted-foreground">
          Last updated: {siteSettings.lastModified ? new Date(siteSettings.lastModified).toLocaleString() : 'Unknown'}
        </span>
      </div>
      
      <div className="bg-accent p-3 rounded border border-border text-xs">
        <div className="mb-2 flex items-center">
          <div className={`h-2.5 w-2.5 rounded-full mr-2 ${githubSettings.enabled ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          <span className={`font-medium ${githubSettings.enabled ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {githubSettings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Repository:</span>
            <a 
              href={`https://github.com/${githubSettings.repository}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {githubSettings.repository || 'Not configured'}
            </a>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Schedule:</span>
            <code className="bg-background px-1 rounded">{githubSettings.schedule || '*/5 * * * *'}</code>
          </div>
          
          <div className="flex justify-between text-muted-foreground text-xs">
            <span></span>
            <span>({formatCronSchedule(githubSettings.schedule || '*/5 * * * *')})</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workflow File:</span>
            <span>{githubSettings.workflow || 'ping.yml'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Secret Name:</span>
            <code className="bg-background px-1 rounded">{githubSettings.secretName || 'PING_API_KEY'}</code>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key Status:</span>
            <span className={`font-medium ${siteSettings.apiKey ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {siteSettings.apiKey ? 'Configured' : 'Not Set'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Status Section */}
      <div className="mt-4 space-y-2">
        {!siteSettings.apiKey && siteSettings.githubAction?.enabled && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-900">
            <p className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-medium">Warning:</span> GitHub Actions is enabled but no API key is configured. Pings will fail authentication.
              </div>
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
        <div></div>
        
        <button 
          onClick={onManualPing} 
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Trigger Manual Ping
        </button>
      </div>
    </div>
  );
} 