'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GitHubActionsForm from '../../../components/github/GitHubActionsForm';
import ManualActions from '../../../components/github/ManualActions';
import ConfigSummary from '../../../components/github/ConfigSummary';

export default function GitHubActionsPage() {
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`${timestamp} - ${message}`, ...prev].slice(0, 100));
  };

  const fetchSiteSettings = async () => {
    try {
      setIsLoading(true);
      addLog('Fetching site settings...');
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSiteSettings(data);
      addLog('Site settings loaded successfully');
    } catch (err) {
      addLog(`Error loading settings: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGithubSettings = async (settings: any) => {
    try {
      setIsSaving(true);
      addLog(`Saving GitHub Action settings...`);
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status} ${response.statusText}`);
      }
      
      const updatedSettings = await response.json();
      setSiteSettings(updatedSettings);
      addLog(`GitHub Action settings saved successfully`);
    } catch (err) {
      addLog(`Error saving settings: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerPing = async () => {
    try {
      addLog(`Triggering manual ping...`);
      
      const response = await fetch(`/api/ping`);
      if (!response.ok) {
        throw new Error(`Failed to trigger ping: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Ping triggered successfully: ${data.status}`);
    } catch (err) {
      addLog(`Error triggering ping: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GitHub Actions Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure automatic monitoring using GitHub's workflow automation
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => router.push('/debug/ping')} 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            Back to Debug
          </button>
          <button 
            onClick={() => router.push('/admin')} 
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Configuration Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* About Card */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">About GitHub Actions Integration</h2>
            <p className="text-sm text-gray-600">
              GitHub Actions lets you run ping checks on a schedule without requiring a dedicated server. 
              Your GitHub repository will run a workflow that calls your OpenUptimes instance to check services.
            </p>
          </div>
          
          {/* Configuration Form */}
          {isLoading ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 flex justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-gray-600">Loading configuration...</p>
              </div>
            </div>
          ) : (
            <GitHubActionsForm
              initialSettings={siteSettings?.githubAction}
              onSave={saveGithubSettings}
              isSaving={isSaving}
              addLog={addLog}
              siteSettings={siteSettings}
            />
          )}
        </div>
        
        {/* Right Column - Activity and Help */}
        <div className="space-y-6">
          {/* Configuration Summary Card */}
          {siteSettings && (
            <ConfigSummary
              siteSettings={siteSettings}
              onManualPing={triggerPing}
            />
          )}
          
          {/* Activity Log Card */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Activity Log
            </h2>
            <div className="bg-gray-50 p-2 rounded border border-gray-200 h-64 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500 p-2">No activity logs yet</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 p-1 hover:bg-gray-100 break-all border-b border-gray-100 last:border-0">{log}</div>
                ))
              )}
            </div>
          </div>
          
          {/* Manual Actions Card */}
          {siteSettings && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Manual Actions
              </h2>
              <ManualActions
                triggerPing={triggerPing}
                repository={siteSettings?.githubAction?.repository || ''}
                workflow={siteSettings?.githubAction?.workflow || 'ping.yml'}
              />
            </div>
          )}
          
          {/* Getting Started Guide Card */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Getting Started
            </h2>
            <div className="text-sm space-y-3">
              <div className="flex">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-800 font-medium">1</span>
                </div>
                <p>Create a GitHub repository for your status page (if you don't have one already)</p>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-800 font-medium">2</span>
                </div>
                <p>Generate an API key in the configuration panel</p>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-800 font-medium">3</span>
                </div>
                <p>Add the API key as a repository secret (named <code className="bg-gray-100 px-1 py-0.5 rounded">PING_API_KEY</code> by default)</p>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-800 font-medium">4</span>
                </div>
                <p>Create a workflow file in your repository at <code className="bg-gray-100 px-1 py-0.5 rounded">.github/workflows/ping.yml</code></p>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-800 font-medium">5</span>
                </div>
                <p>Enable GitHub Actions in the configuration panel</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <a 
                href="/docs/github-actions-setup" 
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                View detailed setup guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 