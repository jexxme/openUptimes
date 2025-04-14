"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

// Import data hooks
import { useStatus } from "../hooks/useStatus";
import { useSetupStatus } from "../hooks/useSetupStatus";
import { useServicesConfig } from "../hooks/useServicesConfig";
import { ServiceConfig } from "@/lib/config";

// Import ShadCN UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar as UISidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; 

// Import custom components
import { SidebarNav } from "../components/admin/SidebarNav";
import { ServicesStats } from "../components/admin/ServicesStats";
import { ServicesList } from "../components/admin/ServicesList";

// Dashboard content components
import { DashboardContent } from "@/app/components/admin/DashboardContent";
import { SettingsContent } from "@/app/components/admin/SettingsContent";
import { HistoryContent } from "@/app/components/admin/HistoryContent";

export default function AdminPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryService, setSelectedHistoryService] = useState<string | null>(null);
  
  // Get real data using the hooks
  const { services, loading: statusLoading, error: statusError, lastUpdated, refresh } = useStatus(showHistory, 60);
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();
  
  // Get services configuration data (for editing)
  const { 
    services: servicesConfig, 
    loading: servicesConfigLoading, 
    error: servicesConfigError, 
    isUpdating,
    addService,
    updateService,
    deleteService,
    fetchServices: refreshServicesConfig
  } = useServicesConfig();

  // Handle viewing history for a specific service
  const handleViewHistory = (serviceName: string) => {
    setSelectedHistoryService(serviceName);
    setActiveTab("history");
  };

  // Reset selected service when leaving history tab
  useEffect(() => {
    if (activeTab !== "history") {
      setSelectedHistoryService(null);
    }
  }, [activeTab]);

  // Ensure we've fully loaded in the browser
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Redirect to setup if not complete
  useEffect(() => {
    if (setupComplete === false && !setupLoading) {
      router.push('/setup');
    }
  }, [setupComplete, setupLoading, router]);

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
      
      // Clear any client-side state/storage if needed
      // ...
      
      // Use a longer timeout to ensure cookies are properly cleared
      setTimeout(() => {
        // Force a full page reload to the login page
        window.location.href = '/login?from=/admin&t=' + new Date().getTime();
      }, 800);
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
      
      // Fallback redirect if the API call fails
      window.location.href = '/login';
    }
  }

  if (!isLoaded || setupLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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

  const renderContent = () => {
    switch(activeTab) {
      case "dashboard":
        return <DashboardContent 
          services={services} 
          statusLoading={statusLoading} 
          statusError={statusError} 
          lastUpdated={lastUpdated} 
          refresh={refresh} 
        />;
      
      case "services":
        return (
          <div className="space-y-8">
            {/* Services stats */}
            <ServicesStats 
              servicesConfig={servicesConfig} 
              servicesStatus={services} 
            />
            
            {/* Services management */}
            <ServicesList
              services={services}
              servicesConfig={servicesConfig}
              statusLoading={statusLoading}
              servicesConfigLoading={servicesConfigLoading}
              statusError={statusError}
              servicesConfigError={servicesConfigError}
              isUpdating={isUpdating}
              lastUpdated={lastUpdated}
              refreshServicesConfig={refreshServicesConfig}
              refresh={refresh}
              addService={addService}
              updateService={updateService}
              deleteService={deleteService}
              onViewHistory={handleViewHistory}
            />
          </div>
        );
      
      case "history":
        return <HistoryContent
          services={services}
          statusLoading={statusLoading} 
          statusError={statusError} 
          lastUpdated={lastUpdated} 
          refresh={refresh}
          initialService={selectedHistoryService}
        />;
        
      case "settings":
        return <SettingsContent />;
        
      default:
        return <div>Select a tab</div>;
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
          />
        </UISidebar>
        
        {/* Main content area */}
        <div className="flex w-full flex-col md:pl-0">
          <header className="h-16 border-b md:hidden">
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
                  />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold">OpenUptimes Admin</h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
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