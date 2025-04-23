"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSetupStatus } from "../hooks/useSetupStatus";
import { SetupContainer } from "@/components/setup/SetupContainer";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { SetupPathSelector, SetupPath } from "@/components/setup/SetupPathSelector";
import { GithubIcon, ClockIcon, CustomIcon } from "@/components/setup/SetupIcons";
import { SetupProvider, useSetup } from "../context/SetupContext";
import { SETUP_STEPS } from "../utils/setupUtils";
import { SetupModeToggle } from "@/components/setup/SetupModeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { validatePassword, validatePasswordsMatch } from "../utils/setupUtils";
import dynamic from 'next/dynamic';

// Dynamically import the GitHub setup component
const GitHubSetup = dynamic(() => import('../../components/setup/github/GitHubSetup'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
  )
});

// Available setup paths
const SETUP_PATHS: SetupPath[] = [
  {
    id: 'github',
    title: 'GitHub Actions',
    description: 'Use GitHub Actions to monitor your services. Best for GitHub users who want an easy setup.',
    icon: <GithubIcon />,
    requiresEdgeRuntime: false,
  },
  {
    id: 'cron',
    title: 'Cron Jobs',
    description: 'Use built-in cron jobs for monitoring. Requires a non-Edge runtime environment.',
    icon: <ClockIcon />,
    requiresEdgeRuntime: false, // Actually requires !isEdgeRuntime, but we'll handle that in the component
  },
  {
    id: 'custom',
    title: 'Custom Integration',
    description: 'Set up a custom integration with your existing systems.',
    icon: <CustomIcon />,
    requiresEdgeRuntime: false,
  },
];

