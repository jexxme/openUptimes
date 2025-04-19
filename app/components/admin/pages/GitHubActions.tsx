"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
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
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollapsibleInfo } from "../settings/CollapsibleInfo";

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

interface GitHubActionsPageProps {
  setActiveTab?: (tab: string) => void;
  registerUnsavedChangesCallback?: (key: string, callback: () => boolean) => void;
  preloadedData?: {
    githubSettings?: {
      githubAction?: any;
      apiKey?: string;
    };
  };
}

export function GitHubActionsPage({ 
  setActiveTab, 
  registerUnsavedChangesCallback, 
  preloadedData 
}: GitHubActionsPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // GitHub Action settings
  const [isGithubEnabled, setIsGithubEnabled] = useState(true);
  const [repository, setRepository] = useState('');
  const [schedule, setSchedule] = useState('*/5 * * * *');
  const [secretName, setSecretName] = useState('PING_API_KEY');
  const [lastSuccessfulPing, setLastSuccessfulPing] = useState<string | null>(null);
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
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Regenerate API Key confirmation dialog
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  // Validate if the current schedule is a predefined option
  const isSchedulePreset = SCHEDULE_OPTIONS.some(option => option.value === schedule);
  
  // Track the original values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    isGithubEnabled: boolean;
    repository: string;
    schedule: string;
    secretName: string;
    apiKey: string;
    lastSuccessfulPing: string | null;
  }>({
    isGithubEnabled: true,
    repository: '',
    schedule: '*/5 * * * *',
    secretName: 'PING_API_KEY',
    apiKey: '',
    lastSuccessfulPing: null,
  });
  
  // Register callback for unsaved changes if provided
  useEffect(() => {
    if (registerUnsavedChangesCallback) {
      registerUnsavedChangesCallback('github-actions', () => hasUnsavedChanges());
    }
  }, [registerUnsavedChangesCallback, isGithubEnabled, repository, schedule, secretName, apiKey]);
  
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
  
  // Validate if a GitHub repository exists
  const validateRepository = async (repoPath: string) => {
    if (!repoPath || !repoPath.includes('/')) {
      setIsRepoValid(false);
      return;
    }

    try {
      setIsValidatingRepo(true);
      setRepoValidationError(null);

      // GitHub API has rate limits for unauthenticated requests
      // Instead of showing errors for private repos, just mark them as "Private/Unknown"
      const response = await fetch(`https://api.github.com/repos/${repoPath}`);
      
      if (response.ok) {
        setIsRepoValid(true);
      } else {
        // Don't show error messages for 404s - they might be private repos
        if (response.status === 404) {
          setIsRepoValid(null);
          setRepoValidationError("Repository may be private or not found");
        } else {
          try {
            const data = await response.json();
            setIsRepoValid(false);
            setRepoValidationError(data.message || 'Repository validation error');
          } catch (e) {
            setIsRepoValid(false);
            setRepoValidationError('Could not validate repository');
          }
        }
      }
    } catch (error) {
      // Don't log this as an error, it's expected for private repos
      setIsRepoValid(null);
      setRepoValidationError('Could not validate repository');
    } finally {
      setIsValidatingRepo(false);
    }
  };

  // Validate repository when it changes with debouncing
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

        // Don't show error to avoid confusion - this is supplementary data
        setPingStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    fetchPingStats();
    // Only run when component mounts or when isGithubEnabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGithubEnabled]);

  // API Key functions
  const generateApiKey = () => {
    // Generate a random API key of 32 characters
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setApiKey(result);
    setShowApiKey(true);
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
        duration: 2000,
        variant: "info",
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
      if (apiKey && apiKey !== originalValues.apiKey) {
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
      
      // Update original values after successful save to reset unsaved changes state
      const newLastSuccessfulPing = pingStats.lastPing 
        ? new Date(pingStats.lastPing).toISOString() 
        : lastSuccessfulPing;
      
      setOriginalValues({
        isGithubEnabled,
        repository,
        schedule,
        secretName,
        apiKey,
        lastSuccessfulPing: newLastSuccessfulPing
      });
      
      // If lastSuccessfulPing was updated, make sure the state reflects this
      if (newLastSuccessfulPing !== lastSuccessfulPing) {
        setLastSuccessfulPing(newLastSuccessfulPing);
      }
      
      // Notify parent component about the update
      handleSettingsUpdate(data.githubAction);
      
      toast({
        title: "Settings saved",
        duration: 2000,
        variant: "success",
      });
    } catch (err) {

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
  
  // Create a helper function to set the API key to ensure consistent behavior
  const setApiKeyWithUpdates = (key: string) => {
    if (!key) return;
    
    setApiKey(key);
    setOriginalValues(prev => ({
      ...prev,
      apiKey: key
    }));
  };
  
  // Fetch GitHub settings if not preloaded
  useEffect(() => {
    if (!preloadedData?.githubSettings) {
      fetchSettings();
    } else {
      // Initialize from preloaded data
      const githubAction = preloadedData.githubSettings.githubAction || {};
      initializeSettings(githubAction);
      
      // Check if we have the API key in preloaded data
      if (preloadedData.githubSettings.apiKey) {
        setApiKeyWithUpdates(preloadedData.githubSettings.apiKey);
        setIsLoading(false);
      } else {
        // Only fetch from API if we need the API key
        fetchSettings();
      }
    }
  }, [preloadedData]);
  
  // Initialize state from settings data
  const initializeSettings = (githubSettings: any) => {
    if (githubSettings) {
      setIsGithubEnabled(githubSettings.enabled ?? true);
      setRepository(githubSettings.repository ?? '');
      setSchedule(githubSettings.schedule ?? '*/5 * * * *');
      setSecretName(githubSettings.secretName ?? 'PING_API_KEY');
      setLastSuccessfulPing(githubSettings.lastSuccessfulPing || null);
      
      // Set original values for comparison
      setOriginalValues({
        isGithubEnabled: githubSettings.enabled ?? true,
        repository: githubSettings.repository ?? '',
        schedule: githubSettings.schedule ?? '*/5 * * * *',
        secretName: githubSettings.secretName ?? 'PING_API_KEY',
        apiKey: '',
        lastSuccessfulPing: githubSettings.lastSuccessfulPing || null
      });
    }
  };
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/settings/github');
      
      if (!response.ok) {
        throw new Error(`Error fetching settings: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.githubAction) {

        setError("Invalid settings data received");
        return;
      }
      
      initializeSettings(data.githubAction);
      
      // Set the API key if available from the response
      if (data.apiKey) {
        setApiKeyWithUpdates(data.apiKey);
      }
      
      setError(null);
    } catch (err) {

      setError("Failed to load settings. Please try again later.");
      toast({
        title: "Error Loading Settings",
        description: "Failed to load settings from the server. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSettingsUpdate = (updatedSettings: any) => {
    // Update current values
    setIsGithubEnabled(updatedSettings.enabled);
    setRepository(updatedSettings.repository);
    setSchedule(updatedSettings.schedule);
    setSecretName(updatedSettings.secretName);
    setLastSuccessfulPing(updatedSettings.lastSuccessfulPing);
    
    // Sync original values to match current
    setOriginalValues(prev => ({
      ...prev,
      isGithubEnabled: updatedSettings.enabled,
      repository: updatedSettings.repository,
      schedule: updatedSettings.schedule,
      secretName: updatedSettings.secretName,
      lastSuccessfulPing: updatedSettings.lastSuccessfulPing
    }));
  };
  
  // Check if there are unsaved changes (for UI purposes)
  const hasUnsavedChanges = () => {
    // Only check important fields that would actually affect behavior
    const hasApiKeyChanged = apiKey !== originalValues.apiKey && apiKey !== '';
    const hasRepoChanged = repository !== originalValues.repository;
    const hasEnabledChanged = isGithubEnabled !== originalValues.isGithubEnabled;
    const hasScheduleChanged = schedule !== originalValues.schedule;
    const hasSecretNameChanged = secretName !== originalValues.secretName;
    
    const hasChanges = (
      hasApiKeyChanged || 
      hasRepoChanged || 
      hasEnabledChanged || 
      hasScheduleChanged || 
      hasSecretNameChanged
    );
    
    // Only log this in development
    if (process.env.NODE_ENV === 'development' && hasChanges) {







    }
    
    return hasChanges;
  };
  
  // Add this condition to check if the badge should show as configured
  const isEnvironmentConfigured = apiKey && pingStats.lastPing && isGithubEnabled;
  
  // Track when apiKey changes but only log if needed
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && apiKey) {

    }
  }, [apiKey]);

  // Fix for API key loading issues - force refresh if after loading it's still empty
  useEffect(() => {
    const logPrefix = '[GitHub Settings]';
    
    if (!isLoading && !error) {
      const delay = setTimeout(() => {
        // Check if the api key is missing but we know it should exist
        if (!apiKey && pingStats.lastPing && isGithubEnabled) {

          fetchSettings();
        }
      }, 2000);
      
      return () => clearTimeout(delay);
    }
  }, [isLoading, error, apiKey, pingStats.lastPing, isGithubEnabled]);

  // Track loading state for the refresh button separately
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refreshSettings = async () => {
    setIsRefreshing(true);
    try {
      await fetchSettings();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
          {/* GitHub Actions Enablement */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span>GitHub Actions Integration</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Enable GitHub Actions Integration</h4>
                  <p className="text-xs text-muted-foreground">When enabled, your application will accept and process pings from GitHub Actions</p>
                </div>
                <div>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isGithubEnabled ? 'bg-primary' : 'bg-input'}`}
                    onClick={() => setIsGithubEnabled(!isGithubEnabled)}
                    role="switch"
                    aria-checked={isGithubEnabled}
                  >
                    <span 
                      className={`inline-block h-5 w-5 transform rounded-full bg-background transition-transform ${isGithubEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 p-4 rounded-md">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  <span>How GitHub Actions Integration Works</span>
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <p>GitHub Actions provides automated monitoring for your status page using GitHub's workflow automation:</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>When enabled, your application will accept pings from GitHub Actions and record them as uptime data</li>
                    <li>GitHub Actions will continue to run in your repository based on the workflow schedule regardless of this setting</li>
                    <li>The toggle controls whether incoming pings from GitHub Actions are validated and processed by this application</li>
                    <li>Disabling this setting will cause the application to reject GitHub Actions pings (they'll receive 401 Unauthorized responses)</li>
                    <li>To completely stop GitHub Actions from running, you must disable the workflow in your GitHub repository</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Important:</span> This toggle only controls whether this application <em>accepts</em> pings from GitHub Actions. 
                    To completely <em>stop</em> GitHub Actions from running the workflow, you must disable it in your GitHub repository settings.
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                      isEnvironmentConfigured 
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" 
                        : apiKey 
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isEnvironmentConfigured 
                          ? "bg-green-500 dark:bg-green-400" 
                          : apiKey 
                            ? "bg-blue-500 dark:bg-blue-400" 
                            : "bg-amber-500 dark:bg-amber-400"
                      )}></div>
                      <span>
                        {isEnvironmentConfigured 
                          ? 'Configured' 
                          : apiKey 
                            ? 'Pending' 
                            : 'Not Configured'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-foreground text-background rounded-md">
                    {isEnvironmentConfigured
                      ? 'GitHub environment is fully configured and working' 
                      : apiKey 
                        ? 'API key is generated but the GitHub Actions might not be fully set up yet' 
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
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={refreshSettings}
                            className="h-6 text-xs px-2"
                            title="Refresh from server"
                            disabled={isRefreshing}
                          >
                            {isRefreshing ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleGenerateKeyClick}
                            className="h-6 text-xs px-2"
                          >
                            {apiKey ? 'Regenerate' : 'Generate'} Key
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey || ''}
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
                          value={typeof window !== 'undefined' ? window.location.origin : ''}
                          readOnly
                          className="h-9 bg-gray-100 dark:bg-gray-800 flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(window.location.origin);
                              toast({
                                title: "Copied to clipboard",
                                description: "Current URL has been copied",
                                duration: 3000,
                                variant: "info",
                              });
                            }
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
                        <li>Enter <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}</code> as the value</li>
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
              disabled={!hasUnsavedChanges() || isLoading || isSaving}
              className={
                isSaving 
                  ? "bg-gray-400 text-white" 
                  : hasUnsavedChanges() 
                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                    : ""
              }
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 