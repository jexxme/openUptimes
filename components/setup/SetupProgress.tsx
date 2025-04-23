import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckIcon } from 'lucide-react';

interface StepItem {
  key: string;
  label: string;
  completed: boolean;
}

interface SetupProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: StepItem[];
}

export function SetupProgress({ currentStep, totalSteps, steps }: SetupProgressProps) {
  // Calculate the number of completed steps
  const completedSteps = steps.filter(step => step.completed).length;
  
  // Calculate progress as a percentage of completed steps + current step progress
  // If current step is completed, it's counted in completedSteps
  // If not, we add a partial progress (0.5) for the current non-completed step
  const isCurrentStepCompleted = steps[currentStep - 1]?.completed || false;
  const progressValue = isCurrentStepCompleted
    ? (completedSteps / totalSteps) * 100
    : ((completedSteps + 0.5) / totalSteps) * 100;
  
  return (
    <div className="mb-6">
      {/* Progress indicator */}
      <div className="mb-4">
        <Progress value={progressValue} className="h-1.5" />
      </div>
      
      {/* Step indicators */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = step.completed || index + 1 < currentStep;
          
          return (
            <div key={step.key} className="flex flex-col items-center relative">
              <div 
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full transition-all
                  ${isActive 
                    ? 'ring-2 ring-primary/20 border border-primary bg-background text-foreground shadow-sm' 
                    : isCompleted 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'border border-border bg-muted/30 text-muted-foreground'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              
              <span 
                className={`
                  mt-1.5 text-center text-xs leading-tight font-medium truncate w-full
                  ${isActive 
                    ? 'text-foreground' 
                    : isCompleted 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                  }
                `}
              >
                <span className="hidden sm:block">{step.label}</span>
                <span className="block sm:hidden">{index + 1 === currentStep ? step.label : ''}</span>
              </span>
              
              {index < steps.length - 1 && (
                <div className="hidden sm:block absolute left-1/2 top-3.5 h-[1px] w-full z-[-1]">
                  <Separator 
                    className={`
                      w-full 
                      ${index < currentStep - 1 ? 'bg-primary/50' : 'bg-border'}
                    `} 
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 