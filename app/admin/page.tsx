"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

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

// Admin content pages
import { AdminDashboard } from "../components/admin/pages/Dashboard";
import { AdminServices } from "../components/admin/pages/Services";
import { AdminStatusPage } from "../components/admin/pages/StatusPage";
import { AdminHistory } from "../components/admin/pages/History";
import { AdminSettings } from "../components/admin/pages/Settings";

export default function AdminPage() {
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
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyDataLoaded, setHistoryDataLoaded] = useState(false);
  const [servicesData, setServicesData] = useState<any>(null);
  const [servicesConfigData, setServicesConfigData] = useState<any>(null);
  const [servicesDataLoaded, setServicesDataLoaded] = useState(false);
  
  // Setup status check
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();

  // Handle URL parameters on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      
      // Set the active tab based on URL parameter
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);
  
  // Update URL when active tab changes
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.pushState({}, '', url.toString());
    }
  }, [activeTab, isLoaded]);

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
          const servicesResponse = await fetch('/api/status');
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
        
        // Fetch history with default settings (30m time range, 50 entries)
        const url = new URL('/api/history', window.location.origin);
        url.searchParams.append('timeRange', '30m');
        
        const response = await fetch(url.toString());
        
        if (response.ok) {
          const data = await response.json();
          
          // Process data into a flat array for display
          let allHistory: { service: string; item: any }[] = [];
          
          data.forEach((service: { name: string; history: any[] }) => {
            service.history.forEach(item => {
              allHistory.push({ service: service.name, item });
            });
          });
          
          // Sort by timestamp descending (newest first)
          allHistory.sort((a, b) => b.item.timestamp - a.item.timestamp);
          
          // Limit to 50 entries
          allHistory = allHistory.slice(0, 50);
          
          setHistoryData(allHistory);
        }
        
        setHistoryDataLoaded(true);
        setLoadingProgress(95);
      } catch (error) {
        console.error("Failed to preload history data:", error);
        // Continue even if there's an error
        setHistoryDataLoaded(true);
        setLoadingProgress(95);
      }
    }
    
    if (servicesDataLoaded && !historyDataLoaded && !isLoaded) {
      preloadHistoryData();
    }
  }, [servicesDataLoaded, historyDataLoaded, isLoaded]);

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
      setLoadingProgress(100);
      // Small delay before showing content to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isValidatingSession, logoPreloaded, statusPageDataLoaded, servicesDataLoaded, historyDataLoaded, setupLoading]);

  // Ensure the session is valid on page load
  useEffect(() => {
    async function validateSession() {
      if (process.env.NODE_ENV === 'production') {
        try {
          const response = await fetch('/api/auth/validate');
          const data = await response.json();
          
          if (!data.valid) {
            // Add timestamp to prevent cache issues
            window.location.href = `/login?from=/admin&t=${Date.now()}`;
            return;
          }
        } catch (error) {
          console.error("Session validation error:", error);
          // If we can't validate, let the user stay on the page
        }
      }
      
      // Set loaded state when validation is complete
      setIsValidatingSession(false);
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
    // Only pass preloaded data on first render to avoid unnecessary API calls
    // when switching between tabs
    switch(activeTab) {
      case "dashboard":
        return <AdminDashboard 
          preloadedServices={isLoaded ? servicesData : null} 
        />;
      case "services":
        return <AdminServices 
          preloadedServices={isLoaded ? servicesData : null}
          preloadedServicesConfig={isLoaded ? servicesConfigData : null}
        />;
      case "statuspage":
        return <AdminStatusPage 
          preloadedStatusPageData={isLoaded ? statusPageData : null}
          preloadedAppearanceData={isLoaded ? appearanceData : null}
        />;
      case "history":
        return <AdminHistory 
          preloadedHistory={isLoaded ? historyData : null}
        />;
      case "settings":
        return <AdminSettings />;
      default:
        return <AdminDashboard 
          preloadedServices={isLoaded ? servicesData : null}
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
      default:
        return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar for larger screens */}
        <UISidebar className="hidden md:block">
          <SidebarNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            handleLogout={handleLogout} 
            isLoggingOut={isLoggingOut} 
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
                    setActiveTab={setActiveTab} 
                    handleLogout={handleLogout} 
                    isLoggingOut={isLoggingOut} 
                    {...logoProps}
                  />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold">OpenUptimes Admin</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6">
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
} 