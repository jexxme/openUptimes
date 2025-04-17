"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Github, Key, Clock, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Info } from "lucide-react";
import Link from "next/link";

// Predefined schedule options
const SCHEDULE_OPTIONS = [
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 */1 * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 0 * * *', label: 'Once daily (midnight)' }
];

// Format cron schedule to human-readable text
const formatCronSchedule = (cronExpression: string): string => {
  if (!cronExpression) return 'Invalid schedule';
  
  // Simple human-readable conversion for common patterns
  if (cronExpression === '* * * * *') return 'Every minute';
  
  // Every N minutes pattern: */N * * * *
  if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
    const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
    const mins = match ? match[1] : '';
    return `Every ${mins} minute${parseInt(mins) > 1 ? 's' : ''}`;
  }
  
  // Every hour pattern: 0 */1 * * *
  if (cronExpression.match(/^0 \*\/1 \* \* \*$/)) {
    return 'Every hour';
  }
  
  // Every N hours pattern: 0 */N * * *
  if (cronExpression.match(/^0 \*\/(\d+) \* \* \*$/)) {
    const match = cronExpression.match(/^0 \*\/(\d+) \* \* \*$/);
    const hours = match ? match[1] : '';
    return `Every ${hours} hour${parseInt(hours) > 1 ? 's' : ''}`;
  }
  
  // Daily pattern: 0 0 * * *
  if (cronExpression === '0 0 * * *') {
    return 'Once a day (midnight)';
  }
  
  // Return the original expression if no patterns match
  return cronExpression;
};

