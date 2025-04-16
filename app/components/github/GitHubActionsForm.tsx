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
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [showCronExamples, setShowCronExamples] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Function to validate minimum 5-minute interval in cron schedule
  const validateCronSchedule = (cronExpression: string): boolean => {
    // Check for minute-based interval notation (*/n)
    const minutePattern = /^\*\/(\d+) \* \* \* \*$/;
    const match = cronExpression.match(minutePattern);
    
    if (match) {
      const minutes = parseInt(match[1], 10);
      return minutes >= 5;
    }
    
    // For hourly or other complex schedules, allow them
    return true;
  };

  const handleSave = async () => {
    try {
      // Validate schedule before saving
      if (!validateCronSchedule(githubSettings.schedule)) {
        setScheduleError('GitHub Actions requires a minimum interval of 5 minutes');
        addLog('Error: Schedule validation failed - minimum 5 minutes required');
        return;
      }
      
      setScheduleError(null);
      addLog(`Saving GitHub Action settings...`);
      await onSave({
        githubAction: githubSettings,
        apiKey: generatedApiKey || undefined
      });
    } catch (err) {
      addLog(`Error saving settings: ${(err as Error).message}`);
    }
  };
  
  // Function to update schedule and validate it
  const updateSchedule = (schedule: string) => {
    setGithubSettings({...githubSettings, schedule});
    
    if (!validateCronSchedule(schedule)) {
      setScheduleError('GitHub Actions requires a minimum interval of 5 minutes');
    } else {
      setScheduleError(null);
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

  // Add this function inside the component to generate the workflow YAML
  function generateWorkflowYaml() {
    return `name: OpenUptimes Ping Check

on:
  push:
    branches:
      - '**'  # Run on any branch
  schedule:
    # Schedule with minimum GitHub Actions interval of 5 minutes
    - cron: '${githubSettings.schedule}'  # ${formatCronSchedule(githubSettings.schedule)}
  # Allow manual triggering
  workflow_dispatch:

jobs:
  ping:
    name: Ping Service Check
    runs-on: ubuntu-latest
    steps:
      - name: Log start time
        run: echo "Workflow started at $(date)"

      - name: Log trigger event
        run: 'echo "Triggered by: ${"${{ github.event_name }}"}' 
        
      - name: Check if App URL is provided
        id: url_check
        run: |
          if [[ "${"${{ vars.APP_URL }}"}" == "http://localhost:3000" || "${"${{ vars.APP_URL }}"}" == "" ]]; then
            echo "Using localhost - skipping ping as this is likely a local environment or not yet configured"
            echo "configured=false" >> $GITHUB_OUTPUT
          else
            # Remove trailing slash if present
            APP_URL="${"${{ vars.APP_URL }}"}"
            APP_URL=\${APP_URL%/}
            echo "Using remote URL: $APP_URL"
            echo "configured=true" >> $GITHUB_OUTPUT
            echo "app_url=$APP_URL" >> $GITHUB_OUTPUT
          fi

      - name: Perform Ping
        if: steps.url_check.outputs.configured == 'true'
        env:
          PING_API_KEY: ${"${{ secrets."}${githubSettings.secretName}${" }}"}
          RUN_ID: ${"${{ github.run_id }}"}
          APP_URL: ${"${{ steps.url_check.outputs.app_url }}"}
        run: |
          echo "Running ping check (ID: $RUN_ID)"
          
          # Construct the API URL
          PING_URL="\${APP_URL}/api/ping?runId=\${RUN_ID}"
          
          # Make the request with curl (with redirect following)
          HTTP_STATUS=$(curl -L -s -o response.txt -w "%{http_code}" \\
            -H "Content-Type: application/json" \\
            -H "User-Agent: GitHub-Actions-Ping-Scheduler" \\
            -H "X-API-Key: $PING_API_KEY" \\
            "$PING_URL")
          
          # Check if successful
          if [ $HTTP_STATUS -ne 200 ]; then
            echo "Error: Received HTTP status $HTTP_STATUS"
            cat response.txt
            exit 1
          fi
          
          echo "Ping successful"
          cat response.txt
          
      - name: Log completion time
        run: echo "Workflow completed at $(date)"`;
  }

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
        
        {/* New collapsible workflow info section */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <button 
            onClick={() => setShowAuthHelp(!showAuthHelp)} 
            className="w-full flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-150 px-2 py-1 rounded"
          >
            <span className="text-xs font-medium text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How GitHub Actions Integration Works
            </span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showAuthHelp ? 'transform rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showAuthHelp ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
            }`}
          >
            <div className="bg-gray-50 p-3 rounded text-xs">
              <h4 className="font-medium text-gray-800 mb-2">Two-step process:</h4>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <span className="text-blue-800 text-xs font-medium">1</span>
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">Configure settings in this form</p>
                    <p className="text-gray-600 mt-0.5">This stores settings locally and generates the workflow YAML.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <span className="text-blue-800 text-xs font-medium">2</span>
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">Copy YAML to your GitHub repository</p>
                    <p className="text-gray-600 mt-0.5">Changes to schedule or other settings require manually updating your GitHub workflow file.</p>
                  </div>
                </div>
                
                <div className="bg-amber-50 p-2 rounded border border-amber-100">
                  <p className="text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <strong>Important:</strong> Saving settings here does not automatically update your GitHub repository files.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">
                Repository Name
              </label>
              {githubSettings.repository && (
                <div className="flex items-center space-x-2">
                  <a 
                    href={`https://github.com/${githubSettings.repository}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center"
                    title="View repository on GitHub"
                  >
                    <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Repo
                  </a>
                  <a 
                    href={`https://github.com/${githubSettings.repository}/actions/workflows/${githubSettings.workflow}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center"
                    title="View workflow runs on GitHub Actions"
                  >
                    <svg className="w-3.5 h-3.5 mr-0.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v13c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-13c0-.276-.224-.5-.5-.5h-15z"></path>
                      <path d="M8 8h1v7.5h-1z"></path>
                      <path d="M11 8h1v7.5h-1z"></path>
                      <path d="M14 8h1v7.5h-1z"></path>
                      <path d="M17 8h1v7.5h-1z"></path>
                      <path d="M7 6.5c0-.276.224-.5.5-.5h9c.276 0 .5.224.5.5v1c0 .276-.224.5-.5.5h-9c-.276 0-.5-.224-.5-.5v-1z"></path>
                    </svg>
                    Workflows
                  </a>
                </div>
              )}
            </div>
            <div className="flex mt-1">
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
            <p className="text-xs text-gray-500 mt-1">Format: username/repository</p>
          </div>
        </div>
      </div>
      
      {/* Workflow Configuration Card */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Workflow Configuration
        </h3>
        
        {/* Redesigned compact introduction */}
        <div className="mb-4 text-xs bg-blue-50 p-2.5 rounded border border-blue-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Configures when your GitHub Action runs to automatically ping your services. 
            <span className="ml-1 text-red-600 font-medium">Note: GitHub requires minimum 5-minute intervals.</span>
          </p>
        </div>
        
        <div className="mb-4">
          {/* Schedule input with integrated help */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-700 flex items-center">
                Schedule (Cron Expression)
                <div className="relative ml-1 group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                    <p className="text-gray-700">
                      <span className="font-medium text-amber-800">Limitation:</span> GitHub Actions requires a <strong>minimum interval of 5 minutes</strong>. Actual timing may vary with system load.
                    </p>
                  </div>
                </div>
              </label>
              
              <button 
                type="button"
                onClick={() => setShowCronExamples(prev => !prev)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Examples
              </button>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={githubSettings.schedule}
                onChange={e => updateSchedule(e.target.value)}
                className={`flex-grow border rounded px-2 py-1.5 text-sm ${
                  scheduleError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="*/5 * * * *"
              />
              <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-xs flex items-center whitespace-nowrap">
                {formatCronSchedule(githubSettings.schedule)}
              </div>
            </div>
            
            {scheduleError ? (
              <p className="text-xs text-red-600">{scheduleError}</p>
            ) : (
              <p className="text-xs text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                After changing, scroll down to copy the updated YAML
              </p>
            )}
          </div>
          
          {/* Collapsible Examples Section - More compact */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out mt-2 ${
              showCronExamples ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button 
                  onClick={() => updateSchedule('*/5 * * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">*/5 * * * *</code>
                  <span className="block text-gray-600">Every 5 minutes</span>
                </button>
                <button 
                  onClick={() => updateSchedule('*/15 * * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">*/15 * * * *</code>
                  <span className="block text-gray-600">Every 15 minutes</span>
                </button>
                <button 
                  onClick={() => updateSchedule('*/30 * * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">*/30 * * * *</code>
                  <span className="block text-gray-600">Every 30 minutes</span>
                </button>
                <button 
                  onClick={() => updateSchedule('0 */1 * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">0 */1 * * *</code>
                  <span className="block text-gray-600">Every hour</span>
                </button>
                <button 
                  onClick={() => updateSchedule('0 */6 * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">0 */6 * * *</code>
                  <span className="block text-gray-600">Every 6 hours</span>
                </button>
                <button 
                  onClick={() => updateSchedule('0 0 * * *')}
                  className="text-left text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                >
                  <code className="font-mono">0 0 * * *</code>
                  <span className="block text-gray-600">Once daily</span>
                </button>
              </div>
              
              <div className="flex justify-end mt-2">
                <a 
                  href="https://crontab.guru" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-500 hover:underline flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cron expression help
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-3 text-xs border-t border-gray-100 pt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium text-gray-700">YAML Configuration</p>
            <span className="text-amber-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Must be manually copied to GitHub
            </span>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute top-2 right-2 flex">
            {githubSettings.repository && (
              <a 
                href={`https://github.com/${githubSettings.repository}/new/main?filename=.github/workflows/${githubSettings.workflow}&value=${encodeURIComponent(generateWorkflowYaml())}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded-md flex items-center"
                title="Create in GitHub"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Create in GitHub
              </a>
            )}
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generateWorkflowYaml());
                addLog('Workflow YAML copied to clipboard');
              }}
              className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded-md flex items-center"
              title="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Code
            </button>
          </div>
          
          <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre text-gray-800 max-h-80 overflow-y-auto">
            {generateWorkflowYaml()}
          </pre>
          
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Changes to this file need to be made directly in your GitHub repository
            </div>
            
            {githubSettings.repository && (
              <a 
                href={`https://github.com/${githubSettings.repository}/edit/main/.github/workflows/${githubSettings.workflow}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Existing Workflow
              </a>
            )}
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
          <button 
            onClick={() => setShowAuthHelp(!showAuthHelp)} 
            className="w-full flex items-center justify-between hover:bg-blue-100 transition-colors duration-150 px-2 py-1 rounded"
          >
            <h4 className="text-xs font-medium text-blue-800">How API Authentication Works</h4>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${showAuthHelp ? 'transform rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div 
            className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
              showAuthHelp ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
            }`}
          >
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
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-green-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {generatedApiKey === siteSettings?.apiKey 
                      ? 'Current API Key (already saved)' 
                      : 'Your API Key (add this to GitHub)'
                    }
                  </p>
                  <div className="flex items-center space-x-2">
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
                    <button 
                      onClick={() => setShowApiKey(prev => !prev)}
                      className="text-xs flex items-center"
                      title="Toggle visibility"
                    >
                      <span className="mr-1">{showApiKey ? 'Hide' : 'Show'}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-3.5 w-3.5 transform transition-transform ${showApiKey ? 'rotate-180' : ''}`}  
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showApiKey ? 'max-h-64 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                  }`}
                >
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-xs text-gray-600">Settings are saved locally only</span>
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
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}