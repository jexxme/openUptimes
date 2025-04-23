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
}

export function SetupContainer({
  currentStep,
  totalSteps,
  children,
  onNext,
  onBack,
  isSubmitting,
  error
}: SetupContainerProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center justify-center space-y-3">
          <div className="mb-2 flex items-center justify-center">
            <Image 
              src="/default-favicon.svg" 
              alt="OpenUptimes Logo" 
              width={48} 
              height={48}
              className="dark:logo-dark-mode" 
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">OpenUptimes Setup</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </CardDescription>
        </div>
        
        <Card className="shadow-subtle border-border overflow-hidden">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 border-b border-destructive/20 text-sm">
              {error}
            </div>
          )}
          
          <CardContent className="p-6 pt-6">
            {children}
          </CardContent>
          
          <CardFooter className="flex justify-between p-6 pt-0 border-t border-border/50 mt-4">
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
            
            <div className={currentStep === 1 ? 'w-full flex justify-end' : 'ml-auto'}>
              <Button
                onClick={onNext}
                disabled={isSubmitting}
                variant="default"
                size="default"
                className="hover-lift"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Processing...
                  </>
                ) : currentStep === totalSteps ? (
                  "Complete Setup"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 