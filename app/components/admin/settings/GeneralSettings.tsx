"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Github, Key, Clock, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
      lastSuccessfulPing?: string | null;
    };
    apiKey?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  onSettingsUpdate: (settings: any) => void;
  hasUnsavedChanges?: boolean; // Optional prop to indicate if this tab has unsaved changes
  onUnsavedChangesChange?: (hasChanges: boolean) => void; // Callback to report unsaved changes
}

export function GeneralSettings({ 
  initialSettings, 
  isLoading: isLoadingProp, 
  error: errorProp,
  onSettingsUpdate,
  hasUnsavedChanges: hasUnsavedChangesProp,
  onUnsavedChangesChange
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
  const [lastSuccessfulPing, setLastSuccessfulPing] = useState<string | null>(initialSettings?.githubAction?.lastSuccessfulPing ?? null);
  const [showScheduleHelp, setShowScheduleHelp] = useState(false);
  
  // Ping history state
  const [pingStats, setPingStats] = useState<{
    lastPing: number | null;
    firstPing: number | null;
    pingCount: number;
    isLoading: boolean;
  }>({
    lastPing: null,
    firstPing: null,
    pingCount: 0,
    isLoading: false
  });
  
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

  // Track the original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    isGithubEnabled: initialSettings?.githubAction?.enabled ?? true,
    repository: initialSettings?.githubAction?.repository ?? '',
    schedule: initialSettings?.githubAction?.schedule ?? '*/5 * * * *',
    secretName: initialSettings?.githubAction?.secretName ?? 'PING_API_KEY',
    apiKey: initialSettings?.apiKey ?? '',
    lastSuccessfulPing: initialSettings?.githubAction?.lastSuccessfulPing ?? null,
  });
  
  // Fetch ping statistics
  useEffect(() => {
    const fetchPingStats = async () => {
      if (!isGithubEnabled) return;
      
      setPingStats(prev => ({ ...prev, isLoading: true }));
      
      try {
        const response = await fetch('/api/ping-stats?limit=0');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ping stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.recentHistory && Array.isArray(data.recentHistory)) {
          const pingHistory = data.recentHistory;
          const pingCount = pingHistory.length;
          
          // Get first and last ping timestamps
          const lastPing = pingCount > 0 ? pingHistory[0].timestamp : null;
          const firstPing = pingCount > 0 ? pingHistory[pingCount - 1].timestamp : null;
          
          setPingStats({
            lastPing,
            firstPing,
            pingCount,
            isLoading: false
          });
          
          // Also update the lastSuccessfulPing for saving
          if (lastPing && (!lastSuccessfulPing || new Date(lastPing).getTime() > new Date(lastSuccessfulPing).getTime())) {
            setLastSuccessfulPing(new Date(lastPing).toISOString());
          }
        }
      } catch (error) {
        console.error('Error fetching ping stats:', error);
        // Don't show error to avoid confusion - this is supplementary data
        setPingStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    fetchPingStats();
    // Only run when component mounts or when isGithubEnabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGithubEnabled]);
  
  // Format date for display
  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };
  
  // Get relative time for display
  const getRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return '';
    
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    
    const elapsed = Date.now() - timestamp;
    
    if (elapsed < msPerMinute) {
      const seconds = Math.round(elapsed / 1000);
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    } else if (elapsed < msPerHour) {
      const minutes = Math.round(elapsed / msPerMinute);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (elapsed < msPerDay) {
      const hours = Math.round(elapsed / msPerHour);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.round(elapsed / msPerDay);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

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
      setLastSuccessfulPing(initialSettings.githubAction?.lastSuccessfulPing ?? null);
      
      // Also update the original values for change detection
      setOriginalValues({
        isGithubEnabled: initialSettings.githubAction?.enabled ?? true,
        repository: initialSettings.githubAction?.repository ?? '',
        schedule: initialSettings.githubAction?.schedule ?? '*/5 * * * *',
        secretName: initialSettings.githubAction?.secretName ?? 'PING_API_KEY',
        apiKey: initialSettings.apiKey ?? '',
        lastSuccessfulPing: initialSettings.githubAction?.lastSuccessfulPing ?? null,
      });
    }
  }, [isLoadingProp, errorProp, initialSettings]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      isGithubEnabled !== originalValues.isGithubEnabled ||
      repository !== originalValues.repository ||
      schedule !== originalValues.schedule ||
      secretName !== originalValues.secretName ||
      // For API key, we only consider it changed if it was generated new
      // or if it was explicitly changed and is different from original
      (apiKey !== originalValues.apiKey && (apiKey !== '' || originalValues.apiKey !== ''))
      // Note: We don't include lastSuccessfulPing in change detection
      // since it's a read-only value set by the system, not by user input
    );
  };

  // Report unsaved changes to parent component
  useEffect(() => {
    // Only call the callback if it exists and we're not in the middle of loading
    if (onUnsavedChangesChange && !isLoading) {
      onUnsavedChangesChange(hasUnsavedChanges());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGithubEnabled, repository, schedule, secretName, apiKey, isLoading]);

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
      // If we have ping stats but no lastSuccessfulPing (or an older one), update it
      const currentLastSuccessfulPing = lastSuccessfulPing;
      if (pingStats.lastPing && (!currentLastSuccessfulPing || new Date(pingStats.lastPing).getTime() > new Date(currentLastSuccessfulPing).getTime())) {
        setLastSuccessfulPing(new Date(pingStats.lastPing).toISOString());
      }
      
      const updatedSettings: {
        githubAction: {
          enabled: boolean;
          repository: string;
          workflow: string;
          schedule: string;
          secretName: string;
          lastSuccessfulPing: string | null;
        };
        apiKey?: string;
      } = {
        githubAction: {
          enabled: isGithubEnabled,
          repository,
          workflow: 'ping.yml',
          schedule,
          secretName,
          lastSuccessfulPing: pingStats.lastPing ? new Date(pingStats.lastPing).toISOString() : lastSuccessfulPing
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
      
      // Update original values after successful save
      setOriginalValues({
        isGithubEnabled,
        repository,
        schedule,
        secretName,
        apiKey,
        lastSuccessfulPing
      });
      
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
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>
        </div>
      )}
      
      {/* API Key Regeneration Confirmation Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Regenerate API Key?
            </DialogTitle>
            <DialogDescription className="pt-2">
              You already have an API key configured. Generating a new key will invalidate the existing one.
              Any services using the current key will stop working until updated with the new key.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-100 dark:border-amber-900/30 mt-2">
            <p className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
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
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 dark:text-white"
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
                    <div className={cn(
                      "ml-auto px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help",
                      pingStats.lastPing && isGithubEnabled
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                        : isGithubEnabled 
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" 
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        pingStats.lastPing && isGithubEnabled
                          ? "bg-green-500 dark:bg-green-400"
                          : isGithubEnabled 
                            ? "bg-blue-500 dark:bg-blue-400" 
                            : "bg-gray-400 dark:bg-gray-500"
                      )}></div>
                      <span>
                        {pingStats.lastPing && isGithubEnabled 
                          ? `Active (${pingStats.pingCount} pings)` 
                          : isGithubEnabled 
                            ? 'Actions Enabled' 
                            : 'Actions Disabled'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] p-3 bg-foreground text-background rounded-md">
                    {pingStats.lastPing && isGithubEnabled ? (
                      <div className="space-y-2">
                        <p className="font-medium">GitHub Actions are running successfully</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
                          <span className="text-background/70">Last ping:</span>
                          <span>{formatDate(pingStats.lastPing)} <span className="text-xs text-background/70">({getRelativeTime(pingStats.lastPing)})</span></span>
                          
                          <span className="text-background/70">First ping:</span>
                          <span>{formatDate(pingStats.firstPing)} <span className="text-xs text-background/70">({getRelativeTime(pingStats.firstPing)})</span></span>
                          
                          <span className="text-background/70">Total pings:</span>
                          <span>{pingStats.pingCount}</span>
                        </div>
                      </div>
                    ) : isGithubEnabled ? (
                      'GitHub Actions are enabled but no successful pings have been detected yet. Make sure your repository is correctly configured with the API key and APP_URL.'
                    ) : (
                      'GitHub Actions are disabled. Enable to use automated monitoring.'
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  Repository (user/repo)
                  
                  {repository && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help",
                            isValidatingRepo
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                              : isRepoValid
                                ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                          )}>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              isValidatingRepo
                                ? "bg-blue-500 dark:bg-blue-400"
                                : isRepoValid
                                  ? "bg-green-500 dark:bg-green-400"
                                  : "bg-amber-500 dark:bg-amber-400"
                            )}></div>
                            <span>
                              {isValidatingRepo
                                ? 'Checking...'
                                : isRepoValid
                                  ? 'Connected'
                                  : 'Unknown'
                              }
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-center bg-foreground text-background rounded-md">
                          {isValidatingRepo
                            ? 'Checking if the repository exists and is accessible...'
                            : isRepoValid
                              ? 'Repository exists and is accessible. Ready to configure with GitHub Actions.'
                              : 'Repository may be private or not found. Private repositories will work but cannot be validated.'
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </label>
                
                {!repository && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                          <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></div>
                          <span>Missing</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-center bg-foreground text-background rounded-md">
                        No repository has been entered. Please specify a repository in the format username/repo-name.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
            <h3 className="font-medium mb-3 flex items-center">
              <Key className="h-4 w-4 text-muted-foreground mr-2" />
              <span>GitHub Environment</span>
              <div className="group relative inline-flex items-center h-full ml-2">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-70 hover:opacity-100 flex items-center justify-center">
                  <Info className="h-3 w-3 text-yellow-500" />
                  <span className="sr-only">More information</span>
                </Button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-50 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 text-xs rounded p-3 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-[300px] pointer-events-none border border-amber-200 dark:border-amber-800/60">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">
                      You must add both <strong>API Key</strong> as a Secret and <strong>APP_URL</strong> as a Variable in your GitHub repository for monitoring to work.
                    </p>
                  </div>
                  <svg className="absolute text-amber-50 dark:text-amber-950/90 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                  </svg>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "ml-auto px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-help",
                      apiKey 
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" 
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        apiKey ? "bg-green-500 dark:bg-green-400" : "bg-amber-500 dark:bg-amber-400"
                      )}></div>
                      <span>{apiKey ? 'Configured' : 'Not Configured'}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-foreground text-background rounded-md">
                    {apiKey 
                      ? 'API key is configured. Remember to add it to your GitHub repository.' 
                      : 'API key is not configured. Generate a key to enable GitHub Actions integration.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            
            <div className="space-y-6">
              {/* Required Secrets & Variables Section */}
              <div className="space-y-4">
                {/* API Key Section */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 h-5 w-5 rounded-full text-xs font-semibold">1</span>
                      <span>API Key</span>
                      <span className="text-xs text-muted-foreground font-normal">Add as a GitHub Secret</span>
                    </h4>
                    <a 
                      href={repository ? `https://github.com/${repository}/settings/secrets/actions` : 'https://github.com/settings/secrets'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      Add Secret <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="grid gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Secret Name</label>
                        <div className={cn(
                          "px-1.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1",
                          pingStats.lastPing && isGithubEnabled
                            ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                            : apiKey 
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" 
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            pingStats.lastPing && isGithubEnabled
                              ? "bg-green-500 dark:bg-green-400"
                              : apiKey 
                                ? "bg-blue-500 dark:bg-blue-400" 
                                : "bg-amber-500 dark:bg-amber-400"
                          )}></div>
                          {pingStats.lastPing && isGithubEnabled 
                            ? 'Configured' 
                            : apiKey 
                              ? 'Pending' 
                              : 'Required'}
                        </div>
                      </div>
                      <Input
                        placeholder="PING_API_KEY"
                        value={secretName}
                        onChange={(e) => setSecretName(e.target.value)}
                        className="h-9 text-sm mb-1"
                      />
                      <p className="text-xs text-muted-foreground">Default: PING_API_KEY</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Secret Value</label>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleGenerateKeyClick}
                          className="h-6 text-xs px-2"
                        >
                          {apiKey ? 'Regenerate' : 'Generate'} Key
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="No API key generated yet"
                            className="pr-16 h-9"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-0 top-0 h-full px-3 text-xs"
                            onClick={() => setShowApiKey(!showApiKey)}
                            disabled={!apiKey}
                          >
                            {showApiKey ? "Hide" : "Show"}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyApiKey}
                          disabled={!apiKey}
                          className="h-9 w-9 flex-shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* APP_URL Section */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 h-5 w-5 rounded-full text-xs font-semibold">2</span>
                      <span>APP_URL</span>
                      <span className="text-xs text-muted-foreground font-normal">Add as a GitHub Variable</span>
                    </h4>
                    <a 
                      href={repository ? `https://github.com/${repository}/settings/variables/actions` : 'https://github.com/settings/variables'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      Add Variable <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="grid gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Variable Name</label>
                        <div className={cn(
                          "px-1.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1",
                          pingStats.lastPing && isGithubEnabled
                            ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            pingStats.lastPing && isGithubEnabled
                              ? "bg-green-500 dark:bg-green-400"
                              : "bg-blue-500 dark:bg-blue-400"
                          )}></div>
                          {pingStats.lastPing && isGithubEnabled ? 'Configured' : 'Required'}
                        </div>
                      </div>
                      <Input
                        value="APP_URL"
                        readOnly
                        className="h-9 text-sm bg-gray-100 dark:bg-gray-800 mb-1"
                      />
                      <p className="text-xs text-muted-foreground">This name cannot be changed</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Variable Value</label>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={window.location.origin}
                          readOnly
                          className="h-9 bg-gray-100 dark:bg-gray-800 flex-1"
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
                          className="h-9 w-9 flex-shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup Instructions Section */}
              <CollapsibleInfo 
                title="Setup instructions"
                className="mt-3"
              >
                <div className="space-y-5">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                      <span className="h-4 w-4 font-medium flex items-center justify-center text-xs">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Add API Key as a Secret</p>
                      <ol className="list-decimal ml-4 mt-1 space-y-1 text-sm">
                        <li>Navigate to <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">github.com/{repository || '[your-repo]'}/settings/secrets/actions</span></li>
                        <li>Click <strong>New repository secret</strong></li>
                        <li>Enter <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{secretName}</code> as the name</li>
                        <li>Paste your API key as the value</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 rounded-full p-1 flex-shrink-0 mt-0.5">
                      <span className="h-4 w-4 font-medium flex items-center justify-center text-xs">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Add APP_URL as a Variable</p>
                      <ol className="list-decimal ml-4 mt-1 space-y-1 text-sm">
                        <li>Navigate to <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">github.com/{repository || '[your-repo]'}/settings/variables/actions</span></li>
                        <li>Click <strong>New repository variable</strong></li>
                        <li>Enter <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">APP_URL</code> as the name</li>
                        <li>Enter <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{window.location.origin}</code> as the value</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-medium text-amber-700 dark:text-amber-400">Important Note About Scheduling:</p>
                      <p className="leading-snug">This schedule setting is only used for configuration validation and logging. The actual ping frequency is determined by when GitHub Actions runs your workflow.</p>
                      <p className="leading-snug">To change the actual schedule, you need to edit the workflow file in your GitHub repository.</p>
                    </div>
                  </div>
                </div>
              </CollapsibleInfo>
            </div>
          </div>
          
          {/* Schedule Configuration */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-2" />
              <span>Schedule Configuration</span>
              <div className="group relative inline-flex items-center h-full ml-2">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-70 hover:opacity-100 flex items-center justify-center">
                  <Info className="h-3 w-3 text-yellow-500" />
                  <span className="sr-only">More information</span>
                </Button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-50 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 text-xs rounded p-3 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-[300px] pointer-events-none border border-amber-200 dark:border-amber-800/60">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">
                      This setting is for validation only. To change the actual ping frequency, edit the workflow file in GitHub.
                    </p>
                  </div>
                  <svg className="absolute text-amber-50 dark:text-amber-950/90 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                  </svg>
                </div>
              </div>
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-md transition-colors text-left",
                        schedule === option.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
                      )}
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
                        <span className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded text-xs">
                          {formatCronSchedule(schedule)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">custom</span>
                      )}
                    </div>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={repository ? `https://github.com/${repository}/edit/main/.github/workflows/ping.yml` : 'https://github.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "h-10 w-10 inline-flex items-center justify-center rounded-md border transition-colors",
                            repository 
                              ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40" 
                              : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
                          )}
                          onClick={e => !repository && e.preventDefault()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-center">
                        {repository 
                          ? "Edit GitHub workflow file to change actual schedule" 
                          : "Configure repository first to edit workflow file"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href="https://crontab.guru" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Crontab reference - Create and test cron schedules
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="mt-1">
                  <CollapsibleInfo 
                    title="About cron schedules"
                    iconColor="text-blue-500"
                    className="mt-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Common cron patterns:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 mt-1">
                            <div className="flex items-center flex-wrap">
                              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded mr-1.5">*/5 * * * *</code>
                              <span className="text-gray-600 dark:text-gray-400">Every 5 minutes</span>
                            </div>
                            <div className="flex items-center flex-wrap">
                              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded mr-1.5">0 */1 * * *</code>
                              <span className="text-gray-600 dark:text-gray-400">Every hour</span>
                            </div>
                            <div className="flex items-center flex-wrap">
                              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded mr-1.5">0 0 * * *</code>
                              <span className="text-gray-600 dark:text-gray-400">Once daily (midnight)</span>
                            </div>
                            <div className="flex items-center flex-wrap">
                              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded mr-1.5">0 0 * * 1-5</code>
                              <span className="text-gray-600 dark:text-gray-400">Weekdays only</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1.5">
                          <p className="font-medium text-amber-700 dark:text-amber-400">Important Note About Scheduling:</p>
                          <p className="leading-snug">This schedule setting is only used for configuration validation and logging. The actual ping frequency is determined by when GitHub Actions runs your workflow.</p>
                          <p className="leading-snug">To change the actual schedule, you need to edit the workflow file in your GitHub repository.</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleInfo>
                </div>
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
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>Advanced GitHub Setup</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving || !hasUnsavedChanges() || isLoading}
              className={cn(
                "px-6",
                hasUnsavedChanges() && !isSaving 
                  ? "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700" 
                  : ""
              )}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : hasUnsavedChanges() ? (
                <>
                  <div className="w-1.5 h-1.5 bg-white dark:bg-white rounded-full animate-pulse mr-2"></div>
                  Save Changes
                </>
              ) : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 