interface GeneralSettingsProps {
  initialSettings: {
    githubAction?: {
      enabled?: boolean;
      repository?: string;
      workflow?: string;
      schedule?: string;
      secretName?: string;
    };
    apiKey?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  onSettingsUpdate: (settings: any) => void;
}

export function GeneralSettings({ 
  initialSettings, 
  isLoading: isLoadingProp, 
  error: errorProp,
  onSettingsUpdate 
}: GeneralSettingsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(isLoadingProp);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(errorProp);
  
  // GitHub Action settings
  const [isGithubEnabled, setIsGithubEnabled] = useState(initialSettings?.githubAction?.enabled ?? true);
  const [repository, setRepository] = useState(initialSettings?.githubAction?.repository ?? '');
  const [schedule, setSchedule] = useState(initialSettings?.githubAction?.schedule ?? '*/5 * * * *');
  const [secretName, setSecretName] = useState(initialSettings?.githubAction?.secretName ?? 'PING_API_KEY');
  const [showScheduleHelp, setShowScheduleHelp] = useState(false);
  
  // API Key
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Validate if the current schedule is a predefined option
  const isSchedulePreset = SCHEDULE_OPTIONS.some(option => option.value === schedule);
  
  // Update from props whenever they change
  useEffect(() => {
    setIsLoading(isLoadingProp);
    setFetchError(errorProp);
    
    // Update state when initialSettings change
    if (initialSettings) {
      setIsGithubEnabled(initialSettings.githubAction?.enabled ?? true);
      setRepository(initialSettings.githubAction?.repository ?? '');
      setSchedule(initialSettings.githubAction?.schedule ?? '*/5 * * * *');
      setSecretName(initialSettings.githubAction?.secretName ?? 'PING_API_KEY');
      setApiKey(initialSettings.apiKey ?? '');
    }
  }, [isLoadingProp, errorProp, initialSettings]);

  const generateApiKey = () => {
    // Generate a random API key of 32 characters
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setApiKey(result);
    setShowApiKey(true);
    toast({
      title: "API Key Generated",
      description: "Remember to save your changes and add this key to your GitHub repository secrets.",
      duration: 5000,
    });
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "API key has been copied to your clipboard",
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      const updatedSettings: {
        githubAction: {
          enabled: boolean;
          repository: string;
          workflow: string;
          schedule: string;
          secretName: string;
        };
        apiKey?: string;
      } = {
        githubAction: {
          enabled: isGithubEnabled,
          repository,
          workflow: 'ping.yml',
          schedule,
          secretName
        }
      };
      
      // Only include API key if it was changed
      if (apiKey && apiKey !== initialSettings?.apiKey) {
        updatedSettings.apiKey = apiKey;
      }
      
      // Call API to update settings
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Notify parent component about the update
      onSettingsUpdate(data);
      
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Display API key status message
  const getApiKeyStatus = () => {
    if (!apiKey) return "No API key set";
    if (showApiKey) return apiKey;
    return "******************************";
  };

  return (
    <div>
      {fetchError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span>GitHub Actions Configuration</span>
              <div className={`ml-auto px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${isGithubEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isGithubEnabled ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                <span>{isGithubEnabled ? 'Actions Enabled' : 'Actions Disabled'}</span>
              </div>
            </h3>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Repository (user/repo)</label>
                  <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${repository ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    <div className={`w-2 h-2 rounded-full ${repository ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span>{repository ? 'Connected' : 'Missing'}</span>
                  </div>
                </div>
                <Input
                  placeholder="yourname/repo"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The GitHub repository where your uptime workflow will run (e.g., yourusername/repo-name)
                </p>
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Secret Name</label>
                <Input
                  placeholder="PING_API_KEY"
                  value={secretName}
                  onChange={(e) => setSecretName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The name of your GitHub repository secret that stores the API key. Use this exact name when adding the secret in your 
                  <a 
                    href={repository ? `https://github.com/${repository}/settings/secrets/actions` : 'https://github.com/settings/secrets'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 mx-1"
                  >
                    GitHub repository secrets
                  </a>
                  settings.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span>API Key Authentication</span>
              <div className={`ml-auto px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${apiKey ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span>{apiKey ? 'Configured' : 'Missing'}</span>
              </div>
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This API key is required for GitHub Actions to authenticate with your status page. 
                You'll need to add it as a secret in your GitHub repository.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">GitHub Repository Secret</h4>
                  <div className="flex gap-2">
                    <a 
                      href={repository ? `https://github.com/${repository}/settings/secrets/actions` : 'https://github.com/settings/secrets'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      View Secrets <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={generateApiKey}
                      className="h-8 text-xs"
                    >
                      Generate New Key
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="No API key generated yet"
                      className="pr-20"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-0 top-0 h-full px-3 text-xs"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyApiKey}
                    disabled={!apiKey}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  <p>Add this key to your GitHub repository as a secret named <code className="bg-gray-200 px-1 py-0.5 rounded">{secretName}</code></p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Schedule Configuration</span>
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set how frequently GitHub Actions will check your services. Remember that GitHub enforces a minimum interval of 5 minutes.
              </p>
              
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Schedule
                    <button 
                      type="button" 
                      onClick={() => setShowScheduleHelp(!showScheduleHelp)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showScheduleHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSchedule(option.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                        schedule === option.value
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      placeholder="*/5 * * * *"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      className="pr-20 text-sm font-mono"
                    />
                    <div className="absolute right-0 top-0 h-full px-3 text-xs flex items-center text-gray-500">
                      {isSchedulePreset ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {formatCronSchedule(schedule)}
                        </span>
                      ) : (
                        <span>custom</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleHelp(!showScheduleHelp)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {showScheduleHelp ? "Hide explanation" : "Show important schedule information"}
                  </button>
                </p>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showScheduleHelp ? 'max-h-80 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                  }`}
                >
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 text-xs">
                    <div className="flex items-start gap-2 text-gray-800 mb-2">
                      <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Important Note About Scheduling:</p>
                        <p className="mt-1">This schedule setting is <strong>only used for configuration validation and logging</strong>. The actual ping frequency is determined by when GitHub Actions runs your workflow.</p>
                        <p className="mt-1">To change the actual schedule, you need to edit the workflow file in your GitHub repository.</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <p className="font-medium text-gray-700 mb-1">Common cron patterns:</p>
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <li><code className="bg-gray-200 px-1 rounded">*/5 * * * *</code> = Every 5 minutes</li>
                        <li><code className="bg-gray-200 px-1 rounded">0 */1 * * *</code> = Every hour</li>
                        <li><code className="bg-gray-200 px-1 rounded">0 0 * * *</code> = Once daily (midnight)</li>
                        <li><code className="bg-gray-200 px-1 rounded">0 0 * * 1-5</code> = Weekdays only</li>
                      </ul>
                      
                      <div className="flex flex-col gap-2 mt-3">
                        <p className="font-medium text-gray-700">Quick Actions:</p>
                        <div className="flex flex-wrap gap-2">
                          <a 
                            href={repository ? `https://github.com/${repository}/edit/main/.github/workflows/ping.yml` : 'https://github.com'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${repository ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                            onClick={e => !repository && e.preventDefault()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit workflow file
                          </a>
                          <a 
                            href="https://crontab.guru" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Crontab reference
                          </a>
                          <Link 
                            href="/debug/ping/github" 
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Advanced GitHub setup
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Need more detailed configuration?</span>
            </div>
            <Link 
              href="/debug/ping/github" 
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <span>Advanced GitHub Setup</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 
                <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 