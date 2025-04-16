'use client';

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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Current Configuration
        </h3>
        <span className="text-xs text-gray-500">
          Last updated: {siteSettings.lastModified ? new Date(siteSettings.lastModified).toLocaleString() : 'Unknown'}
        </span>
      </div>
      
      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-xs">
        <pre className="overflow-auto max-h-24 text-gray-800">{JSON.stringify(githubSettings, null, 2)}</pre>
      </div>
      
      {/* Status Section */}
      <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
        {/* API Key Status */}
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <div className={`h-2.5 w-2.5 rounded-full mr-2 ${siteSettings.apiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <span className="text-xs text-gray-700">
              API Key Authentication: 
              <span className={`ml-1 font-medium ${siteSettings.apiKey ? 'text-green-700' : 'text-amber-600'}`}>
                {siteSettings.apiKey ? 'Configured' : 'Not Configured'}
              </span>
            </span>
          </div>
          
          {/* GitHub Action Status */}
          <div className="flex items-center">
            <div className={`h-2.5 w-2.5 rounded-full mr-2 ${siteSettings.githubAction?.enabled ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <span className="text-xs text-gray-700">
              GitHub Actions: 
              <span className={`ml-1 font-medium ${siteSettings.githubAction?.enabled ? 'text-green-700' : 'text-amber-600'}`}>
                {siteSettings.githubAction?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </span>
          </div>
        </div>
        
        {!siteSettings.apiKey && siteSettings.githubAction?.enabled && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200">
            <p className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-medium">Warning:</span> GitHub Actions is enabled but no API key is configured. Pings from GitHub Actions will fail authentication.
                <p className="mt-1 text-gray-700">
                  <span className="font-medium">Note:</span> In development mode, the default key <code className="bg-gray-100 px-1">openuptimes-api-key</code> will be accepted.
                </p>
              </div>
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <a 
          href="/docs/github-actions-setup" 
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View setup guide
        </a>
        
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