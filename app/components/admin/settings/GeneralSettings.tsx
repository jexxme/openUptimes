"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Github, Key, Clock, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { CollapsibleInfo } from "./CollapsibleInfo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  
  // Repository validation
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);
  const [isRepoValid, setIsRepoValid] = useState<boolean | null>(null);
  const [repoValidationError, setRepoValidationError] = useState<string | null>(null);
  
  // API Key
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Regenerate API Key confirmation dialog
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
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

  // Validate if a GitHub repository exists
  const validateRepository = async (repoPath: string) => {
    if (!repoPath || !repoPath.includes('/')) {
      setIsRepoValid(false);
      return;
    }

    try {
      setIsValidatingRepo(true);
      setRepoValidationError(null);

      const response = await fetch(`https://api.github.com/repos/${repoPath}`);
      
      if (response.ok) {
        setIsRepoValid(true);
      } else {
        const data = await response.json();
        setIsRepoValid(false);
        setRepoValidationError(data.message || 'Repository not found');
      }
    } catch (error) {
      setIsRepoValid(false);
      setRepoValidationError('Error checking repository');
      console.error('Error validating repository:', error);
    } finally {
      setIsValidatingRepo(false);
    }
  };

  // Validate repository when it changes
  useEffect(() => {
    if (repository) {
      const timeoutId = setTimeout(() => {
        validateRepository(repository);
      }, 800); // Debounce repository validation
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsRepoValid(null);
      setRepoValidationError(null);
    }
  }, [repository]);

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

  const handleGenerateKeyClick = () => {
    if (apiKey) {
      setShowRegenerateDialog(true);
    } else {
      generateApiKey();
    }
  };

  const confirmRegenerateKey = () => {
    generateApiKey();
    setShowRegenerateDialog(false);
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
      
      {/* API Key Regeneration Confirmation Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Regenerate API Key?
            </DialogTitle>
            <DialogDescription className="pt-2">
              You already have an API key configured. Generating a new key will invalidate the existing one.
              Any services using the current key will stop working until updated with the new key.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 p-3 rounded-md border border-amber-100 mt-2">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>You will need to update the secret in your GitHub repository with the new key.</span>
            </p>
          </div>
          <DialogFooter className="mt-4 sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowRegenerateDialog(false)}
              className="sm:mt-0 mt-2"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={confirmRegenerateKey}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Yes, Generate New Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Repository Configuration */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span>GitHub Repository</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`ml-auto px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help ${isGithubEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${isGithubEnabled ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                      <span>{isGithubEnabled ? 'Actions Enabled' : 'Actions Disabled'}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isGithubEnabled 
                      ? 'GitHub Actions are enabled for automated monitoring.' 
                      : 'GitHub Actions are disabled. Enable to use automated monitoring.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Repository (user/repo)</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help
                        ${!repository 
                          ? 'bg-amber-100 text-amber-800' 
                          : isValidatingRepo
                            ? 'bg-blue-100 text-blue-700'
                            : isRepoValid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                        <div className={`w-2 h-2 rounded-full
                          ${!repository 
                            ? 'bg-amber-500' 
                            : isValidatingRepo
                              ? 'bg-blue-500'
                              : isRepoValid
                                ? 'bg-green-500'
                                : 'bg-amber-500'
                          }`}></div>
                        <span>
                          {!repository 
                            ? 'Missing' 
                            : isValidatingRepo
                              ? 'Checking...'
                              : isRepoValid
                                ? 'Connected'
                                : 'Unknown'
                          }
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-center">
                      {!repository 
                        ? 'No repository has been entered. Please specify a repository in the format username/repo-name.' 
                        : isValidatingRepo
                          ? 'Checking if the repository exists and is accessible...'
                          : isRepoValid
                            ? 'Repository exists and is accessible. Ready to configure with GitHub Actions.'
                            : 'Repository may be private or not found. Private repositories will work but cannot be validated.'
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span>GitHub Environment</span>
            </h3>
            
            <div className="space-y-6">
              {/* Authentication Section - Combined Secret and API Key */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                {/* Secret Name Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">GitHub Repository Secret</h4>
                    <a 
                      href={repository ? `https://github.com/${repository}/settings/secrets/actions` : 'https://github.com/settings/secrets'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      View Secrets <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="PING_API_KEY"
                      value={secretName}
                      onChange={(e) => setSecretName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-blue-500" />
                      <span>Name of the secret where you'll store your API key in GitHub. You may use any name you like, just update the Variable in GitHub as well.</span>
                    </p>
                  </div>
                </div>
                
                {/* API Key Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <span>API Key</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-help ${apiKey ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                              <span>{apiKey ? 'Configured' : 'Missing'}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {apiKey 
                              ? 'API key is configured. Add this key as a GitHub repository secret.' 
                              : 'No API key configured. Generate a key to enable GitHub Actions integration.'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleGenerateKeyClick}
                      className="h-8 text-xs"
                    >
                      Generate New Key
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
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
                  
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Add this API key to your repository as a secret named <code className="bg-gray-200 px-1 py-0.5 rounded">{secretName}</code>
                  </p>
                </div>

                <CollapsibleInfo title="about API key authentication">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Setup instructions:</p>
                        <ol className="list-decimal ml-4 mt-1 space-y-1">
                          <li>Generate your API key above</li>
                          <li>Navigate to <span className="font-mono text-xs bg-gray-100 px-1 rounded">github.com/{repository}/settings/secrets/actions</span></li>
                          <li>Click <strong>New repository secret</strong></li>
                          <li>Enter <code className="bg-gray-200 px-1 py-0.5 rounded">{secretName}</code> as the name</li>
                          <li>Paste your API key as the value</li>
                          <li>Click <strong>Add secret</strong></li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Security considerations:</p>
                        <ul className="list-disc ml-4 mt-1 space-y-1">
                          <li>Never expose this key in public repositories or client-side code</li>
                          <li>Only share with trusted services that need to send ping updates</li>
                          <li>You can regenerate this key at any time if it's compromised</li>
                          <li>When regenerated, all existing integrations using the old key will stop working</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CollapsibleInfo>
              </div>
              
              {/* Repository Variables Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">APP_URL Variable</h4>
                  <a 
                    href={repository ? `https://github.com/${repository}/settings/variables/actions` : 'https://github.com/settings/variables'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Variables <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                    <span>Add this URL as <code className="bg-gray-200 px-1 py-0.5 rounded">APP_URL</code> variable in your GitHub repository</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Input
                      value={window.location.origin}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        toast({
                          title: "Copied to clipboard",
                          description: "Current URL has been copied",
                          duration: 3000,
                        });
                      }}
                      className="h-10 w-10 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CollapsibleInfo title="about the APP_URL variable">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">What is the APP_URL for?</p>
                          <p className="mt-1">This variable tells the GitHub Action where to send ping data. It should match the domain where your status page is running and must be accessible from the internet for pings to work properly.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">How to add the APP_URL variable:</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1">
                            <li>On GitHub, navigate to your repository</li>
                            <li>Click on <strong>Settings</strong> tab</li>
                            <li>In the left sidebar, click <strong>Secrets and variables</strong> → <strong>Actions</strong></li>
                            <li>Click the <strong>Variables</strong> tab</li>
                            <li>Click <strong>New repository variable</strong></li>
                            <li>Type <code className="bg-gray-200 px-1 py-0.5 rounded">APP_URL</code> for the name</li>
                            <li>Enter <code className="bg-gray-200 px-1 py-0.5 rounded">{window.location.origin}</code></li>
                            <li>Click <strong>Add variable</strong></li>
                          </ol>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Important:</p>
                          <ul className="list-disc ml-4 mt-1 space-y-1">
                            <li>Do not include a trailing slash in your URL</li>
                            <li>Use the complete URL including the protocol (https://)</li>
                            <li>If this variable is not set, pings won't be sent to your application</li>
                            <li>The example workflow is set to skip pings if <code className="bg-gray-200 px-1 py-0.5 rounded">APP_URL</code> is set to <code className="bg-gray-200 px-1 py-0.5 rounded">http://localhost:3000</code></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CollapsibleInfo>
                </div>
              </div>
            </div>
          </div>
          
          {/* Schedule Configuration */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Schedule Configuration</span>
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set how frequently GitHub Actions will check your services. GitHub enforces a minimum interval of 5 minutes.
              </p>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Check Frequency</label>
                
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
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="*/5 * * * *"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      className="pr-24 text-sm font-mono"
                    />
                    <div className="absolute right-0 top-0 h-full px-3 flex items-center">
                      {isSchedulePreset ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                          {formatCronSchedule(schedule)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">custom</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <CollapsibleInfo 
                  title="about cron schedules"
                  iconColor="text-blue-500"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Common cron patterns:</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                          <div><code className="bg-gray-200 px-1 rounded">*/5 * * * *</code> = Every 5 minutes</div>
                          <div><code className="bg-gray-200 px-1 rounded">0 */1 * * *</code> = Every hour</div>
                          <div><code className="bg-gray-200 px-1 rounded">0 0 * * *</code> = Once daily (midnight)</div>
                          <div><code className="bg-gray-200 px-1 rounded">0 0 * * 1-5</code> = Weekdays only</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Important Note About Scheduling:</p>
                        <p className="mt-1">This schedule setting is only used for configuration validation and logging. The actual ping frequency is determined by when GitHub Actions runs your workflow.</p>
                        <p className="mt-1">To change the actual schedule, you need to edit the workflow file in your GitHub repository.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-2 mt-1">
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
                    </div>
                  </div>
                </CollapsibleInfo>
              </div>
            </div>
          </div>
          
          {/* Advanced Configuration Link */}
          <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Need more detailed GitHub configuration?</span>
            </div>
            <Link 
              href="/debug/ping/github" 
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <span>Advanced GitHub Setup</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSettings} disabled={isSaving} className="px-6">
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