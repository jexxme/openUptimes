"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/app/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SetupIntroAnimationProps {
  onComplete: () => void;
}

export function SetupIntroAnimation({ onComplete }: SetupIntroAnimationProps) {
  const { theme } = useTheme();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Duration settings (in seconds) - shorter and more subtle
  const logoRevealDuration = 0.7;
  const titleRevealDuration = 0.6;
  const welcomeDuration = 0.5;
  const fadeOutDuration = 0.5;
  const totalDuration = 2.8; // Shorter total animation time
  
  // Initialize animation on mount
  useEffect(() => {
    // Short delay to ensure component is fully mounted
    const initTimer = setTimeout(() => {
      setIsAnimating(true);
    }, 100);
    
    return () => clearTimeout(initTimer);
  }, []);
  
  // Auto-complete animation after set duration
  useEffect(() => {
    if (!isAnimating) return;
    
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      
      // Slight delay after animation completes before calling onComplete
      setTimeout(() => {
        onComplete();
      }, fadeOutDuration * 1000);
    }, totalDuration * 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete, isAnimating, totalDuration, fadeOutDuration]);
  
  // Logo should have a light shadow in dark mode - more subtle
  const logoShadow = theme === 'dark' 
    ? { filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.15))' }
    : {};
    
  // Shine effect gradient based on theme
  const shineGradient = theme === 'dark'
    ? 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%)';
  
  // Nice bezier curves for premium feel
  const premiumEaseIn = [0.4, 0, 0.2, 1];
  const premiumEaseOut = [0.16, 1, 0.3, 1];
  const premiumEaseInOut = [0.65, 0, 0.35, 1];
  
  return (
    <AnimatePresence mode="wait">
      {!animationComplete && (
        <motion.div
          key="intro-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: fadeOutDuration, ease: premiumEaseIn } }}
          className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-background"
        >
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Logo animation - with shine effect */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ 
                duration: logoRevealDuration, 
                ease: premiumEaseOut
              }}
              className="relative"
              style={logoShadow}
            >
              <div className="relative">
                <Image 
                  src="/default-favicon.svg" 
                  alt="OpenUptimes Logo" 
                  width={72} 
                  height={72}
                  className="mb-3" 
                  priority
                />
                
                {/* Shine effect overlay */}
                <motion.div 
                  className="absolute inset-0 mb-3 overflow-hidden rounded-xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={isAnimating ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={{ x: '-100%' }}
                    animate={isAnimating ? { x: '100%' } : { x: '-100%' }}
                    transition={{ 
                      duration: 1.2, 
                      delay: 0.7, 
                      ease: premiumEaseInOut
                    }}
                    style={{ 
                      background: shineGradient
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
            
            {/* Title animation - with better bezier curve */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ 
                duration: titleRevealDuration,
                delay: logoRevealDuration * 0.8,
                ease: premiumEaseOut
              }}
              className="text-center"
            >
              <h1 className="text-2xl font-medium tracking-tight text-foreground mb-2">
                OpenUptimes
              </h1>
              
              {/* Welcome message - with better bezier curve */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={isAnimating ? { opacity: 1 } : { opacity: 0 }}
                transition={{ 
                  duration: welcomeDuration,
                  delay: logoRevealDuration * 0.8 + titleRevealDuration * 0.7,
                  ease: premiumEaseOut
                }}
                className="text-base text-muted-foreground"
              >
                Welcome to your new status page
              </motion.p>
            </motion.div>
          </div>
          
          {/* Simple loading indicator with better animation */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={isAnimating ? { opacity: 0.6 } : { opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.5, ease: premiumEaseIn }}
            className="absolute bottom-16"
          >
            <div className="w-12 h-[2px] bg-primary/25 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary/40 rounded-full"
                initial={{ width: '0%' }}
                animate={isAnimating ? { width: '100%' } : { width: '0%' }}
                transition={{ 
                  duration: 2.2,
                  ease: premiumEaseInOut
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}