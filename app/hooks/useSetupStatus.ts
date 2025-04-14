"use client";

import { useState, useEffect } from 'react';

export function useSetupStatus() {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/setup/status');
        
        if (!response.ok) {
          throw new Error('Failed to check setup status');
        }
        
        const data = await response.json();
        setSetupComplete(data.setupComplete);
      } catch (err) {
        console.error('Error checking setup status:', err);
        setError('Failed to check setup status');
      } finally {
        setLoading(false);
      }
    }
    
    checkSetupStatus();
  }, []);
  
  return { setupComplete, loading, error };
} 