import { useState, useEffect, useRef } from 'react';

// Default appearance settings to use when data is loading
const defaultAppearanceSettings = {
  logo: null,
  logoUrl: "",
  showServiceUrls: true,
  showServiceDescription: true,
  customCSS: "",
  customHeader: "",
  historyDays: 90, // Default history range in days
  copyrightUrl: "https://github.com/jexxme/openUptimes", // Default copyright URL
  copyrightText: "openUptimes" // Default copyright text
};

// Global cache for appearance settings
const appearanceCache = {
  data: null as any,
  timestamp: 0,
  // Longer TTL since appearance settings change less frequently
  TTL: 300000 // 5 minutes
};

export function useAppearanceSettings() {
  // Initialize with default values or cached data
  const [settings, setSettings] = useState<any>(
    appearanceCache.data || defaultAppearanceSettings
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false); // Moved outside useEffect

  useEffect(() => {
    isMountedRef.current = true;
    
    async function fetchSettings() {
      // Use cache if available and not expired
      const now = Date.now();
      if (appearanceCache.data && now - appearanceCache.timestamp < appearanceCache.TTL) {

        setSettings(appearanceCache.data);
        return;
      }
      
      // Skip if already loading
      if (loadingRef.current) return;
      
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/settings/appearance');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch appearance settings: ${response.status}`);
        }
        
        const data = await response.json();

        // Merge with default settings to ensure all properties exist
        const mergedData = { 
          ...defaultAppearanceSettings,
          ...data
        };

        // Update global cache
        appearanceCache.data = mergedData;
        appearanceCache.timestamp = Date.now();
        
        // Update state only if component is still mounted
        if (isMountedRef.current) {
          setSettings(mergedData);
        }
      } catch (err) {

        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
        loadingRef.current = false;
      }
    }
    
    fetchSettings();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - run only on mount

  return { settings, loading, error };
} 