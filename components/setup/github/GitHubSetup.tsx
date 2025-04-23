'use client';

import { useState, useEffect, MutableRefObject } from 'react';
import { useSetup } from '@/app/context/SetupContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { GithubIcon } from '../SetupIcons';
import { generateWorkflowYaml } from '@/app/utils/setupUtils';
import { 
  CheckIcon, 
  CopyIcon, 
  ExternalLinkIcon, 
  InfoIcon, 
  ChevronRightIcon,
  ArrowLeftIcon,
  GitBranchIcon,
  KeyIcon,
  FileIcon,
  ClockIcon,
  ChevronDownIcon
} from 'lucide-react';

interface GitHubSetupProps {
  onNext?: MutableRefObject<(() => void) | null>;
  onBack?: MutableRefObject<(() => void) | null>;
  isNextDisabled?: MutableRefObject<boolean>;
  isSubmitting?: boolean;
}

export default function GitHubSetup({ onNext, onBack, isNextDisabled, isSubmitting }: GitHubSetupProps) {
  const { 
    githubSettings,
    updateGithubSettings,
    completeSetup,
    markStepComplete,
    setStep
  } = useSetup();

  // Using a numerical step approach for clearer flow
  const [setupStep, setSetupStep] = useState(1);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [yamlCopied, setYamlCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  
  // Time interval state
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  
  // Connect parent navigation to internal steps
  useEffect(() => {
    // Update parent's "next" handler based on our current step
    if (onNext) {
      // Redefine the onNext function from props
      if (setupStep < 3) {
        onNext.current = () => setSetupStep(setupStep + 1);
      } else {
        // On final step, handle completion
        onNext.current = handleCompleteSetup;
      }
    }
    
    // Update parent's "back" handler based on our current step
    if (onBack) {
      if (setupStep > 1) {
        onBack.current = () => setSetupStep(setupStep - 1);
      } else {
        // On first step, use default back behavior
        onBack.current = null;
      }
    }
  }, [setupStep, onNext, onBack]);
  
  // Initialize generatedApiKey from context if it exists
  useEffect(() => {
    if (githubSettings.apiKey) {
      setGeneratedApiKey(githubSettings.apiKey);
    }
  }, [githubSettings.apiKey]);
  
  // Calculate cron expression based on interval settings
  const getCronExpression = () => {
    if (intervalUnit === 'minutes') {
      // For minutes, use */n format for intervals under 60 minutes
      if (intervalValue < 60) {
        return `*/${intervalValue} * * * *`;
      } else {
        // For 60 minutes, use hourly format
        return `0 * * * *`;
      }
    } else {
      // For hours, set it to run at the beginning of specific hours
      if (intervalValue === 1) {
        return `0 * * * *`;
      } else if (intervalValue > 1) {
        return `0 */${intervalValue} * * *`;
      }
    }
    return '*/5 * * * *'; // Default fallback
  };
  
  // Update GitHub settings when interval changes
  const updateSchedule = () => {
    const cronExpression = getCronExpression();
    updateGithubSettings({ schedule: cronExpression });
  };
  
  // Update cron schedule when interval settings change
  useEffect(() => {
    updateSchedule();
  }, [intervalValue, intervalUnit]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Generate a workflow file with the current settings
  const workflowYaml = generateWorkflowYaml(
    githubSettings.schedule,
    githubSettings.secretName,
    typeof window !== 'undefined' ? `${window.location.origin}` : ''
  );
  
  // Generate API key
  const handleGenerateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedApiKey(key);
    updateGithubSettings({ apiKey: key });
  };
  
  // Copy workflow YAML to clipboard
  const copyYaml = () => {
    navigator.clipboard.writeText(workflowYaml);
    setYamlCopied(true);
    setTimeout(() => setYamlCopied(false), 2000);
  };
  
  // Copy API key to clipboard
  const copyApiKey = () => {
    if (generatedApiKey) {
      navigator.clipboard.writeText(generatedApiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  };
  
  // Update repository field in settings
  const updateRepository = (repository: string) => {
    updateGithubSettings({ repository });
  };
  
  // Get a human-readable description of the schedule
  const getScheduleDescription = (): string => {
    if (intervalUnit === 'minutes') {
      if (intervalValue === 1) {
        return 'Every minute';
      } else if (intervalValue === 60) {
        return 'Every hour';
      } else {
        return `Every ${intervalValue} minutes`;
      }
    } else {
      if (intervalValue === 1) {
        return 'Every hour';
      } else {
        return `Every ${intervalValue} hours`;
      }
    }
  };
  
  // Create GitHub repository URL
  const getGitHubRepoUrl = () => {
    if (!githubSettings.repository) return '';
    return `https://github.com/${githubSettings.repository}`;
  };
  
  // Create direct link to create workflow file in GitHub
  const getCreateWorkflowUrl = () => {
    if (!githubSettings.repository) return '';
    return `https://github.com/${githubSettings.repository}/new/main?filename=.github/workflows/${githubSettings.workflow}&value=${encodeURIComponent(workflowYaml)}`;
  };
  
  // Create link to GitHub secrets page
  const getSecretsUrl = () => {
    if (!githubSettings.repository) return '';
    return `https://github.com/${githubSettings.repository}/settings/secrets/actions/new`;
  };
  
  // Handle completing setup from GitHub component
  const handleCompleteSetup = async () => {
    setSetupError(null);
    
    try {
      const success = await completeSetup();
      if (success) {
        markStepComplete('path-setup');
        markStepComplete('complete');
        setStep(5); // Move to the completion step
      } else {
        setSetupError("Failed to complete setup. Please try again.");
      }
    } catch (error) {
      console.error("Error completing setup:", error);
      setSetupError("An unexpected error occurred. Please try again.");
    }
  };
  
  // Toggle YAML visibility
  const toggleYaml = () => {
    setShowYaml(!showYaml);
  };
  
  // Update parent component's disabled state for next button
  useEffect(() => {
    if (isNextDisabled) {
      if (setupStep === 3) {
        isNextDisabled.current = !githubSettings.repository || !githubSettings.apiKey;
      } else {
        isNextDisabled.current = false;
      }
    }
  }, [setupStep, githubSettings.repository, githubSettings.apiKey, isNextDisabled]);
  
  return (
    <div className="space-y-6">
      {/* Header with progress indicator */}
      <div className="flex flex-col space-y-3 bg-muted/30 p-3 rounded-md border border-border/50">
        {/* Progress steps - fixed layout */}
        <div>
          {/* Step indicators with connectors */}
          <div className="flex items-center w-full">
            <div className="w-1/3 flex items-center justify-center">
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center
                ${setupStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {setupStep > 1 ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="text-xs font-medium">1</span>}
              </div>
            </div>
            
            <div className={`h-0.5 flex-grow ${setupStep > 1 ? 'bg-primary' : 'bg-muted'}`} />
            
            <div className="w-1/3 flex items-center justify-center">
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center
                ${setupStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {setupStep > 2 ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="text-xs font-medium">2</span>}
              </div>
            </div>
            
            <div className={`h-0.5 flex-grow ${setupStep > 2 ? 'bg-primary' : 'bg-muted'}`} />
            
            <div className="w-1/3 flex items-center justify-center">
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center
                ${setupStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {setupStep > 3 ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="text-xs font-medium">3</span>}
              </div>
            </div>
          </div>
          
          {/* Step labels */}
          <div className="flex w-full mt-1">
            <div className="w-1/3 text-xs text-center">
              <span className={setupStep >= 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Connect Repository
              </span>
            </div>
            <div className="w-1/3 text-xs text-center">
              <span className={setupStep >= 2 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Security Key
              </span>
            </div>
            <div className="w-1/3 text-xs text-center">
              <span className={setupStep >= 3 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Finish Setup
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Step 1: Repository Setup */}
      {setupStep === 1 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <GitBranchIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Connect Your GitHub Repository</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the repository where GitHub Actions will run to monitor your status page.
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
              <div className="flex">
                <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-blue-800 dark:text-blue-200">
                  GitHub Actions will run regular checks on your services and report their status to this page.
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="repository" className="text-sm font-medium">Repository Name</Label>
              <div className="flex">
                <div className="bg-muted text-foreground text-sm px-3 py-2 rounded-l-md border border-border border-r-0 flex items-center">
                  github.com/
                </div>
                <Input
                  id="repository"
                  value={githubSettings.repository}
                  onChange={(e) => updateRepository(e.target.value)}
                  placeholder="username/repository"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format: username/repository (e.g. octocat/hello-world)
              </p>
            </div>
            
            {githubSettings.repository && (
              <div className="flex items-center mt-2 text-sm">
                <div className="h-5 w-5 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mr-2">
                  <CheckIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span>Repository set to </span>
                <a 
                  href={getGitHubRepoUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                >
                  {githubSettings.repository}
                  <ExternalLinkIcon className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Step 2: API Key Generation */}
      {setupStep === 2 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <KeyIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Create a Security Key</h3>
                <p className="text-sm text-muted-foreground">
                  This key secures the connection between GitHub Actions and your status page.
                </p>
              </div>
            </div>
            
            <div className="bg-muted p-5 rounded-md border border-border">
              {!generatedApiKey ? (
                <div className="flex flex-col items-center space-y-3">
                  <p className="text-sm text-center">Generate a secure key that GitHub Actions will use to authenticate with your status page.</p>
                  <Button
                    onClick={handleGenerateApiKey}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    Generate Security Key
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <Label htmlFor="apiKey" className="text-sm font-medium">Your Security Key:</Label>
                  <div className="relative">
                    <div className="bg-background border border-border rounded-md p-3 pr-24 overflow-hidden break-all text-xs font-mono">
                      {generatedApiKey}
                    </div>
                    <Button
                      size="sm"
                      onClick={copyApiKey}
                      variant="secondary"
                      className="absolute right-1.5 top-1.5 h-8"
                    >
                      {apiKeyCopied ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3.5 w-3.5 mr-1" />
                          Copy Key
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
                    <div className="flex">
                      <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">Next Step: Add to GitHub</p>
                        <ol className="list-decimal ml-4 space-y-1 text-xs">
                          <li>Go to your GitHub repository</li>
                          <li>Navigate to Settings &rarr; Secrets and variables &rarr; Actions</li>
                          <li>Click "New repository secret"</li>
                          <li>Enter <code className="bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">{githubSettings.secretName}</code> as the name</li>
                          <li>Paste your security key as the value</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  {githubSettings.repository && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(getSecretsUrl(), '_blank')}
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5 mr-1" />
                      Add to GitHub Repository Secrets
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Step 3: Final Setup */}
      {setupStep === 3 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <FileIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Create GitHub Actions Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Add a workflow file to your GitHub repository that will run status checks regularly.
                </p>
              </div>
            </div>
            
            {/* Simple check interval selector */}
            <div className="bg-muted p-4 rounded-md border border-border">
              <div className="flex items-center mb-3">
                <ClockIcon className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <Label className="text-sm font-medium">Check Interval</Label>
              </div>
              
              <div className="flex items-center">
                <Input
                  type="number"
                  min={intervalUnit === 'minutes' ? 5 : 1}
                  max={intervalUnit === 'minutes' ? 60 : 24}
                  value={intervalValue}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      if (intervalUnit === 'minutes' && value < 5) {
                        setIntervalValue(5); // Minimum 5 minutes
                      } else if (intervalUnit === 'minutes' && value > 60) {
                        setIntervalValue(60); // Maximum 60 minutes
                      } else if (intervalUnit === 'hours' && value < 1) {
                        setIntervalValue(1); // Minimum 1 hour
                      } else if (intervalUnit === 'hours' && value > 24) {
                        setIntervalValue(24); // Maximum 24 hours
                      } else {
                        setIntervalValue(value);
                      }
                    }
                  }}
                  className="w-20 mr-3"
                />
                
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as 'minutes' | 'hours')}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
                
                <div className="ml-4 text-sm">
                  {getScheduleDescription()}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                GitHub Actions requires a minimum interval of 5 minutes.
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
              <div className="flex">
                <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">One-click setup</p>
                  <p>Click the button below to create the workflow file directly in GitHub. This file will check your services {getScheduleDescription().toLowerCase()}.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {githubSettings.repository && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => window.open(getCreateWorkflowUrl(), '_blank')}
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5 mr-1" />
                  Create Workflow File in GitHub
                </Button>
              )}
              
              {/* Collapsible YAML section */}
              <div className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={toggleYaml}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors text-sm font-medium"
                >
                  <span>Manual Setup (Copy YAML)</span>
                  <ChevronDownIcon 
                    className={`h-4 w-4 transition-transform ${showYaml ? 'transform rotate-180' : ''}`}
                  />
                </button>
                
                {showYaml && (
                  <div className="p-3 space-y-3 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Workflow File Content</Label>
                      <Button
                        onClick={copyYaml}
                        size="sm"
                        variant="outline"
                      >
                        {yamlCopied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-md border border-border">
                      <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                        {workflowYaml}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Copy this content and manually create a file at <code className="bg-muted px-1 py-0.5 rounded">.github/workflows/{githubSettings.workflow}</code> in your repository.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {setupError && (
              <div className="mt-3 p-3 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded text-red-600 dark:text-red-400">
                {setupError}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 