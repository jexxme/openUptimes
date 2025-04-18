"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSetupStatus } from "./hooks/useSetupStatus";
import { StatusHeader } from "./components/StatusHeader";
import { ServiceItem } from "./components/ServiceItem";
import { Footer } from "./components/Footer";
import { useHistoricalData } from "./hooks/useHistoricalData";
import { useAppearanceSettings } from "./hooks/useAppearanceSettings";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import DOMPurify from "dompurify";

// For type checking only
interface ServiceConfig {
  name: string;
  url: string;
  description?: string;
  visible?: boolean;
}

// StatusDot component for animated status indicator
const StatusDot = ({ status, uptimePercentage }: { status: string; uptimePercentage?: number }) => {
  // Determine color based on status and uptime percentage
  let statusColor = 'bg-gray-300'; // Default color for unknown
  
  if (status === "up") {
    if (uptimePercentage !== undefined) {
      if (uptimePercentage >= 99.5) statusColor = 'bg-emerald-500'; // Fully operational - green
      else if (uptimePercentage >= 95) statusColor = 'bg-emerald-500'; // Still very good - green
      else if (uptimePercentage >= 70) statusColor = 'bg-yellow-400'; // Minor issues - yellow
      else statusColor = 'bg-orange-400'; // Major issues but still up - orange
    } else {
      statusColor = 'bg-emerald-500'; // Default green if no percentage
    }
  } else if (status === "down") {
    statusColor = 'bg-red-500'; // Complete outage - red
  } else if (status === "degraded" || status === "partial") {
    statusColor = 'bg-yellow-400'; // Degraded service - yellow
  }
  
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`w-3 h-3 rounded-full ${statusColor}`}>
        {(status === "up" && (!uptimePercentage || uptimePercentage >= 95)) && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></span>
          </>
        )}
      </div>
    </div>
  );
};

// Custom hook to blend default appearance settings with preview settings
function usePreviewAwareAppearance(isPreview: boolean, previewSettings: any) {
  const { settings: savedAppearanceConfig, loading: appearanceLoading } = useAppearanceSettings();
  const [blendedSettings, setBlendedSettings] = useState(savedAppearanceConfig);
  
  useEffect(() => {
    if (isPreview && previewSettings?.appearance) {
      setBlendedSettings({
        ...savedAppearanceConfig,
        ...previewSettings.appearance
      });
    } else {
      setBlendedSettings(savedAppearanceConfig);
    }
  }, [isPreview, previewSettings, savedAppearanceConfig]);
  
  return { settings: blendedSettings, loading: appearanceLoading };
}

