'use client';

import { useState, useEffect } from 'react';
import { useSetup } from '@/app/context/SetupContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GithubIcon } from '../SetupIcons';
import { generateWorkflowYaml } from '@/app/utils/setupUtils';
import { CheckIcon, CopyIcon, ExternalLinkIcon, InfoIcon } from 'lucide-react';

export default function GitHubSetup() {
  const { 
    githubSettings,
    updateGithubSettings,
    siteName,
    completeSetup,
    markStepComplete,
    setStep
  } = useSetup();

  const [currentTab, setCurrentTab] = useState('repository');
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [yamlCopied, setYamlCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [showWorkflowPreview, setShowWorkflowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Initialize generatedApiKey from context if it exists
  useEffect(() => {
    if (githubSettings.apiKey) {
      setGeneratedApiKey(githubSettings.apiKey);
    }
  }, [githubSettings.apiKey]);
  
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
  
  // Update secret name in settings
  const updateSecretName = (secretName: string) => {
    updateGithubSettings({ secretName });
  };
  
  // Update schedule in settings
  const updateSchedule = (schedule: string) => {
    updateGithubSettings({ schedule });
  };
  
  // Update workflow filename in settings
  const updateWorkflow = (workflow: string) => {
    updateGithubSettings({ workflow });
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
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Setup progress indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-muted/30 p-3 rounded-md border border-border/50">
        <div className="flex items-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mr-3">
            <GithubIcon />
          </div>
          <span className="font-medium text-sm">GitHub Integration</span>
        </div>
        
        <div className="flex-1 flex justify-end">
          <Tabs 
            defaultValue="repository" 
            className="w-full" 
            value={currentTab}
            onValueChange={setCurrentTab}
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="repository">Repository</TabsTrigger>
              <TabsTrigger value="apikey">API Key</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Repository step */}
      {currentTab === 'repository' && (
        <Card className="p-4 border border-border">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                <span className="text-xs font-semibold text-primary">1</span>
              </div>
              <h3 className="font-medium">Connect to your GitHub repository</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Enter the repository where you want to set up GitHub Actions for status monitoring.
            </p>
            
            <div className="space-y-3">
              <Label htmlFor="repository">Repository Name</Label>
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
            
            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentTab('apikey')}
                disabled={!githubSettings.repository}
                variant="default"
                size="sm"
                className="mt-2"
              >
                Next: Set Up API Key
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* API Key step */}
      {currentTab === 'apikey' && (
        <Card className="p-4 border border-border">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                <span className="text-xs font-semibold text-primary">2</span>
              </div>
              <h3 className="font-medium">Generate an API Key</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              An API key secures the connection between GitHub Actions and your status page.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
              <div className="flex items-start">
                <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-blue-800 dark:text-blue-200">
                  This key will be used to authenticate ping requests from GitHub Actions
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="secretName">GitHub Secret Name</Label>
              <Input
                id="secretName"
                value={githubSettings.secretName}
                onChange={(e) => updateSecretName(e.target.value)}
                placeholder="PING_API_KEY"
              />
              <p className="text-xs text-muted-foreground">
                This is the name of the secret in your GitHub repository
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-md border border-border flex flex-col items-center">
              {!generatedApiKey ? (
                <>
                  <Button
                    onClick={handleGenerateApiKey}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    Generate API Key
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to generate a secure API key for GitHub Actions
                  </p>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <Label htmlFor="apiKey" className="text-sm font-medium">Your API Key:</Label>
                  <div className="relative">
                    <div className="bg-background border border-border rounded-md p-2 pr-24 overflow-hidden break-all text-xs font-mono">
                      {generatedApiKey}
                    </div>
                    <Button
                      size="sm"
                      onClick={copyApiKey}
                      variant="secondary"
                      className="absolute right-1 top-1 h-7"
                    >
                      {apiKeyCopied ? (
                        <>
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {githubSettings.repository && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => window.open(getSecretsUrl(), '_blank')}
                    >
                      <ExternalLinkIcon className="h-3 w-3 mr-1" />
                      Add to GitHub Repository Secrets
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentTab('repository')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Back
              </Button>
              
              <Button
                onClick={() => setCurrentTab('workflow')}
                disabled={!generatedApiKey}
                variant="default"
                size="sm"
                className="mt-2"
              >
                Next: Create Workflow
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Workflow step */}
      {currentTab === 'workflow' && (
        <Card className="p-4 border border-border">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                <span className="text-xs font-semibold text-primary">3</span>
              </div>
              <h3 className="font-medium">Create GitHub Actions Workflow</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Configure how often GitHub Actions will check your status and create the workflow file.
            </p>
            
            <div className="space-y-3">
              <Label htmlFor="schedule">Ping Schedule (cron expression)</Label>
              <Input
                id="schedule"
                value={githubSettings.schedule}
                onChange={(e) => updateSchedule(e.target.value)}
                placeholder="*/5 * * * *"
              />
              <p className="text-xs text-muted-foreground">
                How often GitHub Actions will ping your status page. Default: every 5 minutes.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-100 dark:border-amber-800/50 text-xs flex items-start">
                <InfoIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 mt-0.5 mr-1.5 flex-shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  GitHub Actions requires a minimum interval of 5 minutes. The default setting is recommended.
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="workflow">Workflow Filename</Label>
              <div className="flex">
                <div className="bg-muted text-foreground text-sm px-3 py-2 rounded-l-md border border-border border-r-0 flex items-center">
                  .github/workflows/
                </div>
                <Input
                  id="workflow"
                  value={githubSettings.workflow}
                  onChange={(e) => updateWorkflow(e.target.value)}
                  placeholder="ping.yml"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Filename for the GitHub Actions workflow
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label 
                  htmlFor="workflowFile" 
                  className="font-medium flex items-center cursor-pointer"
                  onClick={() => setShowWorkflowPreview(!showWorkflowPreview)}
                >
                  <span>Workflow File Preview</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2 h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWorkflowPreview(!showWorkflowPreview);
                    }}
                  >
                    {showWorkflowPreview ? 'Hide' : 'Show'} YAML
                  </Button>
                </Label>
                
                <Button
                  onClick={copyYaml}
                  size="sm"
                  variant="secondary"
                >
                  {yamlCopied ? (
                    <>
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3 mr-1" />
                      Copy YAML
                    </>
                  )}
                </Button>
              </div>
              
              {showWorkflowPreview && (
                <div className="bg-muted p-3 rounded-md border border-border">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono">
                    {workflowYaml}
                  </pre>
                </div>
              )}
              
              {githubSettings.repository && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => window.open(getCreateWorkflowUrl(), '_blank')}
                >
                  <ExternalLinkIcon className="h-3 w-3 mr-1" />
                  Create Workflow File in GitHub
                </Button>
              )}
            </div>
            
            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentTab('apikey')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Back
              </Button>
              
              <Button
                variant="default"
                size="sm"
                className="mt-2"
                disabled={!githubSettings.repository || !githubSettings.apiKey || isSubmitting}
                onClick={handleCompleteSetup}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
            
            {setupError && (
              <div className="mt-3 p-2 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded text-red-600 dark:text-red-400">
                {setupError}
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Summary section that's always visible */}
      <div className="bg-muted/30 p-3 rounded-md border border-border/50 mt-6">
        <h3 className="text-sm font-medium mb-2">Setup Summary</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Repository:</span>
            <span className="font-mono">{githubSettings.repository || '(Not set)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key:</span>
            <span>{githubSettings.apiKey ? '✓ Generated' : '✗ Missing'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Secret Name:</span>
            <span className="font-mono">{githubSettings.secretName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check Frequency:</span>
            <span className="font-mono">{githubSettings.schedule}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workflow File:</span>
            <span className="font-mono">.github/workflows/{githubSettings.workflow}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 