"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSetupStatus } from "./hooks/useSetupStatus";
import { StatusHeader } from "./components/StatusHeader";
import { ServiceItem } from "./components/ServiceItem";
import { Footer } from "./components/Footer";
import { useHistoricalData } from "./hooks/useHistoricalData";
import { useAppearanceSettings } from "./hooks/useAppearanceSettings";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { createPortal } from "react-dom";
import { PageTitle } from "./components/PageTitle";
import { ThemeToggle } from "./components/ThemeToggle";

// For type checking only
interface ServiceConfig {
  name: string;
  url: string;
  description?: string;
  visible?: boolean;
}

// StatusBadgeTooltip component for header status badges
const StatusBadgeTooltip = ({ 
  visible, 
  position,
  status,
  affectedServices,
  since 
}: { 
  visible: boolean; 
  position: { x: number; y: number };
  status: 'outage' | 'degraded' | 'operational';
  affectedServices?: Array<{ name: string; status: string; }>;
  since?: number;
}) => {
  if (!visible) return null;
  
  const now = Date.now();
  
  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    
    const seconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return createPortal(
    <div 
      className="fixed z-[9999] transform -translate-x-1/2 shadow-lg"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y + 38}px`,
        pointerEvents: 'none' 
      }}
    >
      <div className="bg-gray-800 dark:bg-gray-900 text-white text-xs leading-normal px-4 py-3 rounded-md min-w-[220px]">
        <div 
          className="w-0 h-0 absolute -top-2 left-1/2 transform -translate-x-1/2" 
          style={{ 
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid rgb(31, 41, 55)', // Same as bg-gray-800
            borderBottomColor: 'var(--tooltip-bg-color, rgb(31, 41, 55))'
          }}
        ></div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'outage' ? 'bg-red-500' : 
            status === 'degraded' ? 'bg-yellow-400' : 
            'bg-emerald-500'}`}
          ></div>
          <span className="font-medium text-sm">
            {status === 'outage' ? 'System Outage' : 
             status === 'degraded' ? 'Partial Degradation' : 
             'All Systems Operational'}
          </span>
        </div>
        
        {status !== 'operational' && affectedServices && affectedServices.length > 0 && (
          <div className="mb-3">
            <div className="text-gray-300 mb-1">Affected services:</div>
            <div className="space-y-1.5">
              {affectedServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{service.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    service.status === 'down' ? 'bg-red-900/30 text-red-300' : 
                    'bg-yellow-900/30 text-yellow-300'}`}
                  >
                    {service.status === 'down' ? 'Down' : 'Degraded'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {since && (
          <div className="text-[10px] pt-2 border-t border-gray-700 text-gray-400 mt-1">
            Started: {formatDate(since)} ({formatTimeAgo(since)})
          </div>
        )}
        
      </div>
      
      <style jsx>{`
        :global(.dark) {
          --tooltip-bg-color: rgb(17, 24, 39); /* dark:bg-gray-900 */
        }
        :global(.light) {
          --tooltip-bg-color: rgb(31, 41, 55); /* bg-gray-800 */
        }
      `}</style>
    </div>,
    document.body
  );
};

// StatusDot component for animated status indicator
const StatusDot = ({ status, uptimePercentage }: { status: string; uptimePercentage?: number }) => {
  // Determine color based on status and uptime percentage
  let statusColor = 'bg-gray-300 dark:bg-gray-600'; // Default color for unknown
  
  if (status === "up") {
    if (uptimePercentage !== undefined) {
      if (uptimePercentage >= 99.5) statusColor = 'bg-emerald-500 dark:bg-emerald-400'; // Fully operational - green
      else if (uptimePercentage >= 95) statusColor = 'bg-emerald-500 dark:bg-emerald-400'; // Still very good - green
      else if (uptimePercentage >= 70) statusColor = 'bg-yellow-400'; // Minor issues - yellow
      else statusColor = 'bg-orange-400'; // Major issues but still up - orange
    } else {
      statusColor = 'bg-emerald-500 dark:bg-emerald-400'; // Default green if no percentage
    }
  } else if (status === "down") {
    statusColor = 'bg-red-500 dark:bg-red-400'; // Complete outage - red
  } else if (status === "degraded" || status === "partial") {
    statusColor = 'bg-yellow-400'; // Degraded service - yellow
  }
  
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`w-3 h-3 rounded-full ${statusColor}`}>
        {(status === "up" && (!uptimePercentage || uptimePercentage >= 95)) && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 dark:bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
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
  const [contentReady, setContentReady] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  
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

      } catch (error) {

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
  
  const [serviceVisibility, setServiceVisibility] = useState<Record<string, boolean>>({});
  const { data: services, loading: historyLoading, error: historyError, refetch: refetchHistory } = useHistoricalData(historyTimeRange);
  const { setupComplete, loading: setupLoading, error: setupError } = useSetupStatus();
  
  // Debug render cycle
  useEffect(() => {
    setRenderCount(prev => {

      return prev + 1;
    });
  }, []);
  
  // Mark when critical content is ready to display
  useEffect(() => {
    if (!appearanceLoading && !setupLoading) {

      setTimeout(() => setContentReady(true), 100); // Small delay to ensure smooth transition
    }
  }, [appearanceLoading, setupLoading]);
  
  // Debug the history time range to verify it's being set correctly
  useEffect(() => {


  }, [historyTimeRange, appearanceConfig?.historyDays, appearanceLoading, setupLoading]);

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

          // Create a map of service name to visibility
          const visibilityMap = (data.services || []).reduce((acc: Record<string, boolean>, service: any) => {
            acc[service.name] = service.visible;
            return acc;
          }, {});
          setServiceVisibility(visibilityMap);

        }
      } catch (error) {

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


    }
  }, [services, visibleServices]);

  // Handle refresh with animation
  const handleRefresh = () => {
    if (isRefreshing || historyLoading) return;
    
    setIsRefreshing(true);
    
    // Only refresh the historical data, not the entire page

    // Just refetch the history data, we don't need to hide/show the entire page
    refetchHistory()
      .then(() => {

        // Keep a short spinner animation to provide feedback
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      })
      .catch(error => {

        setIsRefreshing(false);
      });
  };
  
  // If setup error, show error page
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

  // Add state for status badge tooltip
  const [statusBadgeTooltipVisible, setStatusBadgeTooltipVisible] = useState(false);
  const [statusBadgeTooltipPosition, setStatusBadgeTooltipPosition] = useState({ x: 0, y: 0 });
  const statusBadgeRef = useRef<HTMLDivElement>(null);
  
  // Status badge tooltip handlers
  const handleStatusBadgeMouseEnter = () => {
    if (statusBadgeRef.current) {
      const rect = statusBadgeRef.current.getBoundingClientRect();
      setStatusBadgeTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
    setStatusBadgeTooltipVisible(true);
  };
  
  const handleStatusBadgeMouseLeave = () => {
    setStatusBadgeTooltipVisible(false);
  };

  // Add page title component to update the document title based on status page title
  useEffect(() => {
    // Check if both are loaded to avoid flashing titles
    if (contentReady && siteConfig && siteConfig.statusPage) {
      // PageTitle will be updated via the standalone component

    }
  }, [contentReady, siteConfig]);

  // Create wrapper div with opacity transition based on content readiness
  return (
    <div className={`flex min-h-screen flex-col bg-white dark:bg-gray-950 ${contentReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 overflow-y-auto`}>
      <GlobalStyles />
      
      {/* Add PageTitle component with status page title */}
      {contentReady && siteConfig && (
        <PageTitle 
          statusPageTitle={siteConfig.statusPage?.title || "Service Status"} 
          siteName={siteConfig.siteName || "OpenUptimes"}
        />
      )}
      
      {showPreviewBanner && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40 py-3 px-4 text-center text-amber-800 dark:text-amber-300 text-sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-medium text-base">Preview Mode</span>
            {previewSettings && previewSettings.hasUnsavedChanges && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full font-medium">
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
      
      <div className={`mx-auto w-full max-w-3xl px-4 py-4 ${!(contentReady && appearanceConfig && ((appearanceConfig.logo && appearanceConfig.logo !== '') || (appearanceConfig.logoUrl && appearanceConfig.logoUrl !== ''))) ? 'pt-8' : ''}`}>
        {/* Logo Section - only render if logo exists */}
        {contentReady && appearanceConfig && ((appearanceConfig.logo && appearanceConfig.logo !== '') || (appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '')) && (
          <div className="flex justify-center mb-8 h-16">
            {appearanceConfig.logoUrl && appearanceConfig.logoUrl !== '' ? (
              <img 
                src={appearanceConfig.logoUrl} 
                alt={`${siteConfig.siteName || 'OpenUptimes'} Logo`}
                className="h-16 w-auto"
                onLoad={() => {}}
                onError={() => {}}
              />
            ) : (
              <div 
                className="h-16 w-auto"
                dangerouslySetInnerHTML={{ __html: appearanceConfig.logo || '' }}
              />
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{siteConfig?.statusPage?.title}</h1>
            <p 
              className="text-gray-500 dark:text-gray-400 mt-1"
              dangerouslySetInnerHTML={{ 
                __html: siteConfig?.statusPage?.description 
                  ? DOMPurify.sanitize(siteConfig.statusPage.description, {
                      ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'br'],
                      ALLOWED_ATTR: ['href', 'target', 'rel']
                    }) 
                  : ''
              }}
            />
          </div>
          
          {(() => {
            // Show skeleton while loading
            if (historyLoading) {
              return (
                <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 h-8 w-36 animate-pulse"></div>
              );
            }
            
            // Check if we have visible services
            if (visibleServices.length === 0) return null;
            
            // Find issues in services
            const downServices = visibleServices.filter(service => 
              service.history.length > 0 && service.history[0].status === "down"
            );
            
            const degradedServices = visibleServices.filter(service => 
              (service.history.length > 0 && (service.history[0].status === "degraded" || service.history[0].status === "partial")) ||
              (service.history.length > 0 && service.history[0].status === "up" && service.uptimePercentage < 95)
            );
            
            // Get the earliest timestamp for the current state
            const getEarliestTimestamp = (services: typeof visibleServices) => {
              if (services.length === 0) return null;
              
              let earliest = Date.now();
              services.forEach(service => {
                if (service.history.length > 1) {
                  // Find the most recent status change
                  for (let i = 1; i < service.history.length; i++) {
                    if (service.history[i].status !== service.history[0].status) {
                      earliest = Math.min(earliest, service.history[i-1].timestamp);
                      break;
                    }
                  }
                } else if (service.history.length === 1) {
                  earliest = Math.min(earliest, service.history[0].timestamp);
                }
              });
              
              return earliest !== Date.now() ? earliest : null;
            };
            
            // Complete outage - at least one service is down
            if (downServices.length > 0) {
              const issueStartTime = getEarliestTimestamp(downServices);
              
              return (
                <div 
                  ref={statusBadgeRef}
                  className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 my-auto cursor-help"
                  onMouseEnter={handleStatusBadgeMouseEnter}
                  onMouseLeave={handleStatusBadgeMouseLeave}
                >
                  <StatusDot status="down" />
                  <span>{visibleServices.every(service => service.history.length > 0 && service.history[0].status === "down") 
                    ? "Complete system outage" 
                    : "Service outage detected"}
                  </span>
                  <StatusBadgeTooltip
                    visible={statusBadgeTooltipVisible}
                    position={statusBadgeTooltipPosition}
                    status="outage"
                    affectedServices={downServices.map(s => ({ 
                      name: s.name, 
                      status: s.history[0].status
                    }))}
                    since={issueStartTime || undefined}
                  />
                </div>
              );
            }
            
            // Partial outage - at least one service is degraded or has uptime < 95%
            if (degradedServices.length > 0) {
              const issueStartTime = getEarliestTimestamp(degradedServices);
              
              return (
                <div 
                  ref={statusBadgeRef}
                  className="flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-950/40 px-3 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-400 my-auto cursor-help"
                  onMouseEnter={handleStatusBadgeMouseEnter}
                  onMouseLeave={handleStatusBadgeMouseLeave}
                >
                  <StatusDot status="degraded" />
                  <span>Partial system degradation</span>
                  <StatusBadgeTooltip
                    visible={statusBadgeTooltipVisible}
                    position={statusBadgeTooltipPosition}
                    status="degraded"
                    affectedServices={degradedServices.map(s => ({ 
                      name: s.name, 
                      status: s.history[0].status === "up" && s.uptimePercentage < 95 ? "degraded" : s.history[0].status
                    }))}
                    since={issueStartTime || undefined}
                  />
                </div>
              );
            }
            
            // All systems operational - default state if neither of the above conditions match
            return (
              <div 
                ref={statusBadgeRef}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 my-auto cursor-help"
                onMouseEnter={handleStatusBadgeMouseEnter}
                onMouseLeave={handleStatusBadgeMouseLeave}
              >
                <StatusDot status="up" uptimePercentage={100} />
                <span>All systems operational</span>
                <StatusBadgeTooltip
                  visible={statusBadgeTooltipVisible}
                  position={statusBadgeTooltipPosition}
                  status="operational"
                />
              </div>
            );
          })()}
        </div>
        
        <div className="mb-2 flex flex-wrap items-center gap-2 justify-between">
          <div>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Last updated: <span suppressHydrationWarning>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false })}</span></span>
            <button 
              onClick={handleRefresh}
              className="flex items-center justify-center h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md"
              disabled={isRefreshing || historyLoading}
              title="Refresh status"
            >
              <RefreshCw 
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        </div>
        
        <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
          {historyLoading ? (
            // Skeleton UI for services
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 p-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                </div>
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-3"></div>
                <div className="mt-3 grid grid-cols-12 gap-1">
                  {Array(12).fill(0).map((_, j) => (
                    <div key={j} className="h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))
          ) : historyError ? (
            <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-gray-900 p-6 text-center shadow-sm">
              <h2 className="mb-2 text-lg font-medium text-red-600 dark:text-red-400">Error Loading Status</h2>
              <p className="text-sm text-red-500 dark:text-red-400 mb-4">{historyError}</p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          ) : visibleServices.length > 0 ? (
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
                isRefreshing={isRefreshing}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4 text-gray-500 dark:text-gray-400">
              <svg 
                className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" 
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
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function Home({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return (
    <>
      <GlobalStyles />
      <Suspense fallback={<div>Loading...</div>}>
        <HomeContent />
      </Suspense>
    </>
  );
}

// Add this global style for Safari scrolling and proper dark mode support
function GlobalStyles() {
  return (
    <style jsx global>{`
      html, body {
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Ensure dark mode is properly applied */
      .dark {
        color-scheme: dark;
      }

      @media (prefers-color-scheme: dark) {
        html:not(.light) {
          color-scheme: dark;
        }
      }
    `}</style>
  );
}
