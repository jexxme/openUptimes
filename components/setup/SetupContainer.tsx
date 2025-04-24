import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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
            <motion.div 
              className="relative mr-2"
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Image 
                src="/default-favicon.svg" 
                alt="OpenUptimes Logo" 
                width={32} 
                height={32}
                className="dark:logo-dark-mode" 
                style={logoStyle}
              />
            </motion.div>
            <motion.h1 
              className="text-xl font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              OpenUptimes
            </motion.h1>
          </div>
          
          {showProgress && (
            <motion.div 
              className="w-full max-w-xs mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: `${((currentStep - 2) / (totalSteps - 2)) * 100}%` }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Setup</span>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep - 1} of {totalSteps - 2}
                </span>
              </div>
            </motion.div>
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
        
        <motion.div
          layout
          transition={{
            layout: { duration: 0.3, ease: "easeOut" }
          }}
        >
          <Card className="shadow-lg border-border overflow-hidden">
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="bg-destructive/10 text-destructive p-4 border-b border-destructive/20 text-sm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            <CardContent className="p-6 pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </CardContent>
            
            {!hideButtons && (
              <motion.div
                layout
                transition={{ duration: 0.2 }}
              >
                <CardFooter className="flex p-6 pt-4 border-t border-border/50 mt-4">
                  <div className="grid grid-cols-2 w-full">
                    <div>
                      <AnimatePresence>
                        {currentStep > 1 && currentStep < totalSteps && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Button
                              onClick={onBack}
                              disabled={isSubmitting}
                              variant="outline"
                              size="default"
                            >
                              Back
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                        ) : currentStep === totalSteps ? (
                          "Finish Setup"
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}