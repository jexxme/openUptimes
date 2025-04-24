import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Progress 
            value={progressValue} 
            className="h-1.5" 
          />
        </motion.div>
      </div>
      
      {/* Step indicators */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = step.completed || index + 1 < currentStep;
          
          return (
            <div key={step.key} className="flex flex-col items-center relative">
              <motion.div 
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  boxShadow: isActive ? '0 0 0 4px rgba(var(--primary), 0.1)' : 'none'
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
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
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </motion.div>
                  ) : (
                    <motion.span 
                      key="number"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-medium"
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <motion.span 
                initial={false}
                animate={{ 
                  color: isActive ? 'var(--foreground)' : isCompleted ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: isActive ? 600 : 500
                }}
                transition={{ duration: 0.2 }}
                className={`
                  mt-1.5 text-center text-xs leading-tight truncate w-full
                `}
              >
                <span className="hidden sm:block">{step.label}</span>
                <AnimatePresence mode="wait">
                  {index + 1 === currentStep && (
                    <motion.span 
                      className="block sm:hidden"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {step.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              
              {index < steps.length - 1 && (
                <div className="hidden sm:block absolute left-1/2 top-3.5 h-[1px] w-full z-[-1]">
                  <motion.div
                    initial={false}
                    animate={{ backgroundColor: index < currentStep - 1 ? 'rgba(var(--primary), 0.5)' : 'var(--border)' }}
                    transition={{ duration: 0.4 }}
                  >
                    <Separator className="w-full" />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}