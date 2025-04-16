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
  const [primaryColor, setPrimaryColor] = useState(
    preloadedAppearanceData?.primaryColor || "#0284c7"
  );
  const [accentColor, setAccentColor] = useState(
    preloadedAppearanceData?.accentColor || "#06b6d4"
  );
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
  const [customCss, setCustomCss] = useState("");
  const [customHeader, setCustomHeader] = useState("");
  const [isSavingAdvanced, setIsSavingAdvanced] = useState(false);
  const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false);
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Map section to tab value
  const getSectionTabValue = (section: string): string => {
    switch (section) {
      case "appearance":
        return "appearance";
      case "advanced":
        return "advanced";
      case "services":
        return "services";
      case "general":
      default:
        return "general";
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
    
    async function fetchAppearanceSettings() {
      setIsLoadingAppearance(true);
      try {
        const response = await fetch('/api/settings/appearance');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update state with fetched settings
        setPrimaryColor(data.primaryColor || "#0284c7");
        setAccentColor(data.accentColor || "#06b6d4");
        setLogoUrl(data.logoUrl || "");
        setShowServiceUrls(data.showServiceUrls !== false);
        setShowServiceDescription(data.showServiceDescription !== false);
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
  }, [preloadedAppearanceData, toast]);
  
  // Fetch advanced settings - only if needed
  useEffect(() => {
    // Advanced data is optional, so we avoid loading it on initial render
    // It will be loaded only when the user navigates to the advanced tab
    if (currentTab !== "advanced") {
      return;
    }
    
    async function fetchAdvancedSettings() {
      if (isLoadingAdvanced) return; // Prevent duplicate fetches
      
      setIsLoadingAdvanced(true);
      try {
        // Mock implementation until the actual API endpoint is created
        // This avoids the 404 error
        setTimeout(() => {
          setCustomCss("");
          setCustomHeader("");
          setIsLoadingAdvanced(false);
        }, 500);
        
        // Comment out the API call until the endpoint exists
        /*
        const response = await fetch('/api/settings/statuspage/advanced');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update state with fetched settings
        setCustomCss(data.customCss || "");
        setCustomHeader(data.customHeader || "");
        */
      } catch (err) {
        console.error("Failed to fetch advanced settings:", err);
        toast({
          title: "Error loading advanced settings",
          description: "There was a problem loading advanced settings.",
          variant: "destructive",
          duration: 5000,
        });
        setIsLoadingAdvanced(false);
      }
    }
    
    fetchAdvancedSettings();
  }, [currentTab, toast, isLoadingAdvanced]);

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
        primaryColor,
        accentColor,
        logoUrl,
        showServiceUrls,
        showServiceDescription
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
      // Mock implementation until the actual API endpoint is created
      // Simulate a successful save after a short delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Comment out the API call until the endpoint exists
      /*
      // Prepare data for API
      const updatedSettings = {
        customCss,
        customHeader
      };
      
      // Call API to update settings
      const response = await fetch('/api/settings/statuspage/advanced', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      */
      
      // Show success notification
      toast({
        title: "Advanced settings saved",
        description: "Your advanced settings have been updated successfully.",
        duration: 3000,
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
          
          <TabsContent value="general" className="w-full">
            <p className="mb-4 text-sm text-muted-foreground">
              Configure your public status page settings.
            </p>
            
            {isLoadingStatusPage ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>Status Page Information</span>
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Status Page Title</label>
                        <Input 
                          type="text" 
                          value={statusPageTitle}
                          onChange={(e) => setStatusPageTitle(e.target.value)}
                          disabled={statusPageEnabledUI !== true}
                          placeholder="Service Status" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Status Page Description</label>
                        <Input 
                          type="text" 
                          value={statusPageDescription}
                          onChange={(e) => setStatusPageDescription(e.target.value)}
                          disabled={statusPageEnabledUI !== true}
                          placeholder="Current status of our services" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveStatusPageSettings} 
                    disabled={isSavingStatusPage || isLoadingStatusPage}
                  >
                    {isSavingStatusPage ? 
                      <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                      "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="services" className="w-full">
            <p className="mb-4 text-sm text-muted-foreground">Configure which services are visible on the public status page</p>
            
            {isLoadingStatusPage ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Layout className="h-4 w-4 text-muted-foreground" />
                    <span>Services Visibility</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">Select which services should be visible on the public status page</p>
                  
                  {serviceVisibility.length === 0 ? (
                    <div className="text-center py-8">
                      <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-20" />
                      <p className="text-sm text-muted-foreground">No services configured.</p>
                      <p className="text-sm text-muted-foreground">Add services from the Services tab first.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 mt-2 w-full">
                      {serviceVisibility.map((service) => (
                        <div key={service.name} className="flex items-center justify-between p-3 border rounded-md bg-background">
                          <span className="font-medium">{service.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground mr-2">
                              {service.visible ? 'Visible' : 'Hidden'}
                            </span>
                            <Switch 
                              id={`service-${service.name}`}
                              checked={service.visible}
                              onCheckedChange={() => handleToggleServiceVisibility(service.name)}
                              disabled={statusPageEnabledUI !== true}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveStatusPageSettings} 
                    disabled={isSavingStatusPage || isLoadingStatusPage}
                  >
                    {isSavingStatusPage ? 
                      <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                      "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="appearance" className="w-full">
            <p className="mb-4 text-sm text-muted-foreground">
              Customize the appearance of your public status page
            </p>
            
            {isLoadingAppearance ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span>Colors</span>
                  </h3>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primary Color</label>
                      <div className="flex items-center">
                        <div className="relative flex-1 max-w-md">
                          <Input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="pl-10"
                          />
                          <div 
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm border shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                          />
                          <div className="absolute inset-0 opacity-0">
                            <Input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="h-full w-full cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Accent Color</label>
                      <div className="flex items-center">
                        <div className="relative flex-1 max-w-md">
                          <Input
                            type="text"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="pl-10"
                          />
                          <div 
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm border shadow-sm"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div className="absolute inset-0 opacity-0">
                            <Input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="h-full w-full cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M15 8h.01"/><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M4 18h16"/><path d="M4 14h16"/><path d="M4 10h16"/><path d="M10 22v-4"/><path d="M14 22v-4"/></svg>
                    <span>Logo</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      The logo appears at the top of your status page. If no URL is set, no logo will be displayed.
                    </p>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Logo URL</label>
                        <Input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://your-domain.com/logo.png"
                          className="max-w-md"
                        />
                      </div>
                      
                      <div className="w-24 h-24 border rounded-md bg-background flex flex-col items-center justify-center p-2">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            className="max-h-16 max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-logo.png';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 opacity-40"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            <span className="text-xs">No logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-md p-3 text-xs text-blue-800 dark:text-blue-300">
                      <div className="flex gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        <div>
                          <p className="font-medium mb-1">Image recommendations:</p>
                          <ul className="list-disc ml-4 space-y-1">
                            <li>Use a transparent background for better integration</li>
                            <li>Keep file size small (under 200KB) for faster loading</li>
                            <li>SVG format provides the best quality at any size</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 14.5 16 10 4 20"/></svg>
                    <span>Display Options</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Show Service URLs</label>
                        <p className="text-xs text-muted-foreground mt-1">Display clickable links to your services on the status page</p>
                      </div>
                      <Switch 
                        checked={showServiceUrls}
                        onCheckedChange={setShowServiceUrls}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Show Service Descriptions</label>
                        <p className="text-xs text-muted-foreground mt-1">Display info icons with service descriptions on hover</p>
                      </div>
                      <Switch 
                        checked={showServiceDescription}
                        onCheckedChange={setShowServiceDescription}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveAppearanceSettings} 
                    disabled={isSavingAppearance || isLoadingAppearance}
                  >
                    {isSavingAppearance ? 
                      <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                      "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="w-full">
            <p className="mb-4 text-sm text-muted-foreground">
              Advanced customization options for your status page
            </p>
            
            {isLoadingAdvanced ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3">Custom CSS</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add custom CSS to customize the appearance of your status page</p>
                  
                  <div className="grid gap-2 max-w-full">
                    <div className="relative">
                      <textarea
                        value={customCss}
                        onChange={(e) => setCustomCss(e.target.value)}
                        placeholder="/* Add your custom CSS here */"
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3">Custom Header</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add custom HTML to the header of your status page</p>
                  
                  <div className="grid gap-2 max-w-full">
                    <div className="relative">
                      <textarea
                        value={customHeader}
                        onChange={(e) => setCustomHeader(e.target.value)}
                        placeholder="<!-- Add your custom HTML here -->"
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAdvancedSettings}
                    disabled={isSavingAdvanced}
                  >
                    {isSavingAdvanced ? 
                      <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                      "Save Advanced Settings"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="sm:max-w-[800px] sm:max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Status Page Preview</DialogTitle>
            </DialogHeader>
            
            <div className="border rounded-md overflow-hidden h-[500px]">
              <iframe
                src="/?preview=true&forceShow=true"
                className="w-full h-full"
                title="Status Page Preview"
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                Close
              </Button>
              {statusPageEnabled ? (
                <Button onClick={() => window.open('/', '_blank')}>
                  Open in New Tab
                </Button>
              ) : (
                <Button variant="outline" onClick={() => window.open('/?preview=true&forceShow=true', '_blank')}>
                  Open Preview in New Tab
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 