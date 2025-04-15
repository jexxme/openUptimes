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
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          }
        });
        
        if (pingResponse.ok) {
          console.log('Ping system bootstrapped successfully');
        } else {
          console.error('Failed to bootstrap ping system');
        }
      } catch (error) {
        console.error('Error bootstrapping ping system:', error);
      }
    };
    
    // Start the ping system
    initPingSystem();
    
    // Re-bootstrap every 15 minutes as a failsafe
    const interval = setInterval(initPingSystem, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <Component {...pageProps} />;
} 