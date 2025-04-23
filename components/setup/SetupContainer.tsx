import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';

interface SetupContainerProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error?: string | null;
  isNextDisabled?: boolean;
  hideStepInfo?: boolean;
}

export function SetupContainer({
  currentStep,
  totalSteps,
  children,
  onNext,
  onBack,
  isSubmitting,
  error,
  isNextDisabled,
  hideStepInfo = false
}: SetupContainerProps) {
  // Precompute button text to avoid re-renders
  const nextButtonText = currentStep === totalSteps ? "Complete Setup" : "Continue";
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-4">
            <Image 
              src="/default-favicon.svg" 
              alt="OpenUptimes Logo" 
              width={56} 
              height={56}
              className="dark:logo-dark-mode" 
            />
          </div>
          {!hideStepInfo && (
            <CardDescription className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </CardDescription>
          )}
        </div>
        
        <Card className="shadow-lg border-border overflow-hidden">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 border-b border-destructive/20 text-sm">
              {error}
            </div>
          )}
          
          <CardContent className="p-6 pt-6">
            {children}
          </CardContent>
          
          <CardFooter className="flex p-6 pt-4 border-t border-border/50 mt-4">
            <div className="grid grid-cols-2 w-full">
              <div>
                {currentStep > 1 && (
                  <Button
                    onClick={onBack}
                    disabled={isSubmitting}
                    variant="outline"
                    size="default"
                  >
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={onNext}
                  disabled={isSubmitting || isNextDisabled}
                  variant="default"
                  size="default"
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Processing
                    </span>
                  ) : nextButtonText}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 