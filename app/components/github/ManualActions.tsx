'use client';

interface ManualActionsProps {
  triggerPing: () => Promise<void>;
  repository: string;
  workflow: string;
}

export default function ManualActions({ triggerPing, repository, workflow }: ManualActionsProps) {
  return (
    <div className="space-y-3">
      <button 
        onClick={triggerPing}
        className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-green-300 flex items-center transition-all duration-200"
      >
        <div className="h-9 w-9 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 text-left">
          <h3 className="font-medium text-gray-900 text-sm">Trigger Manual Ping</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Run an immediate check of all services and update their status
          </p>
        </div>
      </button>
      
      {repository && (
        <>
          <a 
            href={`https://github.com/${repository}/actions/workflows/${workflow}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-blue-300 flex items-center transition-all duration-200"
          >
            <div className="h-9 w-9 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900 text-sm">View GitHub Workflow</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Check workflow runs for {workflow} in your repository
              </p>
            </div>
          </a>
          
          <a 
            href={`https://github.com/${repository}/edit/main/.github/workflows/${workflow}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-amber-300 flex items-center transition-all duration-200"
          >
            <div className="h-9 w-9 bg-amber-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="ml-3 text-left">
              <h3 className="font-medium text-gray-900 text-sm">Edit Workflow File</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Update GitHub Actions schedule with minimum 5 min interval
              </p>
            </div>
          </a>
        </>
      )}
      
      <a 
        href={repository ? `https://github.com/${repository}/settings/secrets/actions` : "https://docs.github.com/en/actions/security-guides/encrypted-secrets"}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-white hover:bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-purple-300 flex items-center transition-all duration-200"
      >
        <div className="h-9 w-9 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="ml-3 text-left">
          <h3 className="font-medium text-gray-900 text-sm">Manage Repository Secrets</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add or update the API key in your repository secrets
          </p>
        </div>
      </a>
    </div>
  );
} 