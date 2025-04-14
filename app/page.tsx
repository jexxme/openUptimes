"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStatus } from "./hooks/useStatus";
import { useSetupStatus } from "./hooks/useSetupStatus";
import { StatusHeader } from "./components/StatusHeader";
import { StatusCard } from "./components/StatusCard";
import { Footer } from "./components/Footer";

// For type checking only
interface ServiceConfig {
  name: string;
  url: string;
  description?: string;
  visible?: boolean;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const forceShow = searchParams.get('forceShow') === 'true';
  
  const [showHistory, setShowHistory] = useState(false);
  const [siteConfig, setSiteConfig] = useState<any>({
    statusPage: {
      enabled: true,
      title: 'Service Status',
      description: 'Current status of our services'
    }
  });
  
  const { services, loading: statusLoading, error: statusError, lastUpdated, refresh } = useStatus(showHistory, 60);
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();
  
  // Filter visible services
  const visibleServices = services.filter(service => 
    service.config?.visible !== false // Show service if visible is undefined or true
  );
  
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
  
  // Redirect to setup wizard if not complete
  useEffect(() => {
    if (setupComplete === false && !setupLoading) {
      router.push('/setup');
    }
  }, [setupComplete, setupLoading, router]);
  
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
      
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {statusLoading && visibleServices.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
          </div>
        ) : statusError ? (
          <div className="rounded-lg border border-red-100 bg-white p-4 text-center">
            <h2 className="mb-2 text-lg font-medium text-red-600">Error Loading Status</h2>
            <p className="text-sm text-red-500">{statusError}</p>
            <button
              onClick={refresh}
              className="mt-3 rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <StatusHeader 
              title={siteConfig?.statusPage?.title}
              description={siteConfig?.statusPage?.description}
              services={visibleServices} 
              lastUpdated={lastUpdated} 
            />
            
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Services</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-50"
                  aria-label="Refresh"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    showHistory 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {showHistory ? "Hide History" : "Show History"}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {visibleServices.length > 0 ? (
                visibleServices.map((service) => (
                  <StatusCard key={service.name} service={service} showHistory={showHistory} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No services are currently configured to be visible on this status page.
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