function SetupContent() {
  const router = useRouter();
  const { setupComplete, loading } = useSetupStatus();
  const { 
    step, 
    setStep, 
    path, 
    setPath, 
    isEdgeRuntime, 
    password, 
    confirmPassword,
    updatePassword,
    updateConfirmPassword,
    stepCompletion,
    markStepComplete,
    siteName,
    siteDescription,
    refreshInterval,
    updateSiteSettings,
    completeSetup,
    githubSettings,
  } = useSetup();
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    number: false,
    uppercase: false,
    special: false,
    match: false
  });
  
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
  
  // Use useEffect to handle redirection when setup is complete
  useEffect(() => {
    if (setupComplete === true && !loading) {
      router.push('/');
    }
  }, [setupComplete, loading, router]);
  
  // If still loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }
  
  // If setup is complete and we're still on this page, render nothing as we're about to redirect
  if (setupComplete === true) {
    return null;
  }
  
  function handleNext() {
    // Validation logic based on current step
    if (step === 1) {
      // Welcome step - validate path selection if required
      if (!path) {
        setError("Please select a setup path to continue");
        return;
      }
      
      setError(null);
      markStepComplete('welcome');
      setStep(2);
    } else if (step === 2) {
      // Password step - validate using passwordValidation state
      if (!passwordValidation.length || 
          !passwordValidation.number || 
          !passwordValidation.uppercase || 
          !passwordValidation.special || 
          !passwordValidation.match) {
        
        // Determine the specific error message based on what's missing
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
      
      setError(null);
      markStepComplete('password');
      setStep(3);
    } else if (step === 3) {
      // Site settings step - validate inputs if needed
      if (!siteName.trim()) {
        setError("Site name is required");
        return;
      }
      
      if (refreshInterval < 10) {
        setError("Refresh interval must be at least 10 seconds");
        return;
      }
      
      setError(null);
      markStepComplete('site-settings');
      setStep(4);
    } else if (step === 4) {
      // Path-specific setup validation
      if (path === 'github') {
        // Validate GitHub settings
        if (!githubSettings.repository) {
          setError("GitHub repository is required");
          return;
        }
        
        if (!githubSettings.apiKey) {
          setError("API key must be generated for GitHub integration");
          return;
        }
        
        // All validations passed
        setError(null);
      }
      
      // Mark the step as complete and proceed
      markStepComplete('path-setup');
      setStep(5);
    } else if (step === 5) {
      // Completion step - handle setup completion
      setIsSubmitting(true);
      
      completeSetup()
        .then((success) => {
          if (success) {
            markStepComplete('complete');
            // After a successful setup, we can redirect to the home page
            // The useEffect at the top will handle this once setupComplete becomes true
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
  }
  
  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }
  
  // Convert step format for progress component
  const progressSteps = SETUP_STEPS.map(step => ({
    key: step.key,
    label: step.label,
    completed: !!stepCompletion[step.key]
  }));
  
  return (
    <SetupContainer
      currentStep={step}
      totalSteps={SETUP_STEPS.length}
      onNext={handleNext}
      onBack={handleBack}
      isSubmitting={isSubmitting}
      error={error}
    >
      <SetupProgress 
        currentStep={step} 
        totalSteps={SETUP_STEPS.length} 
        steps={progressSteps} 
      />
      
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground">Welcome to OpenUptimes!</h2>
            <p className="text-sm text-muted-foreground">
              This wizard will help you set up your status page. Follow these steps to get started:
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-md p-4">
            <ul className="space-y-3">
              {[
                'Create an admin password to secure your dashboard',
                'Configure basic site settings for your status page',
                'Choose a monitoring approach that fits your needs'
              ].map((item, i) => (
                <li key={i} className="flex items-start">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mr-3 text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-1">
            <h3 className="text-base font-medium text-foreground">Choose a setup path</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select how you'd like to monitor your services:
            </p>
          </div>
          
          <SetupPathSelector
            paths={SETUP_PATHS}
            selectedPath={path}
            onSelect={(selectedPath) => setPath(selectedPath as 'github' | 'cron' | 'custom')}
            isEdgeRuntime={isEdgeRuntime}
          />
        </div>
      )}
      
      {step === 2 && (
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
      )}
      
      {/* Site Settings step (placeholder) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground">Configure Your Site</h2>
            <p className="text-sm text-muted-foreground">
              Customize how your status page appears to visitors.
            </p>
          </div>

          <Separator className="my-4" />
          
          <div className="space-y-5">
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
      )}
      
      {/* Path-specific Setup step (placeholder) */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground">
              {path === 'github' ? 'GitHub Setup' : 
               path === 'cron' ? 'Cron Jobs Setup' : 
               'Custom Integration Setup'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure your monitoring method.
            </p>
          </div>

          <Separator className="my-4" />
          
          <div className="grid gap-6">
            {path === 'github' ? (
              <GitHubSetup />
            ) : path === 'cron' ? (
              <div className="flex items-center justify-center p-8 border border-dashed border-border rounded-md bg-muted/30">
                <div className="text-center space-y-3">
                  <p className="text-base font-medium text-foreground">Cron Jobs Configuration</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This step will be implemented in the next phase of development.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-border rounded-md bg-muted/30">
                <div className="text-center space-y-3">
                  <p className="text-base font-medium text-foreground">Custom Integration Setup</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This step will be implemented in the next phase of development.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Completion step */}
      {step === 5 && (
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {isSubmitting ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            
            <h2 className="text-xl font-medium text-foreground">
              {isSubmitting ? "Finalizing Setup..." : "Setup Complete!"}
            </h2>
            
            <p className="text-sm text-muted-foreground max-w-md">
              {isSubmitting 
                ? "We're saving your preferences and configuring your status page."
                : "Your status page is now ready to use. You can log in to the admin panel to customize your services and settings at any time."
              }
            </p>
            
            {stepCompletion['complete'] && (
              <div className="flex flex-col items-center space-y-4 pt-4">
                <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-900 text-sm max-w-md">
                  <p className="font-medium">Setup completed successfully!</p>
                  <p className="mt-1">You'll be redirected to your new status page in a moment.</p>
                </div>
                
                <button
                  className="inline-flex items-center justify-center bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                  onClick={() => router.push('/')}
                >
                  Go to Dashboard Now
                </button>
              </div>
            )}
            
            {error && (
              <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-900 text-sm max-w-md">
                <p className="font-medium">Setup error</p>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </SetupContainer>
  );
}

export default function SetupPage() {
  return (
    <SetupProvider>
      <SetupContent />
      <SetupModeToggle />
    </SetupProvider>
  );
} 