"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import dynamic from 'next/dynamic';

// Import data hooks
import { useStatus } from "../hooks/useStatus";
import { useServicesConfig } from "../hooks/useServicesConfig";
import { useAdminLoader } from "../hooks/useAdminLoader";

// Import ShadCN UI components
import { Button } from "@/components/ui/button";
import { Sidebar as UISidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; 

// Import custom components
import { SidebarNav } from "../components/admin/SidebarNav";
import { PageTitle } from "../components/PageTitle";
import { LoadingScreen } from "../components/admin/LoadingScreen";

// Force eager loading of components instead of lazy loading
// This ensures components are ready when tabs are switched
import { AdminDashboard } from "../components/admin/pages/Dashboard";
import { AdminServices } from "../components/admin/pages/Services";
import { AdminStatusPage } from "../components/admin/pages/StatusPage";
import { AdminHistory } from "../components/admin/pages/History";
import { AdminSettings } from "../components/admin/pages/Settings";
import { AdminAbout } from "../components/admin/pages/About";
import { GitHubActionsPage } from "../components/admin/pages/GitHubActions";

// Create a client-only wrapper to prevent hydration issues
const AdminPageClient = ({ searchParams }: { searchParams?: Promise<{ tab?: string; service?: string }> }) => {
  // Only log once during initial load
  const isDevMode = process.env.NODE_ENV === 'development';
  const initialLoadRef = useRef(true);
  
  if (isDevMode && initialLoadRef.current) {

    initialLoadRef.current = false;
  }
  
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [componentMounted, setComponentMounted] = useState(false);

  // Use the admin loader hook to handle all loading logic
  const adminLoader = useAdminLoader();
  const { 
    isLoaded, 
    isValidatingSession, 
    loadingProgress, 
    loadingState,
    setupLoading,
    setupError, 
    logoUrl,
    preloadedData
  } = adminLoader;

  // Add ref to track unsaved changes callbacks from different content components
  const unsavedChangesCallbacksRef = useRef<Record<string, () => boolean>>({});

  // Log when admin page mounts
  useEffect(() => {
    if (isDevMode) {

    }
    setComponentMounted(true);
    
    return () => {
      if (isDevMode) {

      }
    };
  }, [isDevMode]);

  // Log when loading is complete
  useEffect(() => {
    if (isDevMode && isLoaded && !setupLoading && !isValidatingSession) {



    }
  }, [isLoaded, setupLoading, isValidatingSession, activeTab, isDevMode]);

  // Function to register an unsaved changes callback
  const registerUnsavedChangesCallback = useCallback((key: string, callback: () => boolean) => {
    if (isDevMode) {

    }
    unsavedChangesCallbacksRef.current[key] = callback;
  }, [isDevMode]);

  // Function to check if there are any unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Check all registered callbacks
    const keys = Object.keys(unsavedChangesCallbacksRef.current);
    
    for (const key in unsavedChangesCallbacksRef.current) {
      const callback = unsavedChangesCallbacksRef.current[key];
      if (callback && callback()) {
        if (isDevMode) {

        }
        return true;
      }
    }
    return false;
  }, [isDevMode]);

  // Add a clearUnsavedChangesCallback function
  const clearUnsavedChangesCallback = useCallback((key?: string) => {
    if (key) {
      if (isDevMode) {

      }
      if (unsavedChangesCallbacksRef.current[key]) {
        delete unsavedChangesCallbacksRef.current[key];
      }
    } else {
      if (isDevMode) {

      }
      // Clear all callbacks
      unsavedChangesCallbacksRef.current = {};
    }
  }, [isDevMode]);

  // Check URL parameters on mount
  useEffect(() => {
    // Handle Promise-based searchParams
    const initFromSearchParams = async () => {
      if (searchParams) {
        try {
          const resolvedParams = await searchParams;
          
          // Update active tab based on URL
          if (resolvedParams.tab) {
            if (isDevMode) {

            }
            setActiveTab(resolvedParams.tab);
          }
        } catch (error) {

        }
      }
    };
    
    initFromSearchParams();
  }, [searchParams, isDevMode]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    if (isDevMode) {

    }
    
    // Update URL with the new tab value
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      
      // Track current parameters before changing
      const currentService = url.searchParams.get('service');
      
      // Set the new tab
      url.searchParams.set('tab', value);
      
      // Preserve service parameter when switching to services tab
      if (value === 'services' && currentService) {
        // Keep service parameter
      } else if (value !== 'services') {
        // If switching to a different tab, remove service parameter
        url.searchParams.delete('service');
      }
      
      // Update URL
      window.history.pushState({}, '', url.toString());
    }
    
    // Update active tab state
    setActiveTab(value);
  };

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

      setIsLoggingOut(false);
      
      // Fallback redirect if the API call fails
      window.location.href = '/login';
    }
  }

  // Show loading screen until everything is ready
  // Only proceed when all data is loaded AND the component is mounted
  const showLoadingScreen = !isLoaded || setupLoading || isValidatingSession || !componentMounted;
  
  if (showLoadingScreen) {
    if (isDevMode) {




    }
    return (
      <LoadingScreen
        loadingProgress={loadingProgress}
        loadingState={loadingState}
        isValidatingSession={isValidatingSession}
        setupLoading={setupLoading}
        setupError={setupError}
      />
    );
  }

  if (setupError) {

    return (
      <LoadingScreen
        loadingProgress={loadingProgress}
        loadingState={loadingState}
        setupError={setupError}
      />
    );
  }

  // Ensure preloaded data is available
  if (!preloadedData || !preloadedData.services) {

    return (
      <LoadingScreen
        loadingProgress={99}
        loadingState="Waiting for data to be ready..."
        isValidatingSession={false}
        setupLoading={false}
      />
    );
  }

  // Render the appropriate content based on active tab
  const renderContent = () => {
    if (isDevMode) {

    }
    
    switch(activeTab) {
      case "dashboard":
        return <AdminDashboard 
          preloadedServices={preloadedData.services} 
          preloadedStatusPageData={preloadedData.statusPage}
          preloadedHistoryData={preloadedData.history}
          preloadedPingStats={preloadedData.pingStats}
          setActiveTab={handleTabChange}
        />;
      case "services":
        return <div className="max-w-4xl">
          <AdminServices 
            preloadedServices={preloadedData.services}
            preloadedServicesConfig={preloadedData.servicesConfig}
            setActiveTab={handleTabChange}
          />
        </div>;
      case "statuspage":
        return <div className="max-w-4xl">
          <AdminStatusPage 
            preloadedStatusPageData={preloadedData.statusPage}
            preloadedAppearanceData={preloadedData.appearance}
            setActiveTab={handleTabChange}
            registerUnsavedChangesCallback={registerUnsavedChangesCallback}
          />
        </div>;
      case "history":
        return <AdminHistory 
          preloadedHistory={preloadedData.history}
          preloadedHistoryServices={preloadedData.historyServices}
          setActiveTab={handleTabChange}
        />;
      case "github-actions":
        return <div className="max-w-4xl">
          <GitHubActionsPage 
            setActiveTab={handleTabChange}
            registerUnsavedChangesCallback={registerUnsavedChangesCallback}
            preloadedData={{ 
              githubSettings: preloadedData.githubSettings 
            }}
          />
        </div>;
      case "settings":
        return <div className="max-w-2xl">
          <AdminSettings 
            setActiveTab={handleTabChange}
            registerUnsavedChangesCallback={registerUnsavedChangesCallback}
            preloadedData={{ generalSettings: preloadedData.generalSettings }}
          />
        </div>;
      case "about":
        return <div className="max-w-2xl">
          <AdminAbout 
            setActiveTab={handleTabChange}
          />
        </div>;
      default:

        return <AdminDashboard 
          preloadedServices={preloadedData.services}
          preloadedStatusPageData={preloadedData.statusPage}
          preloadedHistoryData={preloadedData.history}
          preloadedPingStats={preloadedData.pingStats}
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
      case "github-actions":
        return "GitHub Actions";
      case "settings":
        return "Settings";
      case "about":
        return "About";
      default:
        return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    }
  };

  // Get a meaningful subtitle for the current tab
  const getTabSubtitle = () => {
    switch(activeTab) {
      case "dashboard":
        return "Monitor system health and performance";
      case "services":
        return "Manage and configure monitored services";
      case "statuspage":
        return "Configure your public status page";
      case "history":
        return "View uptime logs and incident history";
      case "github-actions":
        return "Configure automated monitoring with GitHub Actions";
      case "settings":
        return "Configure system settings and preferences";
      case "about":
        return "System information and updates";
      default:
        return "Manage your OpenUptimes instance";
    }
  };

  // Pass logoUrl as a prop
  const logoProps = logoUrl ? { preloadedLogoUrl: logoUrl } : {};

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Add PageTitle with preloaded data */}
        {isLoaded && preloadedData.statusPage && (
          <PageTitle 
            statusPageTitle={preloadedData.statusPage?.settings?.title || "Service Status"} 
          />
        )}
        
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 h-screen flex-shrink-0 fixed left-0 top-0 bottom-0 z-30">
          <SidebarNav 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            handleLogout={handleLogout} 
            isLoggingOut={isLoggingOut} 
            hasUnsavedChanges={hasUnsavedChanges}
            clearUnsavedChangesCallback={clearUnsavedChangesCallback}
            {...logoProps}
          />
        </div>
        
        {/* Main content area */}
        <div className="w-full md:pl-64 flex flex-col">
          <header className="h-16 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
            <div className="flex h-16 items-center px-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="mr-3 md:hidden">
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
              <div className="flex flex-col justify-center">
                <h1 className="text-lg font-semibold leading-tight">{getTabTitle()}</h1>
                <p className="text-xs text-muted-foreground/80 mt-0.5 tracking-wide">{getTabSubtitle()}</p>
              </div>
            </div>
          </header>
          
          <main className="flex-1 px-6 pt-4 pb-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// Create a page component that renders the client component
export default function Page({ searchParams }: { searchParams?: Promise<{ tab?: string; service?: string }> }) {
  // Direct import of AdminPageClient instead of dynamic loading for faster initial render
  return <AdminPageClient searchParams={searchParams} />;
} 