// Client component that uses search params
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams?.get('preview') === 'true';
  const forceShow = searchParams?.get('forceShow') === 'true';
  const respectVisibility = searchParams?.get('respectVisibility') === 'true';
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get preview settings if present
  const previewSettingsParam = searchParams?.get('settings');
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  
  // Parse preview settings on mount
  useEffect(() => {
    if (isPreview && previewSettingsParam) {
      try {
        const decoded = decodeURIComponent(previewSettingsParam);
        const parsed = JSON.parse(decoded);
        setPreviewSettings(parsed);
        console.log('Using preview settings:', parsed);
      } catch (error) {
        console.error('Error parsing preview settings:', error);
      }
    }
  }, [isPreview, previewSettingsParam]);
  
  const [siteConfig, setSiteConfig] = useState<any>({
    statusPage: {
      enabled: true,
      title: 'Service Status',
      description: 'Current status of our services'
    }
  });
  
  // Use custom hook for appearance settings that's preview-aware
  const { settings: appearanceConfig, loading: appearanceLoading } = usePreviewAwareAppearance(isPreview, previewSettings);
  
  // Override site config with preview settings if available
  useEffect(() => {
    if (isPreview && previewSettings) {
      setSiteConfig((prevConfig: any) => ({
        ...prevConfig,
        statusPage: {
          ...prevConfig.statusPage,
          enabled: previewSettings.enabled ?? prevConfig.statusPage.enabled,
          title: previewSettings.title || prevConfig.statusPage.title,
          description: previewSettings.description || prevConfig.statusPage.description
        }
      }));
    }
  }, [isPreview, previewSettings]);
  
  // Convert appearance historyDays to timeRange format needed by useHistoricalData
  // Use preview settings if available
  const historyTimeRange = `${(isPreview && previewSettings?.appearance?.historyDays) || 
    appearanceConfig?.historyDays || 90}d`;
  
  // Debug the history time range to verify it's being set correctly
  useEffect(() => {
    console.log('Using history time range:', historyTimeRange, 'days:', appearanceConfig?.historyDays);
  }, [historyTimeRange, appearanceConfig?.historyDays]);
  
  const [serviceVisibility, setServiceVisibility] = useState<Record<string, boolean>>({});
  const { data: services, loading: historyLoading, error: historyError } = useHistoricalData(historyTimeRange);
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();
  
  // Fetch site settings
  useEffect(() => {
    // Skip if using preview settings
    if (isPreview && previewSettings) return;
    
    let isMounted = true;
    
    async function fetchSiteConfig() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok && isMounted) {
          const data = await response.json();
          setSiteConfig(data);
        }
      } catch (error) {
        console.error('Error fetching site config:', error);
      }
    }
    
    fetchSiteConfig();
    
    return () => {
      isMounted = false;
    };
  }, [isPreview, previewSettings]);
  
  // No need for fetchAppearanceSettings - using the hook instead
  
  // Fetch status page settings
  useEffect(() => {
    // If preview settings with services are available, use those instead
    if (isPreview && previewSettings && previewSettings.services) {
      // Create a map of service name to visibility
      const visibilityMap = (previewSettings.services || []).reduce((acc: Record<string, boolean>, service: any) => {
        acc[service.name] = service.visible;
        return acc;
      }, {});
      setServiceVisibility(visibilityMap);
      return;
    }
    
    let isMounted = true;
    
    async function fetchStatusPageSettings() {
      try {
        const response = await fetch('/api/settings/statuspage');
        if (response.ok && isMounted) {
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
    
    return () => {
      isMounted = false;
    };
  }, [isPreview, previewSettings]);
  
  // Redirect to setup wizard if not complete
  useEffect(() => {
    if (setupComplete === false && !setupLoading) {
      router.push('/setup');
    }
  }, [setupComplete, setupLoading, router]);
  
  // Filter services based on visibility settings - consider services visible only if explicitly set to true
  // In preview mode, respect visibility setting if respectVisibility=true is set
  const visibleServices = services.filter(service => {
    if (isPreview && forceShow && !respectVisibility) {
      return true; // Show all in preview mode unless respectVisibility is set
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
          {appearanceConfig && ((appearanceConfig.logo && appearanceConfig.logo !== '') || (appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '')) && (
            <div className="flex justify-center mb-6">
              {appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '' ? (
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
  const showPreviewBanner = isPreview && forceShow;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {showPreviewBanner && (
        <div className="bg-amber-50 border-b border-amber-100 py-3 px-4 text-center text-amber-800 text-sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-medium text-base">Preview Mode</span>
            {previewSettings && previewSettings.hasUnsavedChanges && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                Unsaved Changes
              </span>
            )}
          </div>
          <p>
            This is a preview of how your status page will look.
            {siteConfig?.statusPage?.enabled === false && " It is currently disabled for public viewing."}
            {previewSettings && previewSettings.hasUnsavedChanges && " Changes you've made are reflected here but not saved yet."}
          </p>
          {!siteConfig?.statusPage?.enabled && (
            <div className="mt-1 text-xs">
              <span className="font-medium">Note:</span> You can edit all settings and preview them here even if the status page is disabled.
            </div>
          )}
        </div>
      )}
      
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Logo Section */}
        {appearanceConfig && ((appearanceConfig.logo && appearanceConfig.logo !== '') || (appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '')) && (
          <div className="flex justify-center mb-8">
            {appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '' ? (
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
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{siteConfig?.statusPage?.title}</h1>
                <p 
                  className="text-gray-500 mt-1"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(siteConfig?.statusPage?.description || '', {
                      ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'br'],
                      ALLOWED_ATTR: ['href', 'target', 'rel']
                    }) 
                  }}
                />
              </div>
              
              {/* Single status badge section - shows only one badge based on priority */}
              {(() => {
                // Check if we have visible services
                if (visibleServices.length === 0) return null;
                
                // Complete outage - at least one service is down
                if (visibleServices.some(service => service.history.length > 0 && service.history[0].status === "down")) {
                  return (
                    <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 my-auto">
                      <StatusDot status="down" />
                      <span>{visibleServices.every(service => service.history.length > 0 && service.history[0].status === "down") 
                        ? "Complete system outage" 
                        : "Service outage detected"}
                      </span>
                    </div>
                  );
                }
                
                // Partial outage - at least one service is degraded or has uptime < 95%
                if (visibleServices.some(service => 
                  (service.history.length > 0 && (service.history[0].status === "degraded" || service.history[0].status === "partial")) ||
                  (service.history.length > 0 && service.history[0].status === "up" && service.uptimePercentage < 95)
                )) {
                  return (
                    <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700 my-auto">
                      <StatusDot status="degraded" />
                      <span>Partial system degradation</span>
                    </div>
                  );
                }
                
                // All systems operational - default state if neither of the above conditions match
                return (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 my-auto">
                    <StatusDot status="up" uptimePercentage={100} />
                    <span>All systems operational</span>
                  </div>
                );
              })()}
            </div>
            
            <div className="mb-2 flex flex-wrap items-center gap-2 justify-end">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <button 
                  onClick={handleRefresh}
                  className="flex items-center justify-center h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isRefreshing}
                  title="Refresh status"
                >
                  <RefreshCw 
                    className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                </button>
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
                    url={service.url}
                    showServiceUrls={appearanceConfig?.showServiceUrls !== false}
                    showServiceDescription={appearanceConfig?.showServiceDescription !== false}
                    historyDays={appearanceConfig?.historyDays || 90}
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
