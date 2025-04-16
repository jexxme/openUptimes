"use client";

import { useState, useEffect, useMemo } from "react";
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

interface StatusPageContentProps {
  activeSection?: string;
  preloadedStatusPageData?: any;
  preloadedAppearanceData?: any;
}

export function StatusPageContent({ 
  activeSection = "general",
  preloadedStatusPageData,
  preloadedAppearanceData
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

  // Update current tab when activeSection changes - simplified with the memoized value
  useEffect(() => {
    setCurrentTab(sectionTabValue);
  }, [sectionTabValue]);

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
        
        // Update state with fetched settings
        setLogoUrl(data.logoUrl || "");
        setShowServiceUrls(data.showServiceUrls !== false);
        setShowServiceDescription(data.showServiceDescription !== false);
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
      
      // Update the actual saved state after successful save
      setStatusPageEnabled(statusPageEnabledUI);
      
      // Show success notification
      toast({
        title: "Status page settings saved",
        description: "Your status page settings have been updated successfully.",
        duration: 3000,
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
        // Preserve any existing custom CSS to prevent it from being removed
        customCSS: customCss
      };
      
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
      
      // Show success notification
      toast({
        title: "Appearance settings saved",
        description: "Your appearance settings have been updated successfully.",
        duration: 3000,
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
      
      // Show success notification
      toast({
        title: "Advanced settings saved",
        description: "Your custom CSS and HTML have been updated successfully.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to save advanced settings:", err);
      // Show error notification
      toast({
        title: "Error saving advanced settings",
        description: "There was a problem saving your custom settings. Please try again.",
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
    <Card className="h-full w-full max-w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Status Page</CardTitle>
            {statusPageEnabled !== statusPageEnabledUI && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
                Unsaved Changes
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusPageEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusPageEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {statusPageEnabled ? 'Active' : 'Disabled'}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b pb-4 gap-4">
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
              className="flex items-center gap-1.5 h-9 px-3"
            >
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
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <GeneralTab 
              statusPageTitle={statusPageTitle}
              setStatusPageTitle={setStatusPageTitle}
              statusPageDescription={statusPageDescription}
              setStatusPageDescription={setStatusPageDescription}
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
        />
      </CardContent>
    </Card>
  );
} 