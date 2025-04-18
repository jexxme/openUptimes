"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import dynamic from 'next/dynamic';

// Import data hooks
import { useStatus } from "../hooks/useStatus";
import { useSetupStatus } from "../hooks/useSetupStatus";
import { useServicesConfig } from "../hooks/useServicesConfig";

// Import ShadCN UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar as UISidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; 
import { Progress } from "@/components/ui/progress";

// Import custom components
import { SidebarNav } from "../components/admin/SidebarNav";
import { PageTitle } from "../components/PageTitle";

// Admin content pages - Dynamically import with SSR disabled
const AdminDashboardPage = dynamic(() => import("../components/admin/pages/Dashboard").then(mod => mod.AdminDashboard), { ssr: false });
const AdminServicesPage = dynamic(() => import("../components/admin/pages/Services").then(mod => mod.AdminServices), { ssr: false });
const AdminStatusPage = dynamic(() => import("../components/admin/pages/StatusPage").then(mod => mod.AdminStatusPage), { ssr: false });
const AdminHistory = dynamic(() => import("../components/admin/pages/History").then(mod => mod.AdminHistory), { ssr: false });
const AdminSettingsPage = dynamic(() => import("../components/admin/pages/Settings").then(mod => mod.AdminSettings), { ssr: false });
const AdminAbout = dynamic(() => import("../components/admin/pages/About").then(mod => mod.AdminAbout), { ssr: false });

