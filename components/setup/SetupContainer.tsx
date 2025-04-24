import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';

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
  hideButtons?: boolean;
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
  hideStepInfo = false,
  hideButtons = false
}: SetupContainerProps) {
  const { theme } = useTheme();
  
  // Logo shadow styling based on theme
  const logoStyle = theme === 'dark' 
    ? { 
        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.15))',
        opacity: 0.95
      } 
    : {};
  
  // Precompute button text to avoid re-renders
  const nextButtonText = currentStep === totalSteps ? "Complete Setup" : "Continue";
  
  // Only show progress on steps 2, 3, and 4
  const showProgress = currentStep > 1 && currentStep < totalSteps;
  
  // Calculate progress percentage
  const progressPercentage = ((currentStep - 1) / (totalSteps - 2)) * 100;
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center mb-2">
            <div className="relative mr-2">
              <Image 
                src="/default-favicon.svg" 
                alt="OpenUptimes Logo" 
                width={32} 
                height={32}
                className="dark:logo-dark-mode" 
                style={logoStyle}
              />
            </div>
            <h1 className="text-xl font-medium">OpenUptimes</h1>
          </div>
          
          {showProgress && (
            <div className="w-full max-w-xs mt-1">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-in-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Setup</span>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep - 1} of {totalSteps - 2}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Links row between header and content */}
        <div className="flex justify-between items-center mb-3 w-full px-1">
          <Link 
            href="https://github.com/jexxme/openUptimes/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Help</span>
            <ExternalLink size={12} className="ml-1 opacity-70" />
          </Link>
          <ThemeToggle />
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
          
          {!hideButtons && (
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
          )}
        </Card>
      </div>
    </div>
  );
}