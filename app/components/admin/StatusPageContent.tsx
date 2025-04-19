"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Globe, Palette, ExternalLink, EyeOff, Eye, Layout, Sliders, Image } from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { Input } from "../../../components/ui/input";

// Dialog components for preview
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

import { GeneralTab } from "@/app/components/admin/status-page/GeneralTab";
import { ServicesTab } from "@/app/components/admin/status-page/ServicesTab";
import { AppearanceTab } from "@/app/components/admin/status-page/AppearanceTab";
import { AdvancedTab } from "@/app/components/admin/status-page/AdvancedTab";
import { StatusPagePreviewDialog } from "@/app/components/admin/status-page/StatusPagePreviewDialog";
import { PageTitle } from "../PageTitle";
import { StatusPageTabs } from "@/app/components/admin/status-page/StatusPageTabs";

// Custom UnsavedChangesDialog component
interface UnsavedChangesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
}

function UnsavedChangesDialog({
  open,
  onClose,
  onConfirm,
  message = "You have unsaved changes. Are you sure you want to leave?"
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StatusPageContentProps {
  activeSection?: string;
  preloadedStatusPageData?: any;
  preloadedAppearanceData?: any;
  setActiveTab?: (tab: string) => void;
  registerUnsavedChangesCallback?: (key: string, callback: () => boolean) => void;
}

export function StatusPageContent({ 
  activeSection = "general",
  preloadedStatusPageData,
  preloadedAppearanceData,
  setActiveTab,
  registerUnsavedChangesCallback
}: StatusPageContentProps) {
  const { toast } = useToast();
  
  // Status page settings state - actual saved status from server
  const [statusPageEnabled, setStatusPageEnabled] = useState<boolean | null>(
    preloadedStatusPageData?.settings?.enabled !== false ? true : false
  );
  
  // UI state for the toggle - can be different from actual saved state
  const [statusPageEnabledUI, setStatusPageEnabledUI] = useState<boolean | null>(
    preloadedStatusPageData?.settings?.enabled !== false ? true : false
  );
  
  // Track if navigation is approved via our custom dialog
  const navigationApprovedRef = useRef(false);
  
  const [statusPageTitle, setStatusPageTitle] = useState(
    preloadedStatusPageData?.settings?.title || "Service Status"
  );
  const [statusPageDescription, setStatusPageDescription] = useState(
    preloadedStatusPageData?.settings?.description || "Current status of our services"
  );
  const [serviceVisibility, setServiceVisibility] = useState<{name: string, visible: boolean}[]>(
    preloadedStatusPageData?.services || []
  );
  const [isLoadingStatusPage, setIsLoadingStatusPage] = useState(false);
  const [isSavingStatusPage, setIsSavingStatusPage] = useState(false);
  
  // Overall loading state for the entire component - always start as loaded with preloaded data
  const [initialLoadComplete, setInitialLoadComplete] = useState(true);
  
  // Appearance settings state
  const [logoUrl, setLogoUrl] = useState(
    preloadedAppearanceData?.logoUrl || ""
  );
  const [showServiceUrls, setShowServiceUrls] = useState(
    preloadedAppearanceData?.showServiceUrls !== false
  );
  const [showServiceDescription, setShowServiceDescription] = useState(
    preloadedAppearanceData?.showServiceDescription !== false
  );
  const [historyDays, setHistoryDays] = useState(
    preloadedAppearanceData?.historyDays || 90
  );
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [isLoadingAppearance, setIsLoadingAppearance] = useState(false);
  
  // Advanced settings state
  const [customCss, setCustomCss] = useState(
    preloadedAppearanceData?.customCSS || ""
  );
  const [customHeader, setCustomHeader] = useState(
    preloadedAppearanceData?.customHeader || ""
  );
  const [isSavingAdvanced, setIsSavingAdvanced] = useState(false);
  const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false);
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Unsaved changes dialog state
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
  const pendingNavigationRef = useRef<{ destination: string } | null>(null);

  // Add copyright URL state with the other state variables
  const [copyrightUrl, setCopyrightUrl] = useState(
    preloadedAppearanceData?.copyrightUrl || ""
  );

  // Add copyright text state with the other state variables
  const [copyrightText, setCopyrightText] = useState(
    preloadedAppearanceData?.copyrightText || ""
  );

  // Map section to tab value
  const getSectionTabValue = (section: string): string => {
    switch (section) {
      case "appearance": return "appearance";
      case "advanced": return "advanced";
      case "services": return "services";
      case "general":
      default: return "general";
    }
  };
  
  // Memoize section tab value to prevent unnecessary recalculations
  const sectionTabValue = useMemo(() => getSectionTabValue(activeSection), [activeSection]);
  
  // Current selected tab - use memoized value
  const [currentTab, setCurrentTab] = useState(sectionTabValue);
  // Track the last user-selected tab to prevent unwanted reversions
  const [userSelectedTab, setUserSelectedTab] = useState<string | null>(null);

  // Check if there are any unsaved changes
  const hasUnsavedChanges = () => {
    return hasGeneralTabChanges() || hasServicesTabChanges() || hasAppearanceTabChanges() || hasAdvancedTabChanges();
  };

  // Check for changes in the General tab
  const hasGeneralTabChanges = () => {
    // Check statusPage toggle
    if (statusPageEnabled !== statusPageEnabledUI) {
      return true;
    }
    
    // Initial settings from server
    const originalTitle = preloadedStatusPageData?.settings?.title || "Service Status";
    const originalDescription = preloadedStatusPageData?.settings?.description || "Current status of our services";
    const originalHistoryDays = preloadedAppearanceData?.historyDays || 90;
    
    // Check for title, description and history days changes
    if (statusPageTitle !== originalTitle || 
        statusPageDescription !== originalDescription ||
        historyDays !== originalHistoryDays) {
      return true;
    }
    
    return false;
  };

  // Check for changes in the Services tab
  const hasServicesTabChanges = () => {
    // Check for service visibility changes
    const originalServices = preloadedStatusPageData?.services || [];
    if (serviceVisibility.length !== originalServices.length) {
      return true;
    }
    
    // Check each service visibility setting
    for (let i = 0; i < serviceVisibility.length; i++) {
      const currentService = serviceVisibility[i];
      const originalService = originalServices.find((s: {name: string, visible: boolean}) => s.name === currentService.name);
      
      if (!originalService || originalService.visible !== currentService.visible) {
        return true;
      }
    }
    
    return false;
  };

  // Check for changes in the Appearance tab
  const hasAppearanceTabChanges = () => {
    const originalLogoUrl = preloadedAppearanceData?.logoUrl || "";
    const originalShowServiceUrls = preloadedAppearanceData?.showServiceUrls !== false;
    const originalShowServiceDescription = preloadedAppearanceData?.showServiceDescription !== false;
    const originalCopyrightUrl = preloadedAppearanceData?.copyrightUrl || "";
    const originalCopyrightText = preloadedAppearanceData?.copyrightText || "";
    // historyDays is now checked in the General tab
    
    if (logoUrl !== originalLogoUrl || 
        showServiceUrls !== originalShowServiceUrls || 
        showServiceDescription !== originalShowServiceDescription ||
        copyrightUrl !== originalCopyrightUrl ||
        copyrightText !== originalCopyrightText) {
      return true;
    }
    
    return false;
  };

  // Check for changes in the Advanced tab
  const hasAdvancedTabChanges = () => {
    const originalCustomCss = preloadedAppearanceData?.customCSS || "";
    const originalCustomHeader = preloadedAppearanceData?.customHeader || "";
    
    if (customCss !== originalCustomCss || customHeader !== originalCustomHeader) {
      return true;
    }
    
    return false;
  };

  // Effect for updating state when preloadedAppearanceData changes
  useEffect(() => {
    if (preloadedAppearanceData) {
      console.log("[StatusPageContent] Updating from preloadedAppearanceData:", preloadedAppearanceData);
      setLogoUrl(preloadedAppearanceData.logoUrl || "");
      setShowServiceUrls(preloadedAppearanceData.showServiceUrls !== false);
      setShowServiceDescription(preloadedAppearanceData.showServiceDescription !== false);
      setHistoryDays(preloadedAppearanceData.historyDays || 90);
      setCopyrightUrl(preloadedAppearanceData.copyrightUrl || "");
      setCopyrightText(preloadedAppearanceData.copyrightText || "");
      setCustomCss(preloadedAppearanceData.customCSS || ""); 
      setCustomHeader(preloadedAppearanceData.customHeader || ""); 
    }
  }, [preloadedAppearanceData]);

  // Complete the tab change after confirmation
  const completeTabChange = useCallback((newTab: string, isUserAction = false) => {
    console.log("completeTabChange called with tab:", newTab, "isUserAction:", isUserAction);
    setCurrentTab(newTab);
    
    // If this is a user-initiated change, remember it to prevent unwanted reversions
    if (isUserAction) {
      setUserSelectedTab(newTab);
    }
    
    // Update the URL to reflect the current tab
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', newTab);
      window.history.pushState({}, '', url.toString());
      
      // Also update parent's activeTab if available
      if (setActiveTab) {
        setActiveTab("statuspage");
      }
    }
  }, [setActiveTab]);

  // Handle tab change with custom dialog - no need to check for unsaved changes
  const attemptTabChange = useCallback((newTab: string) => {
    console.log("attemptTabChange called with tab:", newTab);
    // No need to check for unsaved changes when changing tabs
    // as they are saved locally within the same page
    completeTabChange(newTab, true);  // Mark this as a user action
  }, [completeTabChange]);

  // Dialog handlers
  const handleDialogClose = useCallback(() => {
    setUnsavedChangesDialogOpen(false);
    pendingNavigationRef.current = null;
  }, []);

  const handleDialogConfirm = useCallback(() => {
    if (pendingNavigationRef.current) {
      // Set flag to prevent browser beforeunload dialog
      navigationApprovedRef.current = true;
      
      const destination = pendingNavigationRef.current.destination as string;
      
      try {
        // Parse the URL to get tab and section parameters
        const url = new URL(destination, window.location.origin);
        const tab = url.searchParams.get('tab');
        
        // If this is an internal admin page navigation
        if (url.pathname === '/admin' && tab) {
          // Update the active tab state
          if (setActiveTab) {
            setActiveTab(tab);
          }
          
          // Update URL without reload
          window.history.pushState({}, '', destination);
        } else {
          // External navigation or different page, use direct navigation
          window.location.href = destination;
        }
      } catch (error) {
        // Fallback to direct navigation if URL parsing fails
        window.location.href = destination;
      }
      
      pendingNavigationRef.current = null;
    }
    setUnsavedChangesDialogOpen(false);
  }, [setActiveTab]);

  // Update current tab when activeSection changes
  useEffect(() => {
    console.log("activeSection useEffect triggered", {
      activeSection,
      currentTab,
      sectionTabValue,
      userSelectedTab
    });
    
    // Only update from URL/activeSection if:
    // 1. The current tab doesn't match the URL section AND
    // 2. Either this is initial load (no user selection) OR the URL section matches the user selection
    if (currentTab !== sectionTabValue && 
        (userSelectedTab === null || userSelectedTab === sectionTabValue)) {
      console.log("Updating current tab from activeSection/sectionTabValue");
      completeTabChange(sectionTabValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTabValue, currentTab, userSelectedTab]);

  // Fetch status page settings only if not preloaded
  useEffect(() => {
    // Skip fetch completely if preloaded data is available
    if (preloadedStatusPageData) {
      return;
    }
    
    async function fetchStatusPageSettings() {
      setIsLoadingStatusPage(true);
      try {
        const response = await fetch('/api/settings/statuspage');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update state with fetched settings
        const enabled = data.settings?.enabled !== false;
        setStatusPageEnabled(enabled);
        setStatusPageEnabledUI(enabled); // Keep UI in sync with server state
        setStatusPageTitle(data.settings?.title || "Service Status");
        setStatusPageDescription(data.settings?.description || "Current status of our services");
        
        if (data.services && Array.isArray(data.services)) {
          setServiceVisibility(data.services);
        }
      } catch (err) {
        console.error("Failed to fetch status page settings:", err);
        // Set a default value for enabled state to avoid flickering
        setStatusPageEnabled(false);
        
        toast({
          title: "Error loading status page settings",
          description: "There was a problem loading status page settings.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoadingStatusPage(false);
      }
    }
    
    fetchStatusPageSettings();
  }, [preloadedStatusPageData, toast]);

  // Fetch appearance settings only if not preloaded
  useEffect(() => {
    // Skip fetch completely if preloaded data is available
    if (preloadedAppearanceData) {
      return;
    }
    
    // Prevent duplicate fetches
    if (isLoadingAppearance) {
      return;
    }
    
    async function fetchAppearanceSettings() {
      setIsLoadingAppearance(true);
      try {
        const response = await fetch('/api/settings/appearance');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("[StatusPageContent] Fetched appearance settings:", data);
        
        // Update state with fetched settings
        setLogoUrl(data.logoUrl || "");
        setShowServiceUrls(data.showServiceUrls !== false);
        setShowServiceDescription(data.showServiceDescription !== false);
        setHistoryDays(data.historyDays || 90);
        
        // Explicitly set copyright fields
        const copyrightUrlValue = data.copyrightUrl || "";
        const copyrightTextValue = data.copyrightText || "";
        console.log("[StatusPageContent] Setting copyright values:", {
          url: copyrightUrlValue,
          text: copyrightTextValue
        });
        setCopyrightUrl(copyrightUrlValue);
        setCopyrightText(copyrightTextValue);
        
        setCustomCss(data.customCSS || ""); 
        setCustomHeader(data.customHeader || ""); 
      } catch (err) {
        console.error("Failed to fetch appearance settings:", err);
        toast({
          title: "Error loading appearance settings",
          description: "There was a problem loading appearance settings.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoadingAppearance(false);
      }
    }
    
    fetchAppearanceSettings();
  }, [preloadedAppearanceData, toast, isLoadingAppearance]);
  
  // Fetch advanced settings - only if needed
  useEffect(() => {
    // We don't need to fetch additional data for the advanced tab
    // All the customCSS data comes from the appearance tab
    // This effect exists only to handle tab switching without additional API calls
    if (currentTab !== "advanced") {
      return;
    }

    // No extra API calls needed here - customCSS is already set from appearance data
    
  }, [currentTab]);

  const handleSaveStatusPageSettings = async () => {
    setIsSavingStatusPage(true);
    
    try {
      // Prepare data for API
      const updatedSettings = {
        settings: {
          enabled: statusPageEnabledUI, // Use the UI state for saving
          title: statusPageTitle,
          description: statusPageDescription
        },
        services: serviceVisibility
      };
      
      // Call API to update settings
      const response = await fetch('/api/settings/statuspage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Also update historyDays setting in appearance API
      const updatedAppearanceSettings = {
        historyDays: historyDays,
        // Keep other appearance settings unchanged
        logoUrl,
        showServiceUrls,
        showServiceDescription,
        customCSS: customCss,
        customHeader
      };
      
      const appearanceResponse = await fetch('/api/settings/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAppearanceSettings),
      });
      
      if (!appearanceResponse.ok) {
        throw new Error(`Error: ${appearanceResponse.status}`);
      }
      
      // Update the actual saved state after successful save
      setStatusPageEnabled(statusPageEnabledUI);
      
      // Update preloaded data to reflect the newly saved state
      if (preloadedStatusPageData) {
        preloadedStatusPageData.settings = {
          ...preloadedStatusPageData.settings,
          enabled: statusPageEnabledUI,
          title: statusPageTitle,
          description: statusPageDescription
        };
        preloadedStatusPageData.services = [...serviceVisibility];
      }
      
      // Update history days in preloaded appearance data
      if (preloadedAppearanceData) {
        preloadedAppearanceData.historyDays = historyDays;
      }
      
      // Show success notification
      toast({
        title: "Status page settings saved",
        description: "Your status page settings have been updated successfully.",
        duration: 3000,
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to save status page settings:", err);
      // Show error notification
      toast({
        title: "Error saving status page settings",
        description: "There was a problem saving your status page settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSavingStatusPage(false);
    }
  };

  const handleSaveAppearanceSettings = async () => {
    setIsSavingAppearance(true);
    
    try {
      // Prepare data for API
      const updatedSettings = {
        logoUrl,
        showServiceUrls,
        showServiceDescription,
        copyrightUrl,
        copyrightText,
        // historyDays is now saved in the General tab
        // Preserve any existing custom CSS to prevent it from being removed
        customCSS: customCss,
        customHeader
      };
      
      console.log("[StatusPageContent] Saving appearance settings:", updatedSettings);
      
      // Call API to update settings
      const response = await fetch('/api/settings/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Update preloaded data to reflect the newly saved state
      if (preloadedAppearanceData) {
        preloadedAppearanceData.logoUrl = logoUrl;
        preloadedAppearanceData.showServiceUrls = showServiceUrls;
        preloadedAppearanceData.showServiceDescription = showServiceDescription;
        preloadedAppearanceData.copyrightUrl = copyrightUrl;
        preloadedAppearanceData.copyrightText = copyrightText;
        preloadedAppearanceData.customCSS = customCss;
        preloadedAppearanceData.customHeader = customHeader;
        
        console.log("[StatusPageContent] Updated preloadedAppearanceData:", preloadedAppearanceData);
      }
      
      // Show success notification
      toast({
        title: "Appearance settings saved",
        description: "Your appearance settings have been updated successfully.",
        duration: 3000,
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to save appearance settings:", err);
      // Show error notification
      toast({
        title: "Error saving appearance settings",
        description: "There was a problem saving your appearance settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSavingAppearance(false);
    }
  };
  
  const handleSaveAdvancedSettings = async () => {
    setIsSavingAdvanced(true);
    
    try {
      // Prepare data for API
      const updatedSettings = {
        customCSS: customCss,
        customHeader: customHeader
      };
      
      // Call appearance API to update custom CSS and header
      const response = await fetch('/api/settings/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Update preloaded data to reflect the newly saved state
      if (preloadedAppearanceData) {
        preloadedAppearanceData.customCSS = customCss;
        preloadedAppearanceData.customHeader = customHeader;
      }
      
      // Show success notification
      toast({
        title: "Advanced settings saved",
        description: "Your advanced settings have been updated successfully.",
        duration: 3000,
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to save advanced settings:", err);
      // Show error notification
      toast({
        title: "Error saving advanced settings",
        description: "There was a problem saving your advanced settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSavingAdvanced(false);
    }
  };

  const handleToggleServiceVisibility = (name: string) => {
    setServiceVisibility(prevState => 
      prevState.map(service => 
        service.name === name 
          ? { ...service, visible: !service.visible } 
          : service
      )
    );
  };
  
  const handleOpenPreview = () => {
    setPreviewDialogOpen(true);
  };

  // Collect all unsaved settings for preview
  const unsavedSettings = {
    statusPageEnabledUI,
    statusPageTitle,
    statusPageDescription,
    serviceVisibility,
    appearanceSettings: {
      logoUrl,
      showServiceUrls,
      showServiceDescription,
      historyDays,
      copyrightUrl,
      copyrightText,
      customCSS: customCss,
      customHeader
    }
  };

  // Setup beforeunload event to prompt user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Skip the confirmation if navigation was approved via our custom dialog
      if (navigationApprovedRef.current) {
        return;
      }
      
      if (hasUnsavedChanges()) {
        // Standard way to show a confirmation dialog before page unload
        e.preventDefault();
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message; // Required for Chrome
        return message; // Required for other browsers
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [statusPageEnabledUI, statusPageTitle, statusPageDescription, serviceVisibility, 
      logoUrl, showServiceUrls, showServiceDescription, historyDays, customCss, customHeader, copyrightUrl, copyrightText]);

  // Modify page title to indicate unsaved changes
  useEffect(() => {
    const hasChanges = hasUnsavedChanges();
    const originalTitle = document.title;
    
    if (hasChanges) {
      document.title = "* " + originalTitle;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [statusPageEnabledUI, statusPageTitle, statusPageDescription, serviceVisibility, 
      logoUrl, showServiceUrls, showServiceDescription, historyDays, customCss, customHeader, copyrightUrl, copyrightText]);

  // Add "leave confirmation" dialog for navigation links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Skip if no unsaved changes
      if (!hasUnsavedChanges()) {
        return;
      }
      
      const target = e.target as HTMLElement;
      
      // Check if it's a sidebar navigation item
      const isSidebarNavItem = 
        target.closest('.sidebar-nav-button') || 
        (target.closest('button') && 
         (target.closest('button')?.getAttribute('data-tab') !== null ||
          target.classList.contains('sidebar-nav-button')));
      
      // If it's a sidebar navigation item or an external link (not within the current page)
      if (isSidebarNavItem || 
          (target.tagName === 'A' && !target.getAttribute('href')?.startsWith('#'))) {
        e.preventDefault();
        e.stopPropagation();
        
        // Store the destination for later navigation
        let destination: string;
        
        if (isSidebarNavItem) {
          // Get tab from data attribute or parent
          const button = target.closest('button');
          const tab = button?.getAttribute('data-tab');
          if (tab) {
            destination = `/admin?tab=${tab}`;
          } else {
            // Default to current URL if we couldn't determine the tab
            destination = window.location.href;
          }
        } else if (target.tagName === 'A' || target.closest('a')) {
          // Get href from anchor tag
          const anchor = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a') as HTMLAnchorElement;
          destination = anchor.href;
        } else {
          // Default to current URL if all checks fail
          destination = window.location.href;
        }
        
        // Set pending navigation destination
        pendingNavigationRef.current = { destination };
        
        // Show dialog
        setUnsavedChangesDialogOpen(true);
      }
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges]);

  // Reset navigation approved ref when component unmounts
  useEffect(() => {
    return () => {
      navigationApprovedRef.current = false;
    };
  }, []);

  // Register the hasUnsavedChanges function with parent component
  useEffect(() => {
    if (registerUnsavedChangesCallback) {
      // Create a wrapper function that calls our local hasUnsavedChanges
      const checkForUnsavedChanges = () => {
        // Add an explicit check to prevent false positives
        const hasChanges = hasUnsavedChanges();
        console.log('[StatusPage] Checking for unsaved changes:', hasChanges);
        return hasChanges;
      };
      
      // Register the callback
      registerUnsavedChangesCallback('statusPage', checkForUnsavedChanges);
      
      // Return cleanup function to unregister when component unmounts
      return () => {
        if (registerUnsavedChangesCallback) {
          // Use an empty function that always returns false to clear the callback
          registerUnsavedChangesCallback('statusPage', () => false);
        }
      };
    }
  }, [registerUnsavedChangesCallback, hasUnsavedChanges]);

  if (!initialLoadComplete) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle>Status Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl w-full">
      <PageTitle statusPageTitle={statusPageTitle} />
      
      <Card className="h-full w-full max-w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Status Page</CardTitle>
              {hasUnsavedChanges() && (
                <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium border border-amber-100 dark:border-amber-900/30">
                  Unsaved Changes
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              statusPageEnabled 
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                statusPageEnabled 
                  ? 'bg-green-500 dark:bg-green-400 animate-pulse' 
                  : 'bg-gray-400 dark:bg-gray-500'
              }`}></div>
              {statusPageEnabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-border pb-4 gap-4">
            <div className="flex items-center space-x-3">
              <Switch 
                id="status-page-enabled" 
                checked={statusPageEnabledUI === null ? false : statusPageEnabledUI}
                onCheckedChange={setStatusPageEnabledUI}
              />
              <Label htmlFor="status-page-enabled" className="font-medium">
                {statusPageEnabledUI ? 'Public status page is visible' : 'Public status page is hidden'}
              </Label>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenPreview}
                className="flex items-center gap-1.5 h-9 px-3 relative"
              >
                {hasUnsavedChanges() && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </Button>
              
              <Button 
                variant={statusPageEnabled ? "default" : "outline"}
                size="sm"
                disabled={statusPageEnabled !== true}
                onClick={() => window.open('/', '_blank')}
                className="flex items-center gap-1.5 h-9 px-3"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Page</span>
              </Button>
            </div>
          </div>
          
          <Tabs value={currentTab} onValueChange={attemptTabChange} className="w-full">
            <StatusPageTabs 
              currentTab={currentTab}
              hasGeneralTabChanges={hasGeneralTabChanges()}
              hasServicesTabChanges={hasServicesTabChanges()}
              hasAppearanceTabChanges={hasAppearanceTabChanges()}
              hasAdvancedTabChanges={hasAdvancedTabChanges()}
              onTabChange={attemptTabChange}
              variant="outline"
            />
            
            <TabsContent value="general">
              <GeneralTab 
                statusPageTitle={statusPageTitle}
                setStatusPageTitle={setStatusPageTitle}
                statusPageDescription={statusPageDescription}
                setStatusPageDescription={setStatusPageDescription}
                historyDays={historyDays}
                setHistoryDays={setHistoryDays}
                statusPageEnabledUI={statusPageEnabledUI}
                isLoading={isLoadingStatusPage}
                isSaving={isSavingStatusPage}
                onSave={handleSaveStatusPageSettings}
              />
            </TabsContent>
            
            <TabsContent value="services">
              <ServicesTab 
                serviceVisibility={serviceVisibility}
                statusPageEnabledUI={statusPageEnabledUI}
                isLoading={isLoadingStatusPage}
                isSaving={isSavingStatusPage}
                onToggleVisibility={handleToggleServiceVisibility}
                onSave={handleSaveStatusPageSettings}
              />
            </TabsContent>
            
            <TabsContent value="appearance">
              <AppearanceTab 
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
                showServiceUrls={showServiceUrls}
                setShowServiceUrls={setShowServiceUrls}
                showServiceDescription={showServiceDescription}
                setShowServiceDescription={setShowServiceDescription}
                copyrightUrl={copyrightUrl}
                setCopyrightUrl={setCopyrightUrl}
                copyrightText={copyrightText}
                setCopyrightText={setCopyrightText}
                isLoading={isLoadingAppearance}
                isSaving={isSavingAppearance}
                onSave={handleSaveAppearanceSettings}
              />
            </TabsContent>
            
            <TabsContent value="advanced">
              <AdvancedTab 
                customCss={customCss}
                setCustomCss={setCustomCss}
                customHeader={customHeader}
                setCustomHeader={setCustomHeader}
                isLoading={isLoadingAdvanced}
                isSaving={isSavingAdvanced}
                onSave={handleSaveAdvancedSettings}
              />
            </TabsContent>
          </Tabs>
          
          <StatusPagePreviewDialog 
            open={previewDialogOpen}
            setOpen={setPreviewDialogOpen}
            statusPageEnabled={statusPageEnabled}
            unsavedSettings={unsavedSettings}
            hasUnsavedChanges={hasUnsavedChanges()}
          />
        </CardContent>
      </Card>
      
      {/* Unsaved changes dialog */}
      {unsavedChangesDialogOpen && (
        <UnsavedChangesDialog 
          open={unsavedChangesDialogOpen}
          onClose={() => {
            setUnsavedChangesDialogOpen(false);
            pendingNavigationRef.current = null;
          }}
          onConfirm={() => {
            setUnsavedChangesDialogOpen(false);
            if (pendingNavigationRef.current) {
              navigationApprovedRef.current = true;
              
              // Reset the callback to prevent further dialog
              if (registerUnsavedChangesCallback) {
                registerUnsavedChangesCallback("statuspage", () => false);
              }
              
              if (pendingNavigationRef.current.destination) {
                if (setActiveTab) {
                  setActiveTab(pendingNavigationRef.current.destination);
                } else {
                  // Fallback to direct navigation
                  window.location.href = `/admin?tab=${pendingNavigationRef.current.destination}`;
                }
              }
              pendingNavigationRef.current = null;
            }
          }}
        />
      )}
    </div>
  );
} 