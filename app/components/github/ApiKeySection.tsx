'use client';

import { useState } from 'react';

interface ApiKeySectionProps {
  githubSettings: {
    repository: string;
    secretName: string;
  };
  generatedApiKey: string | null;
  setGeneratedApiKey: (key: string) => void;
  setGithubSettings: (settings: any) => void;
  addLog: (message: string) => void;
  siteSettings: any;
}

export default function ApiKeySection({
  githubSettings,
  generatedApiKey,
  setGeneratedApiKey,
  setGithubSettings,
  addLog,
  siteSettings
}: ApiKeySectionProps) {
  
  const generateApiKey = () => {
    // Generate a random string of 32 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedApiKey(key);
    addLog('Generated new API key');
  };

  return (
    <div className="border-t border-border pt-3 mt-1 relative">
      <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded mb-3">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          API Key Authentication
        </h3>
        <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
          The API key secures communication between GitHub Actions and your server:
        </p>
        
        <div className="bg-card dark:bg-background rounded p-3 border border-blue-200 dark:border-blue-900 mb-2">
          <div className="flex mb-1.5 items-center">
            <div className="flex-shrink-0 h-5 w-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">1</span>
            </div>
            <span className="text-xs text-foreground">Generate an API key here in this app</span>
          </div>
          <div className="flex mb-1.5 items-center">
            <div className="flex-shrink-0 h-5 w-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">2</span>
            </div>
            <span className="text-xs text-foreground">Add this key as a GitHub secret named <code className="bg-accent px-1 py-0.5 rounded">{githubSettings.secretName}</code></span>
          </div>
          <div className="flex mb-1.5 items-center">
            <div className="flex-shrink-0 h-5 w-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">3</span>
            </div>
            <span className="text-xs text-foreground">GitHub Actions workflow uses this secret to authenticate API calls</span>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-5 w-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">4</span>
            </div>
            <span className="text-xs text-foreground">Your server validates this key before accepting ping requests</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-1 text-xs font-medium text-blue-800 dark:text-blue-300">
              {siteSettings?.apiKey ? 'Current API Key' : 'Generate an API key for GitHub'}
            </span>
          </div>
          <button 
            onClick={generateApiKey}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {siteSettings?.apiKey ? 'Generate New Key' : 'Generate Key'}
          </button>
        </div>
        
        {generatedApiKey && (
          <div className="mt-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-green-800 dark:text-green-300 flex items-center">
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
                Copy to Clipboard
              </button>
            </div>
            <div className="bg-card dark:bg-background p-1.5 rounded border border-green-100 dark:border-green-900 overflow-auto">
              <code className="text-xs text-green-800 dark:text-green-300 break-all whitespace-pre-wrap">{generatedApiKey}</code>
            </div>
            
            {generatedApiKey !== siteSettings?.apiKey && (
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded border border-blue-100 dark:border-blue-900">
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
                className="mt-2 flex items-center justify-center text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Go to GitHub to Add Secret
              </a>
            )}
          </div>
        )}
      </div>
      
      <label className="block text-xs font-medium text-foreground mb-1">
        GitHub Secret Name
      </label>
      <div className="flex">
        <input
          type="text"
          value={githubSettings.secretName}
          onChange={e => setGithubSettings((prev: typeof githubSettings) => ({...prev, secretName: e.target.value}))}
          className="w-full border border-border bg-background rounded px-2 py-1.5 text-sm"
          placeholder="PING_API_KEY"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">This is the name of the secret in your GitHub repository. The value of this secret should be the API key generated above.</p>
    </div>
  );
} 