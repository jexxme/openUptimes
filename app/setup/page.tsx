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
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
// Import setup components directly instead of using dynamic imports
import GitHubSetup from '@/components/setup/github/GitHubSetup';
import CronSetup from '@/components/setup/cron/CronSetup';

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
        'Not compatible with Edge Runtime deployments'
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
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SetupPathSelector
              paths={setupPaths}
              selectedPath={path}
              onSelect={handlePathSelect}
              isEdgeRuntime={isEdgeRuntime}
            />
          </motion.div>
        );
        
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <h1 className="text-xl font-medium text-foreground">Create admin password</h1>
                <p className="text-sm text-muted-foreground">
                  This password will be used to access the admin panel
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => updatePassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="new-password"
                  />
                </div>
                
                {/* Confirm Password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => updateConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                </div>
                
                {/* Password requirements checklist */}
                <div className="mt-4 space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Password must:</h3>
                  <ul className="space-y-1">
                    <li className="text-xs flex items-center">
                      <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full 
                        ${passwordValidation.length ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {passwordValidation.length ? '✓' : '·'}
                      </span>
                      Be at least 8 characters long
                    </li>
                    <li className="text-xs flex items-center">
                      <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full 
                        ${passwordValidation.number ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {passwordValidation.number ? '✓' : '·'}
                      </span>
                      Include at least one number
                    </li>
                    <li className="text-xs flex items-center">
                      <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full 
                        ${passwordValidation.uppercase ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {passwordValidation.uppercase ? '✓' : '·'}
                      </span>
                      Include at least one uppercase letter
                    </li>
                    <li className="text-xs flex items-center">
                      <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full 
                        ${passwordValidation.special ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {passwordValidation.special ? '✓' : '·'}
                      </span>
                      Include at least one special character
                    </li>
                    <li className="text-xs flex items-center">
                      <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full 
                        ${passwordValidation.match ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {passwordValidation.match ? '✓' : '·'}
                      </span>
                      Passwords match
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        );
        
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <h1 className="text-xl font-medium text-foreground">Site settings</h1>
                <p className="text-sm text-muted-foreground">
                  Customize your status page
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Site name field */}
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => updateSiteSettings({ siteName: e.target.value })}
                    placeholder="My Status Page"
                  />
                </div>
                
                {/* Site description field */}
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site description</Label>
                  <Input
                    id="siteDescription"
                    value={siteDescription}
                    onChange={(e) => updateSiteSettings({ siteDescription: e.target.value })}
                    placeholder="Current status of our services"
                  />
                  <p className="text-xs text-muted-foreground">
                    A brief description of your status page
                  </p>
                </div>
                
                {/* Refresh interval field */}
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Auto-refresh interval (seconds)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    min={10}
                    value={refreshInterval}
                    onChange={(e) => updateSiteSettings({ refreshInterval: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    How often the status page should automatically refresh (minimum 10 seconds)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
        
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderPathSetup()}
          </motion.div>
        );
        
      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="space-y-6 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mx-auto"
              >
                <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <CheckIcon className="h-10 w-10 text-primary" />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <h1 className="text-2xl font-semibold text-foreground">Setup Complete!</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Your status page is ready to use. Click the button below to finish and go to your dashboard.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex flex-col gap-3 pt-4 max-w-xs mx-auto"
              >
                <a 
                  href="/admin" 
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground shadow hover:bg-primary/90 py-2.5 px-4 rounded-md transition-colors"
                >
                  Go to Admin Dashboard
                </a>
                <a 
                  href="/" 
                  className="inline-flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 py-2.5 px-4 rounded-md transition-colors"
                >
                  View Status Page
                </a>
              </motion.div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };
  
  // Compute step data for progress display
  const stepItems = SETUP_STEPS.map(stepDef => ({
    key: stepDef.key,
    label: stepDef.label,
    completed: stepCompletion[stepDef.key] || false
  }));
  
  // Determine if the next button should be disabled for special steps
  const isNextButtonDisabled = () => {
    if (step === 4) {
      // If it's the GitHub path setup step, use the reference value
      if (path === 'github' && githubIsNextDisabledRef.current !== undefined) {
        return githubIsNextDisabledRef.current;
      }
      // If it's the Cron path setup step, use the reference value
      else if (path === 'cron' && cronIsNextDisabledRef.current !== undefined) {
        return cronIsNextDisabledRef.current;
      }
    }
    return false; // Default to enabled
  };
  
  // Handle if the current step requires a custom path but none is set
  const showPathWarning = step === 4 && !path;
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <AnimatePresence mode="wait">
      {showIntroAnimation ? (
        <SetupIntroAnimation onComplete={handleIntroComplete} />
      ) : (
        <SetupContainer
          currentStep={step}
          totalSteps={SETUP_STEPS.length}
          onNext={step === 4 && path === 'github' ? handleNextWithGitHub : handleNext}
          onBack={step === 4 && path === 'github' ? handleBackWithGitHub : handleBack}
          isSubmitting={isSubmitting}
          error={error}
          isNextDisabled={showPathWarning || isNextButtonDisabled()}
          hideButtons={step === 5}
        >
          {showPathWarning ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">Please go back and select a setup path.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </SetupContainer>
      )}
    </AnimatePresence>
  );
}

export default function SetupPage() {
  return (
    <SetupProvider>
      <SetupPageContent />
    </SetupProvider>
  );
} 