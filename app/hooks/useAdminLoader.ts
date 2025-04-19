import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupStatus } from './useSetupStatus';

interface StatusHistoryItem {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface HistoryServiceItem {
  name: string;
  currentStatus?: { status: 'up' | 'down' | 'unknown' };
  isDeleted?: boolean;
}

interface PreloadedData {
  services: any[] | null;
  servicesConfig: any[] | null;
  statusPage: any | null;
  appearance: any | null;
  history: any[] | null;
  historyServices: any[] | null;
  loggerStatus: any | null;
  pingStats: any | null;
  generalSettings: any | null;
  githubSettings: any | null;
}

export function useAdminLoader() {
  // Only log initialization in development
  if (process.env.NODE_ENV === 'development') {
    console.log("[useAdminLoader] Hook initialized");
  }
  
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingState, setLoadingState] = useState("Initializing...");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreloaded, setLogoPreloaded] = useState(false);
  
  // Preloaded data states for different sections
  const [statusPageData, setStatusPageData] = useState<any>(null);
  const [appearanceData, setAppearanceData] = useState<any>(null);
  const [statusPageDataLoaded, setStatusPageDataLoaded] = useState(false);
  const [historyData, setHistoryData] = useState<{ service: string; item: StatusHistoryItem; isDeleted?: boolean }[]>([]);
  const [historyDataLoaded, setHistoryDataLoaded] = useState(false);
  const [servicesData, setServicesData] = useState<any>(null);
  const [servicesConfigData, setServicesConfigData] = useState<any>(null);
  const [servicesDataLoaded, setServicesDataLoaded] = useState(false);
  const [loggerStatusData, setLoggerStatusData] = useState<any>(null);
  const [pingStatsData, setPingStatsData] = useState<any>(null);
  const [systemDataLoaded, setSystemDataLoaded] = useState(false);
  const [generalSettingsData, setGeneralSettingsData] = useState<any>(null);
  const [generalSettingsLoaded, setGeneralSettingsLoaded] = useState(false);
  const [githubSettingsData, setGithubSettingsData] = useState<any>(null);
  const [githubSettingsLoaded, setGithubSettingsLoaded] = useState(false);
  
  // Track specifically which services have been loaded for the history dropdown
  const [historyServicesList, setHistoryServicesList] = useState<HistoryServiceItem[]>([]);
  const [historyServicesLoaded, setHistoryServicesLoaded] = useState(false);
  
  // Setup status check
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();

  // Reference to store preloaded data
  const preloadedDataRef = useRef<PreloadedData>({
    services: null,
    servicesConfig: null,
    statusPage: null,
    appearance: null,
    history: null,
    historyServices: null,
    loggerStatus: null,
    pingStats: null,
    generalSettings: null,
    githubSettings: null
  });

  // Preload logo during loading phase
  useEffect(() => {
    async function preloadLogo() {
      console.log("[useAdminLoader] Starting logo preload");
      try {
        setLoadingState("Loading resources...");
        setLoadingProgress(30);
        
        const response = await fetch('/api/settings/appearance');
        if (response.ok) {
          const data = await response.json();
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
            
            // Preload the image
            const img = new Image();
            img.onload = () => {
              setLogoPreloaded(true);
              setLoadingProgress(40);
              setLoadingState("Loading application data...");
            };
            img.onerror = () => {
              setLogoPreloaded(true); // Continue even if logo fails to load
              setLoadingProgress(40);
            };
            img.src = data.logoUrl;
          } else {
            setLogoPreloaded(true); // No logo to preload
            setLoadingProgress(40);
          }
        } else {
          setLogoPreloaded(true); // Continue even if API fails
          setLoadingProgress(40);
        }
      } catch (error) {
        console.error("Failed to preload logo:", error);
        setLogoPreloaded(true); // Continue even if there's an error
        setLoadingProgress(40);
      }
    }
    
    if (isValidatingSession === false && !isLoaded) {
      console.log("[useAdminLoader] Session validated, beginning preloading sequence");
      preloadLogo();
    }
  }, [isValidatingSession, isLoaded]);

  // Preload Status Page and Appearance data
  useEffect(() => {
    async function preloadStatusPageData() {
      try {
        setLoadingState("Loading status page data...");
        setLoadingProgress(50);
        
        // Fetch Status Page data
        const statusPageResponse = await fetch('/api/settings/statuspage');
        if (statusPageResponse.ok) {
          const statusData = await statusPageResponse.json();
          setStatusPageData(statusData);
        }
        
        // Fetch Appearance data
        const appearanceResponse = await fetch('/api/settings/appearance');
        if (appearanceResponse.ok) {
          const appearanceData = await appearanceResponse.json();
          setAppearanceData(appearanceData);
        }
        
        setStatusPageDataLoaded(true);
        setLoadingProgress(60);
        setLoadingState("Almost ready...");
      } catch (error) {
        console.error("Failed to preload status page data:", error);
        // Continue even if there's an error
        setStatusPageDataLoaded(true);
        setLoadingProgress(60);
      }
    }
    
    if (logoPreloaded && !statusPageDataLoaded && !isLoaded) {
      preloadStatusPageData();
    }
  }, [logoPreloaded, statusPageDataLoaded, isLoaded]);

  // Preload services data
  useEffect(() => {
    async function preloadServicesData() {
      try {
        setLoadingState("Loading services data...");
        setLoadingProgress(70);
        
        // Fetch services status data with basic error handling
        try {
          const servicesResponse = await fetch('/api/status?filterByVisibility=false');
          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            setServicesData(servicesData);
          } else {
            console.error(`Failed to preload services status: ${servicesResponse.status}`);
          }
        } catch (error) {
          console.error("Error preloading services status:", error);
        }
        
        // Fetch services configuration with retry logic
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            const servicesConfigResponse = await fetch('/api/services', {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (servicesConfigResponse.ok) {
              const configData = await servicesConfigResponse.json();
              setServicesConfigData(configData);
              break; // Success, exit the retry loop
            } else if (servicesConfigResponse.status >= 500) {
              // Server error, retry
              console.warn(`Server error (${servicesConfigResponse.status}) when fetching service config. Retrying...`);
              retries++;
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 5000)));
            } else {
              // Client error, don't retry
              console.error(`Failed to preload services config: ${servicesConfigResponse.status}`);
              break;
            }
          } catch (error) {
            console.error("Error preloading services config:", error);
            retries++;
            if (retries >= maxRetries) break;
            // Exponential backoff for network errors
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 5000)));
          }
        }
        
        setServicesDataLoaded(true);
        setLoadingProgress(80);
      } catch (error) {
        console.error("Failed to preload services data:", error);
        // Continue even if there's an error
        setServicesDataLoaded(true);
        setLoadingProgress(80);
      }
    }
    
    if (statusPageDataLoaded && !servicesDataLoaded && !isLoaded) {
      preloadServicesData();
    }
  }, [statusPageDataLoaded, servicesDataLoaded, isLoaded]);

  // Preload history data during loading phase
  useEffect(() => {
    async function preloadHistoryData() {
      try {
        setLoadingState("Loading history data...");
        setLoadingProgress(90);
        
        // Fetch services first to ensure we have proper service data for the dropdown
        let servicesList = servicesData;
        
        // If services data is empty or invalid, fetch it again with includeDeleted=true
        if (!servicesList || !Array.isArray(servicesList) || servicesList.length === 0 || 
            !servicesList.some(s => s && typeof s === 'object' && s.name)) {
          try {
            setLoadingState("Refreshing services data for history...");
            const servicesResponse = await fetch('/api/services?includeDeleted=true', {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (servicesResponse.ok) {
              servicesList = await servicesResponse.json();
              // Update the services data
              setServicesData(servicesList);
              
              // Extract just what we need for the history dropdown
              if (Array.isArray(servicesList)) {
                const historyServices = servicesList.map(service => ({
                  name: service.name,
                  currentStatus: service.currentStatus || { status: 'unknown' },
                  isDeleted: service.isDeleted || false
                }));
                setHistoryServicesList(historyServices);
                setHistoryServicesLoaded(true);
              }
            }
          } catch (error) {
            console.error("Failed to refresh services data for history:", error);
          }
        } else if (Array.isArray(servicesList)) {
          // Extract services info from existing data
          const historyServices = servicesList.map(service => ({
            name: service.name,
            currentStatus: service.currentStatus || { status: 'unknown' },
            isDeleted: service.isDeleted || false
          }));
          setHistoryServicesList(historyServices);
          setHistoryServicesLoaded(true);
        }
        
        setLoadingState("Loading history records...");
        
        // Fetch history with default settings (30m time range, 50 entries)
        const url = new URL('/api/history', window.location.origin);
        url.searchParams.append('timeRange', '30m');
        url.searchParams.append('includeDeleted', 'true');
        
        const response = await fetch(url.toString(), {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          let data = await response.json();
          
          // If data is empty or invalid, wait and try again
          if (!data || !Array.isArray(data) || data.length === 0) {
            setLoadingState("Waiting for history data to be available...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const retryResponse = await fetch(url.toString(), {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              data = retryData;
            }
          }
          
          // Process data into a flat array for display
          let allHistory: { service: string; item: any; isDeleted?: boolean }[] = [];
          
          if (data && Array.isArray(data)) {
            data.forEach((service: { name: string; history: any[]; isDeleted?: boolean }) => {
              if (service && service.name && Array.isArray(service.history)) {
                service.history.forEach(item => {
                  if (item && typeof item === 'object' && item.status && item.timestamp) {
                    allHistory.push({ 
                      service: service.name, 
                      item,
                      isDeleted: service.isDeleted || false
                    });
                  }
                });
              }
            });
            
            // Sort by timestamp descending (newest first)
            allHistory.sort((a, b) => b.item.timestamp - a.item.timestamp);
            
            // Limit to 50 entries for preloading
            allHistory = allHistory.slice(0, 50);
            
            // Validate the data by checking if it has the required fields
            const isValidHistoryData = allHistory.length > 0 && 
              allHistory.every(item => 
                item.service && 
                item.item && 
                item.item.status && 
                item.item.timestamp
              );
              
            if (isValidHistoryData) {
              setHistoryData(allHistory);
              setLoadingState("History data loaded successfully");
            } else {
              console.warn("Invalid history data format:", allHistory.slice(0, 2));
              setLoadingState("History data format is incorrect, will reload when needed");
            }
          }
        } else {
          console.error(`Failed to load history: ${response.status}`);
          setLoadingState("Failed to load history data, continuing anyway...");
        }
        
        setHistoryDataLoaded(true);
        setLoadingProgress(95);
      } catch (error) {
        console.error("Failed to preload history data:", error);
        // Continue even if there's an error
        setHistoryDataLoaded(true);
        setLoadingProgress(95);
        setLoadingState("Error loading history data, continuing anyway...");
      }
    }
    
    if (servicesDataLoaded && !historyDataLoaded && !isLoaded) {
      preloadHistoryData();
    }
  }, [servicesDataLoaded, historyDataLoaded, isLoaded, servicesData]);

  // Preload system and logger status data
  useEffect(() => {
    async function preloadSystemData() {
      console.log("[useAdminLoader] Starting system data preload");
      try {
        setLoadingState("Loading system data...");
        setLoadingProgress(97);
        
        // Fetch logger status data
        try {
          console.log("[useAdminLoader] Fetching logger status");
          const loggerResponse = await fetch('/api/ping?action=status');
          if (loggerResponse.ok) {
            const loggerData = await loggerResponse.json();
            console.log("[useAdminLoader] Logger status loaded successfully");
            setLoggerStatusData(loggerData);
          } else {
            console.error(`[useAdminLoader] Failed to preload logger status: ${loggerResponse.status}`);
          }
        } catch (error) {
          console.error("[useAdminLoader] Error preloading logger status:", error);
        }
        
        // Fetch ping stats data
        try {
          console.log("[useAdminLoader] Fetching ping stats");
          const pingStatsResponse = await fetch('/api/ping-stats');
          if (pingStatsResponse.ok) {
            const pingStatsData = await pingStatsResponse.json();
            console.log("[useAdminLoader] Ping stats loaded successfully:", pingStatsData ? "Data received" : "No data");
            setPingStatsData(pingStatsData);
          } else {
            console.error(`[useAdminLoader] Failed to preload ping stats: ${pingStatsResponse.status}`);
          }
        } catch (error) {
          console.error("[useAdminLoader] Error preloading ping stats:", error);
        }
        
        setSystemDataLoaded(true);
        setLoadingProgress(98);
        console.log("[useAdminLoader] System data preload complete");
      } catch (error) {
        console.error("[useAdminLoader] Failed to preload system data:", error);
        // Continue even if there's an error
        setSystemDataLoaded(true);
        setLoadingProgress(98);
      }
    }
    
    if (historyDataLoaded && !systemDataLoaded && !isLoaded) {
      preloadSystemData();
    }
  }, [historyDataLoaded, systemDataLoaded, isLoaded]);

  // Preload general settings data
  useEffect(() => {
    async function preloadGeneralSettings() {
      console.log("[useAdminLoader] Starting general settings preload");
      try {
        setLoadingState("Loading general settings...");
        setLoadingProgress(99);
        
        // Fetch general settings data
        try {
          console.log("[useAdminLoader] Fetching general settings");
          const settingsResponse = await fetch('/api/settings');
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            console.log("[useAdminLoader] General settings loaded successfully");
            setGeneralSettingsData(settingsData);
          } else {
            console.error(`[useAdminLoader] Failed to preload general settings: ${settingsResponse.status}`);
          }
        } catch (error) {
          console.error("[useAdminLoader] Error preloading general settings:", error);
        }
        
        setGeneralSettingsLoaded(true);
        setLoadingProgress(100);
        console.log("[useAdminLoader] General settings preload complete");
      } catch (error) {
        console.error("[useAdminLoader] Failed to preload general settings:", error);
        // Continue even if there's an error
        setGeneralSettingsLoaded(true);
        setLoadingProgress(100);
      }
    }
    
    if (systemDataLoaded && !generalSettingsLoaded && !isLoaded) {
      preloadGeneralSettings();
    }
  }, [systemDataLoaded, generalSettingsLoaded, isLoaded]);

  // Preload GitHub settings data
  useEffect(() => {
    async function preloadGithubSettings() {
      console.log("[useAdminLoader] Starting GitHub settings preload");
      try {
        setLoadingState("Loading GitHub settings...");
        
        // Fetch GitHub settings directly - no longer dependent on generalSettings
        try {
          console.log("[useAdminLoader] Fetching GitHub settings");
          const githubResponse = await fetch('/api/settings/github');
          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            console.log("[useAdminLoader] GitHub settings loaded successfully");
            setGithubSettingsData(githubData);
          } else {
            console.error(`[useAdminLoader] Failed to preload GitHub settings: ${githubResponse.status}`);
          }
        } catch (error) {
          console.error("[useAdminLoader] Error preloading GitHub settings:", error);
        }
        
        setGithubSettingsLoaded(true);
        console.log("[useAdminLoader] GitHub settings preload complete");
      } catch (error) {
        console.error("[useAdminLoader] Failed to preload GitHub settings:", error);
        // Continue even if there's an error
        setGithubSettingsLoaded(true);
      }
    }
    
    // Run after system data is loaded, not dependent on general settings anymore
    if (systemDataLoaded && !githubSettingsLoaded && !isLoaded) {
      preloadGithubSettings();
    }
  }, [systemDataLoaded, githubSettingsLoaded, isLoaded]);

  // Enhanced loading logic with progress tracking
  useEffect(() => {
    if (isLoaded) return;

    // Avoid excessive logging
    const loadProgress = () => {
      if (isValidatingSession) {
        setLoadingState("Validating session...");
        setLoadingProgress(10);
      } else if (!logoPreloaded) {
        // Wait for logo to preload (handled in the other effect)
      } else if (!statusPageDataLoaded) {
        // Wait for status page data to load (handled in the preloadStatusPageData effect)
      } else if (!servicesDataLoaded) {
        // Wait for services data to load (handled in the preloadServicesData effect)
      } else if (!historyDataLoaded) {
        // Wait for history data to load (handled in the preloadHistoryData effect)
      } else if (!systemDataLoaded) {
        // Wait for system data to load (handled in the preloadSystemData effect)
      } else if (!generalSettingsLoaded) {
        // Wait for general settings to load (handled in the preloadGeneralSettings effect)
      } else if (!githubSettingsLoaded) {
        // Wait for GitHub settings to load (handled in the preloadGithubSettings effect)
        // This now runs independently of general settings
      } else if (setupLoading) {
        setLoadingState("Checking setup status...");
        setLoadingProgress(99);
      } else {
        // Do a final validation of all the preloaded data before showing content
        console.log("[useAdminLoader] All data loaded, preparing UI");
        
        // Show data loaded message
        setLoadingState("Data loaded successfully!");
        setLoadingProgress(100);
        
        // Small delay before showing content to ensure smooth transition
        const timer = setTimeout(() => {
          setIsLoaded(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    };
    
    loadProgress();
  }, [
    isLoaded, isValidatingSession, logoPreloaded, statusPageDataLoaded, 
    servicesDataLoaded, historyDataLoaded, systemDataLoaded, 
    generalSettingsLoaded, githubSettingsLoaded, setupLoading
  ]);

  // Update the preloadedDataRef with validated data
  useEffect(() => {
    if (!isLoaded) {
      // Skip excessive logging to reduce console spam
      
      // Validate services data
      const validServicesData = servicesData && 
        Array.isArray(servicesData) && 
        servicesData.length > 0 && 
        servicesData.some(s => s && typeof s === 'object' && s.name)
          ? servicesData 
          : null;
          
      // Validate services config data
      const validServicesConfigData = servicesConfigData && 
        Array.isArray(servicesConfigData) && 
        servicesConfigData.length > 0
          ? servicesConfigData 
          : null;
          
      // Validate history data
      const validHistoryData = historyData && 
        Array.isArray(historyData) && 
        historyData.length > 0 && 
        historyData.some(item => item && typeof item === 'object' && item.service && item.item)
          ? historyData 
          : null;
          
      // Validate history services list for dropdown
      const validHistoryServicesList = historyServicesList && 
        Array.isArray(historyServicesList) && 
        historyServicesList.length > 0
          ? historyServicesList 
          : null;
          
      // Validate status page data
      const validStatusPageData = statusPageData && 
        typeof statusPageData === 'object'
          ? statusPageData 
          : null;
          
      // Validate appearance data
      const validAppearanceData = appearanceData && 
        typeof appearanceData === 'object'
          ? appearanceData 
          : null;

      // Validate logger status data  
      const validLoggerStatusData = loggerStatusData && 
        typeof loggerStatusData === 'object'
          ? loggerStatusData 
          : null;
          
      // Validate ping stats data
      const validPingStatsData = pingStatsData && 
        typeof pingStatsData === 'object'
          ? pingStatsData 
          : null;
          
      // Validate general settings data
      const validGeneralSettingsData = generalSettingsData && 
        typeof generalSettingsData === 'object'
          ? generalSettingsData 
          : null;
          
      // Validate GitHub settings data
      const validGithubSettingsData = githubSettingsData && 
        typeof githubSettingsData === 'object'
          ? githubSettingsData 
          : null;
      
      // Update the preloaded data ref with validated data
      preloadedDataRef.current = {
        services: validServicesData,
        servicesConfig: validServicesConfigData,
        statusPage: validStatusPageData,
        appearance: validAppearanceData,
        history: validHistoryData,
        historyServices: validHistoryServicesList,
        loggerStatus: validLoggerStatusData,
        pingStats: validPingStatsData,
        generalSettings: validGeneralSettingsData,
        githubSettings: validGithubSettingsData
      };
      
      // Only log in development to reduce console spam
      if (process.env.NODE_ENV === 'development') {
        console.log("[useAdminLoader] Data reference updated", {
          hasServices: !!validServicesData,
          hasServicesConfig: !!validServicesConfigData,
          hasStatusPage: !!validStatusPageData,
          hasAppearance: !!validAppearanceData,
          hasHistory: !!validHistoryData,
          hasHistoryServices: !!validHistoryServicesList,
          hasLoggerStatus: !!validLoggerStatusData,
          hasPingStats: !!validPingStatsData,
          hasGeneralSettings: !!validGeneralSettingsData,
          hasGithubSettings: !!validGithubSettingsData
        });
      }
    }
  }, [
    servicesData, servicesConfigData, statusPageData, appearanceData, 
    historyData, historyServicesList, loggerStatusData, pingStatsData, 
    generalSettingsData, githubSettingsData, isLoaded
  ]);

  // Ensure the session is valid on page load
  useEffect(() => {
    async function validateSession() {
      try {
        setLoadingState("Validating session...");
        setLoadingProgress(10);
        
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include' // Important to include cookies
        });
        
        if (!response.ok) {
          console.error('[useAdminLoader] Session validation failed:', response.status);
          redirectToLogin();
          return;
        }
        
        const data = await response.json();
        
        if (!data.valid) {
          console.log('[useAdminLoader] Invalid session detected, redirecting to login');
          redirectToLogin();
          return;
        }
        
        // Only proceed if session is valid
        setIsValidatingSession(false);
      } catch (error) {
        console.error("[useAdminLoader] Session validation error:", error);
        redirectToLogin();
        return;
      }
    }
    
    function redirectToLogin() {
      // Add timestamp to prevent cache issues
      const redirectUrl = `/login?from=/admin&t=${Date.now()}`;
      console.log("[useAdminLoader] Redirecting to login:", redirectUrl);
      window.location.href = redirectUrl;
    }
    
    validateSession();
  }, []);

  // Redirect to setup if not complete
  useEffect(() => {
    if (setupComplete === false && !setupLoading && !isValidatingSession) {
      router.push('/setup');
    }
  }, [setupComplete, setupLoading, router, isValidatingSession]);

  // Return hook values with minimal logging
  const hookResult = {
    // Loading state
    isLoaded,
    isValidatingSession,
    loadingProgress,
    loadingState,
    setupLoading,
    setupError,
    logoUrl,
    
    // Preloaded data
    preloadedData: preloadedDataRef.current
  };
  
  // Log only in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("[useAdminLoader] Returning hook data", {
      isLoaded: hookResult.isLoaded,
      hasPreloadedData: !!hookResult.preloadedData.services
    });
  }
  
  return hookResult;
} 