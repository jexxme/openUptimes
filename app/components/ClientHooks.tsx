'use client';

import { ReactNode, useEffect } from 'react';
import { CustomCSS } from './CustomCSS';
import { CustomHeader } from './CustomHeader';
import { RedisInitializer } from './RedisInitializer';
import { Toaster } from './ui/toaster';

// This component wraps all client-side functionality to keep the root layout as a server component
export function ClientHooks({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Bootstrap the ping system when the app starts
    const initPingSystem = async () => {
      try {
        // Call the edge-ping endpoint to start the self-sustaining ping cycle
        const pingResponse = await fetch('/api/edge-ping', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          }
        });
        
        if (!pingResponse.ok) {
          console.error('Failed to bootstrap ping system');
        }
      } catch (error) {
        console.error('Error bootstrapping ping system:', error);
      }
    };
    
    // Start the ping system
    initPingSystem();
    
    // Re-bootstrap every 5 minutes as a failsafe for development and production
    const interval = setInterval(initPingSystem, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <CustomCSS />
      <CustomHeader />
      <RedisInitializer />
      {children}
      <Toaster />
    </>
  );
} 