'use client';

import { useState } from 'react';
import { formatCronSchedule } from '../../lib/utils/timeUtils';
import ApiKeySection from '../../../app/components/github/ApiKeySection'; 

interface GitHubActionsFormProps {
  initialSettings: any;
  onSave: (settings: any) => Promise<void>;
  isSaving: boolean;
  addLog: (message: string) => void;
  siteSettings: any;
}

export default function GitHubActionsForm({
  initialSettings,
  onSave,
  isSaving,
  addLog,
  siteSettings
}: GitHubActionsFormProps) {
  const [githubSettings, setGithubSettings] = useState({
    schedule: initialSettings?.schedule || '*/5 * * * *',
    repository: initialSettings?.repository || '',
    workflow: initialSettings?.workflow || 'ping.yml',
    secretName: initialSettings?.secretName || 'PING_API_KEY',
    enabled: initialSettings?.enabled ?? true
  });

  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(
    siteSettings?.apiKey || null
  );
  
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  const handleSave = async () => {
    try {
      addLog(`Saving GitHub Action settings...`);
      await onSave({
        githubAction: githubSettings,
        apiKey: generatedApiKey || undefined
      });
    } catch (err) {
      addLog(`Error saving settings: ${(err as Error).message}`);
    }
  };
  
  const handleGenerateKeyClick = () => {
    if (siteSettings?.apiKey && !showKeyWarning) {
      setShowKeyWarning(true);
      return;
    }
    
    // Generate a random string of 32 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedApiKey(key);
    setShowKeyWarning(false);
    addLog('Generated new API key');
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-3 rounded-lg shadow-sm border ${siteSettings?.githubAction?.enabled 
          ? 'bg-green-50 border-green-200' 
          : 'bg-amber-50 border-amber-200'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${siteSettings?.githubAction?.enabled ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <h3 className={`text-sm font-medium ${siteSettings?.githubAction?.enabled ? 'text-green-800' : 'text-amber-800'}`}>
              GitHub Actions Integration: {siteSettings?.githubAction?.enabled ? 'Enabled' : 'Disabled'}
            </h3>
          </div>
          <div className="flex items-center">
            <input
              id="enabled"
              type="checkbox"
              checked={githubSettings.enabled}
              onChange={e => setGithubSettings({...githubSettings, enabled: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700">
              {githubSettings.enabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {siteSettings?.githubAction?.enabled 
            ? 'GitHub Actions will run the ping workflow on schedule.' 
            : 'Enable this after setting up the workflow file in your repository.'}
        </p>
      </div>

      {/* Repository Configuration Card */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Repository Configuration
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Repository Name
            </label>
            <div className="flex">
              <div className="bg-gray-100 text-gray-700 text-xs px-2 py-1.5 rounded-l border border-gray-300 border-r-0 flex items-center">
                github.com/
              </div>
              <input
                type="text"
                value={githubSettings.repository}
                onChange={e => setGithubSettings({...githubSettings, repository: e.target.value})}
                className="flex-grow border border-gray-300 rounded-r px-2 py-1.5 text-sm"
                placeholder="username/repo"
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">Format: username/repository</p>
              {githubSettings.repository && (
                <a 
                  href={`https://github.com/${githubSettings.repository}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  View repository →
                </a>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Workflow Filename
            </label>
            <div className="flex">
              <div className="bg-gray-100 text-gray-700 text-xs px-2 py-1.5 rounded-l border border-gray-300 border-r-0 flex items-center">
                .github/workflows/
              </div>
              <input
                type="text"
                value={githubSettings.workflow}
                onChange={e => setGithubSettings({...githubSettings, workflow: e.target.value})}
                className="flex-grow border border-gray-300 rounded-r px-2 py-1.5 text-sm"
                placeholder="ping.yml"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Name of the workflow file in your repository</p>
          </div>
        </div>
        
        {githubSettings.repository && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <a 
              href={`https://github.com/${githubSettings.repository}/actions/workflows/${githubSettings.workflow}`} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View workflow runs
            </a>
          </div>
        )}
      </div>
      
      {/* Schedule Configuration Card */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Schedule Configuration
        </h3>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Schedule (Cron Expression)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={githubSettings.schedule}
              onChange={e => setGithubSettings({...githubSettings, schedule: e.target.value})}
              className="flex-grow border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="*/5 * * * *"
            />
            <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-xs flex items-center">
              <span className="text-blue-800 whitespace-nowrap">{formatCronSchedule(githubSettings.schedule)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-gray-500">Format: minute hour day month weekday</p>
            <a 
              href="https://crontab.guru" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blue-500 hover:underline flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cron expression help
            </a>
          </div>
        </div>
        
        <div className="mt-2 bg-gray-50 p-2 rounded text-xs border border-gray-200">
          <p className="text-gray-700">
            <span className="font-medium">Common examples:</span>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center">
              <button 
                onClick={() => setGithubSettings({...githubSettings, schedule: '*/5 * * * *'})}
                className="text-blue-500 hover:text-blue-700"
              >
                */5 * * * *
              </button>
              <span className="ml-2 text-gray-600">Every 5 minutes</span>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setGithubSettings({...githubSettings, schedule: '*/15 * * * *'})}
                className="text-blue-500 hover:text-blue-700"
              >
                */15 * * * *
              </button>
              <span className="ml-2 text-gray-600">Every 15 minutes</span>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setGithubSettings({...githubSettings, schedule: '0 */1 * * *'})}
                className="text-blue-500 hover:text-blue-700"
              >
                0 */1 * * *
              </button>
              <span className="ml-2 text-gray-600">Every hour</span>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setGithubSettings({...githubSettings, schedule: '0 */6 * * *'})}
                className="text-blue-500 hover:text-blue-700"
              >
                0 */6 * * *
              </button>
              <span className="ml-2 text-gray-600">Every 6 hours</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* API Key Authentication Card */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          API Key Authentication
        </h3>
        
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-3">
          <h4 className="text-xs font-medium text-blue-800 mb-2">How API Authentication Works</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-blue-800 text-xs font-medium">1</span>
              </div>
              <span className="text-xs text-gray-700">Generate an API key here in this app</span>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-blue-800 text-xs font-medium">2</span>
              </div>
              <span className="text-xs text-gray-700">Add this key as a GitHub secret named <code className="bg-gray-100 px-1 py-0.5 rounded">{githubSettings.secretName}</code></span>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-blue-800 text-xs font-medium">3</span>
              </div>
              <span className="text-xs text-gray-700">GitHub Actions workflow uses this secret to authenticate API calls</span>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-blue-800 text-xs font-medium">4</span>
              </div>
              <span className="text-xs text-gray-700">Your server validates this key before accepting ping requests</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">GitHub Secret Name</label>
            <input
              type="text"
              value={githubSettings.secretName}
              onChange={e => setGithubSettings({...githubSettings, secretName: e.target.value})}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="PING_API_KEY"
            />
            <p className="text-xs text-gray-500 mt-1">The name of the secret in your GitHub repository</p>
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <div className={`flex items-center justify-between p-2 rounded ${siteSettings?.apiKey ? 'bg-green-50' : 'bg-amber-50'}`}>
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${siteSettings?.apiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span className="text-xs font-medium">
                  API Key: {siteSettings?.apiKey ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <button 
                onClick={handleGenerateKeyClick}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {siteSettings?.apiKey ? 'Generate New Key' : 'Generate Key'}
              </button>
            </div>
            
            {showKeyWarning && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium">Warning: You already have an API key configured</p>
                    <p className="mt-1">Generating a new key will invalidate the existing key and all GitHub Actions workflows using it will need to be updated.</p>
                    <div className="mt-2 flex space-x-2">
                      <button 
                        onClick={handleGenerateKeyClick}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded"
                      >
                        Generate Anyway
                      </button>
                      <button 
                        onClick={() => setShowKeyWarning(false)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        
            {generatedApiKey && !showKeyWarning && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-green-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {generatedApiKey === siteSettings?.apiKey 
                      ? 'Current API Key (already saved):' 
                      : 'Your API Key (add this to GitHub):'
                    }
                  </p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedApiKey);
                      addLog('API key copied to clipboard');
                    }}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 rounded flex items-center"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-white p-1.5 rounded border border-green-100 overflow-auto">
                  <code className="text-xs text-green-800 break-all whitespace-pre-wrap">{generatedApiKey}</code>
                </div>
                
                {generatedApiKey !== siteSettings?.apiKey && (
                  <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-1.5 rounded border border-blue-100">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is a newly generated key. Click "Save GitHub Action Settings" to save it.
                    </p>
                  </div>
                )}
                
                {githubSettings.repository && (
                  <a 
                    href={`https://github.com/${githubSettings.repository}/settings/secrets/actions/new`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Add Secret to GitHub Repository
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium shadow-sm flex items-center"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save GitHub Action Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
} 