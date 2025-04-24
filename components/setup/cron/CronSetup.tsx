'use client';

import { useState, useEffect, MutableRefObject, ChangeEvent } from 'react';
import { useSetup } from '@/app/context/SetupContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import CronSelector from '@/app/components/CronSelector';
import { 
  CheckIcon, 
  InfoIcon, 
  ClockIcon,
  FileTextIcon,
  CalendarIcon,
  AlertCircleIcon
} from 'lucide-react';

interface CronSetupProps {
  onNext?: MutableRefObject<(() => void) | null>;
  onBack?: MutableRefObject<(() => void) | null>;
  isNextDisabled?: MutableRefObject<boolean>;
  isSubmitting?: boolean;
}

export default function CronSetup({ onNext, onBack, isNextDisabled, isSubmitting }: CronSetupProps) {
  const { 
    cronSettings,
    updateCronSettings,
    completeSetup,
    markStepComplete,
    setStep
  } = useSetup();

  // Using a numerical step approach for clearer flow
  const [setupStep, setSetupStep] = useState(1);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Job settings
  const [jobName, setJobName] = useState('System Status Check');
  const [jobDescription, setJobDescription] = useState('Regular health check for the system status');
  const [cronExpression, setCronExpression] = useState('*/5 * * * *');
  
  // Initialize from context if jobs exist (only once)
  useEffect(() => {
    if (!isInitialized && cronSettings.jobs && cronSettings.jobs.length > 0) {
      const firstJob = cronSettings.jobs[0];
      setJobName(firstJob.name);
      setJobDescription(firstJob.description || '');
      setCronExpression(firstJob.cronExpression);
      setIsInitialized(true);
    }
  }, [cronSettings.jobs, isInitialized]);
  
  // Update cron settings when job details change
  useEffect(() => {
    if (isInitialized) {
      const updatedJobs = [{
        name: jobName,
        description: jobDescription,
        cronExpression: cronExpression,
        enabled: true
      }];
      
      updateCronSettings({ jobs: updatedJobs });
    }
  }, [jobName, jobDescription, cronExpression, updateCronSettings, isInitialized]);
  
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
  
  // Handle completing setup
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
  
  // Update parent component's disabled state for next button
  useEffect(() => {
    if (isNextDisabled) {
      // The first step requires a job name
      if (setupStep === 1) {
        isNextDisabled.current = !jobName;
      } else {
        isNextDisabled.current = false;
      }
    }
  }, [setupStep, jobName, isNextDisabled]);
  
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
                Job Details
              </span>
            </div>
            <div className="w-1/3 text-xs text-center">
              <span className={setupStep >= 2 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Schedule
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
      
      {/* Step 1: Job Details */}
      {setupStep === 1 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <FileTextIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Create a Monitoring Job</h3>
                <p className="text-sm text-muted-foreground">
                  Set up a scheduled job that will regularly check your service status.
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
              <div className="flex">
                <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-blue-800 dark:text-blue-200">
                  This job will run on a schedule to update your status page. You can add more jobs after setup.
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobName" className="text-sm font-medium">Job Name</Label>
                <Input
                  id="jobName"
                  value={jobName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setJobName(e.target.value)}
                  placeholder="System Status Check"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setJobDescription(e.target.value)}
                  placeholder="Describe what this job monitors"
                  className="h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Step 2: Schedule Setup */}
      {setupStep === 2 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Set Your Schedule</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how often your monitoring job should run.
                </p>
              </div>
            </div>
            
            <div>
              <CronSelector
                value={cronExpression}
                onChange={setCronExpression}
                showDescription={true}
                showNextRun={true}
                minInterval={5}
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50 text-sm">
              <div className="flex">
                <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-blue-800 dark:text-blue-200">
                  We recommend checking every 5-15 minutes for most services. More frequent checks consume more resources.
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Step 3: Review and Finish */}
      {setupStep === 3 && (
        <Card className="p-5 border border-border">
          <div className="space-y-5">
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium mb-2">Review Your Monitoring Job</h3>
                <p className="text-sm text-muted-foreground">
                  Confirm the details of your scheduled job below.
                </p>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-md border border-border space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Job Name</h4>
                <p className="text-sm">{jobName}</p>
              </div>
              
              {jobDescription && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm">{jobDescription}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium mb-1">Schedule</h4>
                <div className="flex items-center">
                  <code className="bg-background border border-border text-xs px-2 py-1 rounded font-mono">
                    {cronExpression}
                  </code>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50 text-sm">
              <div className="flex">
                <AlertCircleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  The job will be created but won't start running until setup is complete. You can manage all your jobs from the admin dashboard later.
                </span>
              </div>
            </div>
            
            {setupError && (
              <div className="p-3 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded text-red-600 dark:text-red-400">
                {setupError}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 