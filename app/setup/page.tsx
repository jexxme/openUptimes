"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSetup, SetupProvider } from '@/app/context/SetupContext';
import { SetupContainer } from '@/components/setup/SetupContainer';
import { SetupPathSelector, SetupPath } from '@/components/setup/SetupPathSelector';
import { GithubIcon, ClockIcon, CustomIcon } from '@/components/setup/SetupIcons';
import { SETUP_STEPS } from '@/app/utils/setupUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { validatePassword, validatePasswordsMatch } from '@/app/utils/setupUtils';
import { SetupIntroAnimation } from '@/components/setup/SetupIntroAnimation';
// Dynamic import for GitHub setup component
import dynamic from 'next/dynamic';

// Dynamically import GitHub setup component
const GitHubSetup = dynamic(() => import('@/components/setup/github/GitHubSetup'), {
  loading: () => <div className="p-4 text-center">Loading GitHub setup...</div>,
  ssr: false
});

// Dynamically import Cron setup component
const CronSetup = dynamic(() => import('@/components/setup/cron/CronSetup'), {
  loading: () => <div className="p-4 text-center">Loading Cron setup...</div>,
  ssr: false
});

function SetupPageContent() {
  const router = useRouter();
  const { 
    path, 
    setPath, 
    step, 
    setStep, 
    isEdgeRuntime,
    password,
    confirmPassword,
    updatePassword,
    updateConfirmPassword,
    siteName,
    siteDescription,
    refreshInterval,
    updateSiteSettings,
    markStepComplete, 
    checkEnvironment,
    stepCompletion,
    completeSetup
  } = useSetup();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntroAnimation, setShowIntroAnimation] = useState(true);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    number: false,
    uppercase: false,
    special: false,
    match: false
  });

  // Create refs for GitHub setup component
  // These must be at the top level to maintain hook order
  const githubNextRef = React.useRef<(() => void) | null>(null);
  const githubBackRef = React.useRef<(() => void) | null>(null);
  const githubIsNextDisabledRef = React.useRef<boolean>(false);
  
  // Create refs for Cron setup component
  const cronNextRef = React.useRef<(() => void) | null>(null);
  const cronBackRef = React.useRef<(() => void) | null>(null);
  const cronIsNextDisabledRef = React.useRef<boolean>(false);

  // Define the available setup paths with additional information
  const setupPaths: SetupPath[] = [
    {
      id: 'github',
      title: 'GitHub Integration',
      description: 'Use GitHub Actions to monitor your services and automatically update status.',
      icon: <GithubIcon />,
      requiresEdgeRuntime: false,
      difficulty: 'easy',
      featurePoints: [
        'Uses GitHub Actions workflows for scheduling',
        'Simple setup with minimal configuration',
        'Free for public repositories',
        'Great for developers already using GitHub',
        'Low Reliability, High Latency - but no extra cost'
      ]
    },
    {
      id: 'cron',
      title: 'Cron Job Monitoring',
      description: 'Schedule recurring checks on your deployed instance to monitor multiple services.',
      icon: <ClockIcon />,
      requiresEdgeRuntime: true,
      difficulty: 'medium',
      featurePoints: [
        'Built-in scheduler for monitoring',
        'Runs directly on your deployed instance',
        'Can monitor multiple services at once',
        'Requires Edge Runtime compatible hosting'
      ]
    },
    {
      id: 'custom',
      title: 'Custom Integration',
      description: 'Configure your own monitoring solution using the API endpoints.',
      icon: <CustomIcon />,
      requiresEdgeRuntime: false,
      difficulty: 'advanced',
      featurePoints: [
        'Maximum flexibility for custom solutions',
        'Use with any monitoring tool or service',
        'API-driven architecture',
        'Best for advanced use cases or existing monitoring'
      ]
    }
  ];
  
  // Update password validation status whenever password or confirmPassword changes
  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      number: /\d/.test(password),
      uppercase: /[A-Z]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password === confirmPassword && password.length > 0
    });
  }, [password, confirmPassword]);

  // In page.tsx - Modify the useEffect
  const [hasCheckedEnv, setHasCheckedEnv] = useState(false);

  useEffect(() => {
    // Only run this once
    if (!hasCheckedEnv) {
      const init = async () => {
        try {
          setIsLoading(true);
          await checkEnvironment();
          setHasCheckedEnv(true);
        } catch (err) {
          // Just log, don't set error state which might cause re-renders
          console.error('Environment check error:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      init();
    }
  }, [checkEnvironment, hasCheckedEnv]);

  // Handle path selection
  const handlePathSelect = (selectedPath: string) => {
    setPath(selectedPath as 'github' | 'cron' | 'custom');
  };

  // Handle next button click based on current step
  const handleNext = () => {
    // Clear any previous errors
    setError(null);
    
    // Validation logic based on current step
    if (step === 1) {
      // Welcome step - validate path selection
      if (!path) {
        setError('Please select a setup path to continue');
        return;
      }
      
      markStepComplete('welcome');
      setStep(2);
    } 
    else if (step === 2) {
      // Password step - validate password
      if (!passwordValidation.length || 
          !passwordValidation.number || 
          !passwordValidation.uppercase || 
          !passwordValidation.special || 
          !passwordValidation.match) {
        
        // Determine the specific error message
        if (!password) {
          setError("Password is required");
        } else if (!passwordValidation.length) {
          setError("Password must be at least 8 characters long");
        } else if (!passwordValidation.number) {
          setError("Password must contain at least one number");
        } else if (!passwordValidation.uppercase) {
          setError("Password must contain at least one uppercase letter");
        } else if (!passwordValidation.special) {
          setError("Password must contain at least one special character");
        } else if (!passwordValidation.match) {
          setError("Passwords do not match");
        }
        return;
      }
      
      markStepComplete('password');
      setStep(3);
    }
    else if (step === 3) {
      // Site settings validation
      if (!siteName.trim()) {
        setError("Site name is required");
        return;
      }
      
      if (refreshInterval < 10) {
        setError("Refresh interval must be at least 10 seconds");
        return;
      }
      
      markStepComplete('site-settings');
      setStep(4);
    }
    else if (step === 4) {
      // For non-GitHub paths or if the GitHub component isn't handling navigation
      markStepComplete('path-setup');
      setStep(5);
    }
    else if (step === 5) {
      // Complete setup
      setIsSubmitting(true);
      
      completeSetup()
        .then((success) => {
          if (success) {
            markStepComplete('complete');
            // Redirect to home after successful setup
            router.push('/');
          } else {
            setError("Failed to complete setup. Please try again.");
          }
        })
        .catch((err) => {
          console.error("Setup completion error:", err);
          setError("An unexpected error occurred. Please try again.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Convert step format for progress component
  const progressSteps = SETUP_STEPS.map(step => ({
    key: step.key,
    label: step.label,
    completed: !!stepCompletion[step.key]
  }));
  
  // Render GitHub setup component for step 4
  const renderGitHubSetup = () => {
    return (
      <GitHubSetup 
        onNext={githubNextRef}
        onBack={githubBackRef}
        isNextDisabled={githubIsNextDisabledRef}
        isSubmitting={isSubmitting}
      />
    );
  };
  
  // Render cron setup component for step 4
  const renderCronSetup = () => {
    return (
      <CronSetup
        onNext={cronNextRef}
        onBack={cronBackRef}
        isNextDisabled={cronIsNextDisabledRef}
        isSubmitting={isSubmitting}
      />
    );
  };
  
  // Render custom setup component for step 4
  const renderCustomSetup = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-foreground">Custom Integration</h2>
          <p className="text-sm text-muted-foreground">
            Set up your own monitoring solution with our API.
          </p>
        </div>
        <div className="bg-muted/30 p-4 rounded-md border border-border">
          <p className="text-sm">Custom integration will be implemented in the next phase.</p>
        </div>
      </div>
    );
  };
  
  // Render no path selected message for step 4
  const renderNoPathSelected = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-foreground">Setup Method</h2>
          <p className="text-sm text-muted-foreground">
            Please select a setup method to continue.
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800/30">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No setup method selected. Please go back to step 1 and select a method.</p>
        </div>
      </div>
    );
  };
  
  // Render path-specific setup content for step 4
  const renderPathSetup = () => {
    if (path === 'github') {
      return renderGitHubSetup();
    } else if (path === 'cron') {
      return renderCronSetup();
    } else if (path === 'custom') {
      return renderCustomSetup();
    } else {
      return renderNoPathSelected();
    }
  };
  
  // Override normal navigation for GitHub and Cron setup
  const handleNextWithGitHub = () => {
    if (step === 4) {
      if (path === 'github' && githubNextRef.current) {
        githubNextRef.current();
      } else if (path === 'cron' && cronNextRef.current) {
        cronNextRef.current();
      } else {
        handleNext();
      }
    } else {
      handleNext();
    }
  };

  const handleBackWithGitHub = () => {
    if (step === 4) {
      if (path === 'github' && githubBackRef.current) {
        githubBackRef.current();
      } else if (path === 'cron' && cronBackRef.current) {
        cronBackRef.current();
      } else {
        handleBack();
      }
    } else {
      handleBack();
    }
  };

  // Check if we should show the intro animation
  useEffect(() => {
    // Always show the intro animation
    setShowIntroAnimation(true);
    
    // No need to store that user has seen the intro since we want to show it every time
    return () => {
      // Remove any previous flag as we want the animation to show every time
      localStorage.removeItem('openuptimes-seen-intro');
    };
  }, []);

  // Handle completion of the intro animation
  const handleIntroComplete = () => {
    setShowIntroAnimation(false);
  };

  // Render different content based on current step
  const renderStepContent = () => {
    switch(step) {
      case 1:
        // Welcome & path selection step
        return (
          <SetupPathSelector
            paths={setupPaths}
            selectedPath={path}
            onSelect={handlePathSelect}
            isEdgeRuntime={isEdgeRuntime}
          />
        );
      case 2:
        // Password step
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Create an Admin Password</h2>
              <p className="text-sm text-muted-foreground">
                This password will be used to access the admin panel and manage your status page.
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Admin Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => updatePassword(e.target.value)}
                  placeholder="Enter a secure password"
                  className={`w-full ${password && !passwordValidation.length ? 'border-destructive' : ''}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => updateConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={`w-full ${confirmPassword && !passwordValidation.match ? 'border-destructive' : ''}`}
                />
              </div>
            </div>
            
            <div className="bg-muted/30 border border-border/50 rounded-md p-3 mt-2">
              <p className="text-xs font-medium text-foreground">Password requirements:</p>
              <ul className="mt-2 space-y-1.5 text-xs">
                <li className={`flex items-center ${passwordValidation.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <span className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${passwordValidation.length ? 'bg-green-100 text-green-600' : 'bg-muted'}`}>
                    {passwordValidation.length ? '✓' : '·'}
                  </span>
                  At least 8 characters long
                </li>
                <li className={`flex items-center ${passwordValidation.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <span className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${passwordValidation.number ? 'bg-green-100 text-green-600' : 'bg-muted'}`}>
                    {passwordValidation.number ? '✓' : '·'}
                  </span>
                  Contains at least one number
                </li>
                <li className={`flex items-center ${passwordValidation.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <span className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${passwordValidation.uppercase ? 'bg-green-100 text-green-600' : 'bg-muted'}`}>
                    {passwordValidation.uppercase ? '✓' : '·'}
                  </span>
                  Contains at least one uppercase letter
                </li>
                <li className={`flex items-center ${passwordValidation.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <span className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${passwordValidation.special ? 'bg-green-100 text-green-600' : 'bg-muted'}`}>
                    {passwordValidation.special ? '✓' : '·'}
                  </span>
                  Contains at least one special character
                </li>
                <li className={`flex items-center ${passwordValidation.match ? 'text-green-600' : confirmPassword ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <span className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                    passwordValidation.match ? 'bg-green-100 text-green-600' : 
                    confirmPassword ? 'bg-red-100 text-destructive' : 'bg-muted'
                  }`}>
                    {passwordValidation.match ? '✓' : confirmPassword ? '×' : '·'}
                  </span>
                  Passwords match
                </li>
              </ul>
            </div>
          </div>
        );
      case 3:
        // Site settings step
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Configure Your Site</h2>
              <p className="text-sm text-muted-foreground">
                Customize how your status page appears to visitors.
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName" className="text-sm font-medium">
                  Site Name
                </Label>
                <Input
                  id="siteName"
                  type="text"
                  value={siteName}
                  onChange={(e) => updateSiteSettings({ siteName: e.target.value })}
                  placeholder="OpenUptimes"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This name will be displayed in the header and browser title.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription" className="text-sm font-medium">
                  Site Description
                </Label>
                <Input
                  id="siteDescription"
                  type="text"
                  value={siteDescription}
                  onChange={(e) => updateSiteSettings({ siteDescription: e.target.value })}
                  placeholder="Service Status Monitor"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  A brief description of your status page's purpose.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refreshInterval" className="text-sm font-medium">
                  Refresh Interval (seconds)
                </Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  min="10"
                  max="300"
                  value={refreshInterval}
                  onChange={(e) => updateSiteSettings({ refreshInterval: Number(e.target.value) })}
                  placeholder="60"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How often the status page automatically refreshes. We recommend 60 seconds.
                </p>
              </div>
            </div>
          </div>
        );
      case 4:
        // Path specific setup
        return renderPathSetup();
      case 5:
        // Setup complete
        return (
          <div className="space-y-8 py-2 max-w-md mx-auto text-center">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-primary/10">
              <div className="absolute w-16 h-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Setup Complete!</h2>
              <p className="text-muted-foreground">Your status page is ready to monitor your services.</p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg border border-border text-left">
              <h3 className="font-medium mb-3 text-sm">Setup Summary</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">✓</span>
                  <span><span className="font-medium">Site:</span> {siteName}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">✓</span>
                  <span><span className="font-medium">Monitoring Type:</span> {path === 'github' ? 'GitHub Integration' : path === 'cron' ? 'Cron Job Monitoring' : 'Custom Integration'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">✓</span>
                  <span><span className="font-medium">Admin Account:</span> Created successfully</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3 pt-2">
              <a 
                href="/" 
                className="inline-flex items-center justify-center bg-primary text-primary-foreground shadow hover:bg-primary/90 py-2.5 px-4 rounded-md transition-colors"
              >
                View Status Page
              </a>
              <a 
                href="/admin" 
                className="inline-flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 py-2.5 px-4 rounded-md transition-colors"
              >
                Go to Admin Dashboard
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {showIntroAnimation && (
        <SetupIntroAnimation onComplete={handleIntroComplete} />
      )}
      
      {!showIntroAnimation && (
        <SetupContainer
          currentStep={step}
          totalSteps={SETUP_STEPS.length}
          onNext={step === 4 && path === 'github' ? handleNextWithGitHub : handleNext}
          onBack={step === 4 && path === 'github' ? handleBackWithGitHub : handleBack}
          isSubmitting={isSubmitting}
          error={error}
          isNextDisabled={(step === 1 && !path) || (step === 4 && path === 'github' && githubIsNextDisabledRef.current)}
          hideButtons={showIntroAnimation || step === 5}
        >
          {renderStepContent()}
        </SetupContainer>
      )}
    </>
  );
}

export default function SetupPage() {
  return (
    <SetupProvider>
      <SetupPageContent />
    </SetupProvider>
  );
} 