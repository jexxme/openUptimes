"use client";

import { useEffect, useState } from 'react';

export function RedisInitializer() {
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    const initializeRedis = async () => {
      try {
        setInitStatus('loading');
        const response = await fetch('/api/init');
        
        if (!response.ok) {
          throw new Error('Failed to initialize Redis');
        }
        
        const data = await response.json();
        console.log('Redis initialization result:', data);
        setInitStatus('success');
      } catch (error) {
        console.error('Error initializing Redis:', error);
        setInitStatus('error');
      }
    };
    
    initializeRedis();
  }, []);
  
  // This component doesn't render anything visible
  return null;
} 