// Define types needed for the component
interface StatusHistoryItem {
  status: 'up' | 'down' | 'unknown';
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

// Create a client-only wrapper to prevent hydration issues
const AdminPageClient = ({ searchParams }: { searchParams?: Promise<{ tab?: string; service?: string }> }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
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
  
  // Track specifically which services have been loaded for the history dropdown
  const [historyServicesList, setHistoryServicesList] = useState<{
    name: string;
    currentStatus?: { status: 'up' | 'down' | 'unknown' };
    isDeleted?: boolean;
  }[]>([]);
  const [historyServicesLoaded, setHistoryServicesLoaded] = useState(false);
  
  // Setup status check
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();

  // Determine if this is a development environment
  const isDev = process.env.NODE_ENV === 'development';

  // Add ref to track unsaved changes callbacks from different content components
  const unsavedChangesCallbacksRef = useRef<Record<string, () => boolean>>({});

  // Function to register an unsaved changes callback
  const registerUnsavedChangesCallback = useCallback((key: string, callback: () => boolean) => {
    console.log(`[Admin] Registering callback for ${key}`);
    unsavedChangesCallbacksRef.current[key] = callback;
  }, []);

  // Function to check if there are any unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Check all registered callbacks
    const keys = Object.keys(unsavedChangesCallbacksRef.current);
    console.log(`[Admin] Checking unsaved changes, ${keys.length} callbacks registered:`, keys);
    
    for (const key in unsavedChangesCallbacksRef.current) {
      const callback = unsavedChangesCallbacksRef.current[key];
      if (callback && callback()) {
        console.log(`[Admin] Found unsaved changes in ${key}`);
        return true;
      }
    }
    return false;
  }, []);

  // Add a clearUnsavedChangesCallback function
  const clearUnsavedChangesCallback = useCallback((key?: string) => {
    if (key) {
      console.log(`[Admin] Clearing callback for ${key}`);
      if (unsavedChangesCallbacksRef.current[key]) {
        delete unsavedChangesCallbacksRef.current[key];
      }
    } else {
      console.log('[Admin] Clearing all callbacks');
      // Clear all callbacks
      unsavedChangesCallbacksRef.current = {};
    }
  }, []);

  // Check URL parameters on mount
  useEffect(() => {
    // Handle Promise-based searchParams
    const initFromSearchParams = async () => {
      if (searchParams) {
        try {
          const resolvedParams = await searchParams;
          
          // Log initial URL parameters
          console.log('[AdminPage] URL parameters detected:', { 
            tab: resolvedParams.tab, 
            service: resolvedParams.service,
            rawSearchParams: resolvedParams
          });
          
          // Update active tab based on URL
          if (resolvedParams.tab) {
            console.log(`[AdminPage] Setting active tab to: ${resolvedParams.tab}`);
            setActiveTab(resolvedParams.tab);
          }
        } catch (error) {
          console.error('[AdminPage] Error processing search params:', error);
        }
      }
    };
    
    initFromSearchParams();
  }, [searchParams]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log(`[AdminPage] Tab changed to: ${value}`);
    
    // Update URL with the new tab value
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      
      // Track current parameters before changing
      const currentService = url.searchParams.get('service');
      console.log(`[AdminPage] Current service parameter: ${currentService}`);
      
      // Set the new tab
      url.searchParams.set('tab', value);
      
      // Preserve service parameter when switching to services tab
      if (value === 'services' && currentService) {
        console.log(`[AdminPage] Preserving service parameter: ${currentService}`);
      } else if (value !== 'services') {
        // If switching to a different tab, remove service parameter
        url.searchParams.delete('service');
      }
      
      // Log the final URL parameters
      console.log(`[AdminPage] Updated URL parameters:`, Object.fromEntries(url.searchParams.entries()));
      
      // Update URL
      window.history.pushState({}, '', url.toString());
    }
    
    // Update active tab state
    setActiveTab(value);
  };

  // Save preloaded data in a ref to avoid rerenders on tab change
  const preloadedDataRef = useRef<{
    services: any[] | null;
    servicesConfig: any[] | null;
    statusPage: any | null;
    appearance: any | null;
    history: any[] | null;
    historyServices: any[] | null;
  }>({
    services: null,
    servicesConfig: null,
    statusPage: null,
    appearance: null,
    history: null,
    historyServices: null
  });

  // Preload logo during loading phase
  useEffect(() => {
    async function preloadLogo() {
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

  // Enhanced loading logic with progress tracking
  useEffect(() => {
    if (isLoaded) return;

    // Track loading progress
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
    } else if (setupLoading) {
      setLoadingState("Checking setup status...");
      setLoadingProgress(98);
    } else {
      // Do a final validation of all the preloaded data before showing content
      let dataValidationMessage = "";
      
      // Validate services data
      if (!servicesData || !Array.isArray(servicesData) || servicesData.length === 0 || 
          !servicesData.some(s => s && typeof s === 'object' && s.name)) {
        dataValidationMessage = "Service data validation failed, some features may be limited.";
        console.warn("Services data validation failed:", servicesData);
      }
      
      // Validate history data
      if (!historyData || !Array.isArray(historyData) || historyData.length === 0 || 
          !historyData.some(item => item && typeof item === 'object' && item.service && item.item)) {
        if (dataValidationMessage) {
          dataValidationMessage += " History data also failed validation.";
        } else {
          dataValidationMessage = "History data validation failed, some features may be limited.";
        }
        console.warn("History data validation failed:", historyData);
      }
      
      if (dataValidationMessage) {
        setLoadingState(dataValidationMessage);
      } else {
        setLoadingState("Data loaded successfully!");
      }
      
      setLoadingProgress(100);
      // Small delay before showing content to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isValidatingSession, logoPreloaded, statusPageDataLoaded, servicesDataLoaded, historyDataLoaded, setupLoading, servicesData, historyData]);

  // Update the preloadedDataRef with validated data
  useEffect(() => {
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
    
    // Update the preloaded data ref with validated data
    preloadedDataRef.current = {
      services: validServicesData,
      servicesConfig: validServicesConfigData,
      statusPage: validStatusPageData,
      appearance: validAppearanceData,
      history: validHistoryData,
      historyServices: validHistoryServicesList
    };
  }, [servicesData, servicesConfigData, statusPageData, appearanceData, historyData, historyServicesList]);

  // Ensure the session is valid on page load
  useEffect(() => {
    async function validateSession() {
      try {
        console.log("Validating session...");
        setLoadingState("Validating session...");
        setLoadingProgress(10);
        
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include' // Important to include cookies
        });
        
        console.log("Session validation response status:", response.status);
        
        if (!response.ok) {
          console.error('Session validation failed with status:', response.status);
          redirectToLogin();
          return;
        }
        
        const data = await response.json();
        console.log("Session validation data:", data);
        
        if (!data.valid) {
          console.log('Invalid session detected, redirecting to login');
          redirectToLogin();
          return;
        }
        
        console.log("Session is valid, continuing to load admin page");
        // Only proceed if session is valid
        setIsValidatingSession(false);
      } catch (error) {
        console.error("Session validation error:", error);
        redirectToLogin();
        return;
      }
    }
    
    function redirectToLogin() {
      // Add timestamp to prevent cache issues
      const redirectUrl = `/login?from=/admin&t=${Date.now()}`;
      console.log("Redirecting to login:", redirectUrl);
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

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      // Make the logout API call
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Important for including cookies
      });
      
      if (!response.ok) {
        throw new Error('Logout request failed');
      }
      
      // Add timestamp to prevent cache issues
      const redirectUrl = `/login?from=/admin&t=${Date.now()}`;
      
      // Use a delay to ensure cookies are properly cleared
      setTimeout(() => {
        // Force a full page reload to the login page
        window.location.href = redirectUrl;
      }, 500);
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
      
      // Fallback redirect if the API call fails
      window.location.href = '/login';
    }
  }

  // Pass preloaded data to components
  const logoProps = logoUrl ? { preloadedLogoUrl: logoUrl } : {};

  // For our navigation debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugTab = activeTab;
      (window as any).debugParams = searchParams;
      console.log('[AdminPage] Debug variables set. Check window.debugTab and window.debugParams');
    }
  }, [activeTab, searchParams]);

  if (!isLoaded || setupLoading || isValidatingSession) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <div className="w-full max-w-xs px-4 text-center">
          <div className="mb-4">
            <h1 className="text-xl font-semibold mb-1">OpenUptimes</h1>
          </div>
          
          <Progress value={loadingProgress} className="h-1.5 mb-2" />
          <p className="text-sm text-muted-foreground mt-2">{loadingState}</p>
        </div>
      </div>
    );
  }

  if (setupError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Setup Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-4">{setupError}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the appropriate content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case "dashboard":
        return <AdminDashboardPage 
          preloadedServices={preloadedDataRef.current.services} 
          preloadedStatusPageData={preloadedDataRef.current.statusPage}
          preloadedHistoryData={preloadedDataRef.current.history}
          setActiveTab={handleTabChange}
        />;
      case "services":
        return <AdminServicesPage 
          preloadedServices={preloadedDataRef.current.services}
          preloadedServicesConfig={preloadedDataRef.current.servicesConfig}
          setActiveTab={handleTabChange}
        />;
      case "statuspage":
        return <AdminStatusPage 
          preloadedStatusPageData={preloadedDataRef.current.statusPage}
          preloadedAppearanceData={preloadedDataRef.current.appearance}
          setActiveTab={handleTabChange}
          registerUnsavedChangesCallback={registerUnsavedChangesCallback}
        />;
      case "history":
        return <AdminHistory 
          preloadedHistory={preloadedDataRef.current.history}
          preloadedHistoryServices={preloadedDataRef.current.historyServices}
          setActiveTab={handleTabChange}
        />;
      case "settings":
        return <AdminSettingsPage 
          setActiveTab={handleTabChange}
          registerUnsavedChangesCallback={registerUnsavedChangesCallback}
        />;
      case "about":
        return <AdminAbout 
          setActiveTab={handleTabChange}
        />;
      default:
        return <AdminDashboardPage 
          preloadedServices={preloadedDataRef.current.services}
          preloadedStatusPageData={preloadedDataRef.current.statusPage}
          preloadedHistoryData={preloadedDataRef.current.history}
          setActiveTab={handleTabChange}
        />;
    }
  };

  // Get the title for the current tab
  const getTabTitle = () => {
    switch(activeTab) {
      case "dashboard":
        return "Overview";
      case "services":
        return "Services";
      case "statuspage":
        return "Status Page";
      case "history":
        return "Uptime History";
      case "settings":
        return "Settings";
      case "about":
        return "About";
      default:
        return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* Add PageTitle with preloaded data */}
        {isLoaded && preloadedDataRef.current.statusPage && (
          <PageTitle 
            statusPageTitle={preloadedDataRef.current.statusPage?.settings?.title || "Service Status"} 
          />
        )}
        
        {/* Sidebar for larger screens */}
        <UISidebar className="hidden md:block">
          <SidebarNav 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            handleLogout={handleLogout} 
            isLoggingOut={isLoggingOut} 
            hasUnsavedChanges={hasUnsavedChanges}
            clearUnsavedChangesCallback={clearUnsavedChangesCallback}
            {...logoProps}
          />
        </UISidebar>
        
        {/* Main content area */}
        <div className="flex w-full flex-col md:pl-0">
          <header className="h-16 border-b">
            <div className="flex h-16 items-center px-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="mr-2 md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SidebarNav 
                    activeTab={activeTab} 
                    setActiveTab={handleTabChange} 
                    handleLogout={handleLogout} 
                    isLoggingOut={isLoggingOut} 
                    hasUnsavedChanges={hasUnsavedChanges}
                    clearUnsavedChangesCallback={clearUnsavedChangesCallback}
                    {...logoProps}
                  />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold">OpenUptimes Admin</h1>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">{getTabTitle()}</h1>
                <p className="text-muted-foreground">Manage your OpenUptimes instance</p>
              </div>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// Create a page component that renders the client component
export default function Page({ searchParams }: { searchParams?: Promise<{ tab?: string; service?: string }> }) {
  const AdminPage = dynamic(() => Promise.resolve(AdminPageClient), { ssr: false });
  return <AdminPage searchParams={searchParams} />;
} 