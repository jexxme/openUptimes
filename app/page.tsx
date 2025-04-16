"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSetupStatus } from "./hooks/useSetupStatus";
import { StatusHeader } from "./components/StatusHeader";
import { ServiceItem } from "./components/ServiceItem";
import { Footer } from "./components/Footer";
import { useHistoricalData } from "./hooks/useHistoricalData";
import Image from "next/image";
import { RefreshCw } from "lucide-react";

// For type checking only
interface ServiceConfig {
  name: string;
  url: string;
  description?: string;
  visible?: boolean;
}

// StatusDot component for animated status indicator
const StatusDot = ({ status }: { status: string }) => {
  const statusColor = 
    status === "up" ? "bg-emerald-500" : 
    status === "down" ? "bg-red-500" : 
    "bg-gray-300";
  
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`w-3 h-3 rounded-full ${statusColor}`}>
        {status === "up" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></span>
          </>
        )}
      </div>
    </div>
  );
};

// Client component that uses search params
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams?.get('preview') === 'true';
  const forceShow = searchParams?.get('forceShow') === 'true';
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [siteConfig, setSiteConfig] = useState<any>({
    statusPage: {
      enabled: true,
      title: 'Service Status',
      description: 'Current status of our services'
    }
  });
  
  const [appearanceConfig, setAppearanceConfig] = useState<any>({
    logo: null,
    logoUrl: ""
  });
  
  const [serviceVisibility, setServiceVisibility] = useState<Record<string, boolean>>({});
  const { data: services, loading: historyLoading, error: historyError } = useHistoricalData('90d');
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();
  
  // Fetch site settings
  useEffect(() => {
    async function fetchSiteConfig() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSiteConfig(data);
        }
      } catch (error) {
        console.error('Error fetching site config:', error);
      }
    }
    
    fetchSiteConfig();
  }, []);
  
  // Fetch appearance settings
  useEffect(() => {
    async function fetchAppearanceSettings() {
      try {
        const response = await fetch('/api/settings/appearance');
        if (response.ok) {
          const data = await response.json();
          setAppearanceConfig(data);
        }
      } catch (error) {
        console.error('Error fetching appearance settings:', error);
      }
    }
    
    fetchAppearanceSettings();
  }, []);
  
  // Fetch status page settings
  useEffect(() => {
    async function fetchStatusPageSettings() {
      try {
        const response = await fetch('/api/settings/statuspage');
        if (response.ok) {
          const data = await response.json();
          console.log('Status page settings:', data);
          // Create a map of service name to visibility
          const visibilityMap = (data.services || []).reduce((acc: Record<string, boolean>, service: any) => {
            acc[service.name] = service.visible;
            return acc;
          }, {});
          setServiceVisibility(visibilityMap);
          console.log('Service visibility map:', visibilityMap);
        }
      } catch (error) {
        console.error('Error fetching status page settings:', error);
      }
    }
    
    fetchStatusPageSettings();
  }, []);
  
  // Redirect to setup wizard if not complete
  useEffect(() => {
    if (setupComplete === false && !setupLoading) {
      router.push('/setup');
    }
  }, [setupComplete, setupLoading, router]);
  
  // Filter services based on visibility settings - consider services visible only if explicitly set to true
  // If in preview mode with forceShow, show all services regardless of visibility
  const visibleServices = services.filter(service => {
    if (isPreview && forceShow) {
      return true; // Show all in preview mode
    }
    // Only show services explicitly marked as visible
    return serviceVisibility[service.name] === true;
  });
  
  // Debug logging
  useEffect(() => {
    if (services.length > 0) {
      console.log('All services:', services.map(s => s.name));
      console.log('Visible services:', visibleServices.map(s => s.name));
    }
  }, [services, visibleServices]);

  // Handle refresh with animation
  const handleRefresh = () => {
    if (isRefreshing || historyLoading) return;
    
    setIsRefreshing(true);
    
    // Delay the actual refresh to complete animation
    setTimeout(() => {
      window.location.reload();
      
      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 100);
    }, 650); // Animation takes ~600ms
  };
  
  if (setupLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
        <p className="mt-2 text-sm text-gray-500">Checking setup status...</p>
      </div>
    );
  }
  
  if (setupError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="rounded-lg border border-red-100 bg-white p-4 text-center max-w-md">
          <h2 className="mb-2 text-lg font-medium text-red-600">Setup Error</h2>
          <p className="text-sm text-red-500">{setupError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // If status page is disabled and not in preview mode with forceShow, show a placeholder
  if (siteConfig?.statusPage?.enabled === false && (!isPreview || !forceShow)) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 text-center">
          {(appearanceConfig.logo || appearanceConfig.logoUrl) && (
            <div className="flex justify-center mb-6">
              {appearanceConfig.logoUrl ? (
                <img 
                  src={appearanceConfig.logoUrl} 
                  alt={`${siteConfig.siteName || 'OpenUptimes'} Logo`}
                  className="h-16 w-auto"
                />
              ) : (
                <div 
                  className="h-16 w-auto"
                  dangerouslySetInnerHTML={{ __html: appearanceConfig.logo || '' }}
                />
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{siteConfig.siteName || 'OpenUptimes'}</h1>
          <p className="text-gray-500 mb-6">Status page is currently disabled</p>
        </div>
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    );
  }
  
  // If in preview mode with forceShow, show a preview banner
  const showPreviewBanner = isPreview && forceShow && siteConfig?.statusPage?.enabled === false;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {showPreviewBanner && (
        <div className="bg-amber-50 border-b border-amber-100 py-2 px-4 text-center text-amber-800 text-sm">
          <span className="font-medium">Preview Mode</span> — This is a preview of how your status page will look when enabled. 
          It is currently disabled for public viewing.
        </div>
      )}
      
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Logo Section */}
        {(appearanceConfig.logo || appearanceConfig.logoUrl) && (
          <div className="flex justify-center mb-6">
            {appearanceConfig.logoUrl ? (
              <img 
                src={appearanceConfig.logoUrl} 
                alt={`${siteConfig.siteName || 'OpenUptimes'} Logo`}
                className="h-16 w-auto"
              />
            ) : (
              <div 
                className="h-16 w-auto"
                dangerouslySetInnerHTML={{ __html: appearanceConfig.logo || '' }}
              />
            )}
          </div>
        )}
        
        {historyLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
          </div>
        ) : historyError ? (
          <div className="rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm">
            <h2 className="mb-2 text-lg font-medium text-red-600">Error Loading Status</h2>
            <p className="text-sm text-red-500 mb-4">{historyError}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{siteConfig?.statusPage?.title}</h1>
                <p className="text-gray-500 mt-1">{siteConfig?.statusPage?.description}</p>
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isRefreshing}
                title="Refresh status"
              >
                <RefreshCw 
                  className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} 
                />
                <span>Refresh</span>
              </button>
            </div>
            
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {visibleServices.some(service => service.history.length > 0 && service.history[0].status === "up") && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <StatusDot status="up" />
                  <span>All systems operational</span>
                </div>
              )}
              {visibleServices.some(service => service.history.length > 0 && service.history[0].status === "down") && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                  <StatusDot status="down" />
                  <span>Outage detected</span>
                </div>
              )}
              <div className="ml-auto text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            
            <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden bg-white">
              {visibleServices.length > 0 ? (
                visibleServices.map((service) => (
                  <ServiceItem 
                    key={service.name}
                    name={service.name}
                    status={service.history.length > 0 ? service.history[0].status : 'unknown'}
                    history={service.history}
                    uptimePercentage={service.uptimePercentage}
                    description={service.description}
                  />
                ))
              ) : (
                <div className="text-center py-12 px-4 text-gray-500">
                  <svg 
                    className="mx-auto h-12 w-12 text-gray-300 mb-3" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                  <p className="text-sm font-medium">No services are currently configured to be visible on this status page.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

// Loading fallback component
function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
      <p className="mt-2 text-sm text-gray-500">Loading...</p>
    </div>
  );
}

// Main page component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
