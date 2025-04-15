import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
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
  
  return <Component {...pageProps} />;
} 