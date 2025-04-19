"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Settings, Shield, Trash2, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ApplicationTabs } from "@/app/components/ui/application-tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/app/components/ui/dialog";

// Import settings section components
import { GeneralSettings } from "./settings/GeneralSettings";
import { SecuritySettings } from "./settings/SecuritySettings";
import { DebugSettings } from "./settings/DebugSettings";
import { ResetSettings } from "./settings/ResetSettings";

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

interface SettingTabsProps {
  currentTab: string;
  onTabChange: (value: string) => void;
  tabsWithChanges: Record<string, boolean>;
}

function SettingsTabs({ currentTab, onTabChange, tabsWithChanges }: SettingTabsProps) {
  const tabs = [
    {
      value: "general",
      icon: <Settings className="h-4 w-4" />,
      label: "General",
      hasChanges: tabsWithChanges.general || false
    },
    {
      value: "security",
      icon: <Shield className="h-4 w-4" />,
      label: "Security",
      hasChanges: tabsWithChanges.security || false
    },
    {
      value: "debug",
      icon: <Bug className="h-4 w-4" />,
      label: "Debug",
      hasChanges: tabsWithChanges.debug || false
    },
    {
      value: "reset",
      icon: <Trash2 className="h-4 w-4" />,
      label: "Reset",
      hasChanges: tabsWithChanges.reset || false
    }
  ];

  return (
    <ApplicationTabs 
      tabs={tabs} 
      value={currentTab} 
      onValueChange={onTabChange}
      variant="outline"
      spacing="equal"
      className="w-full"
    />
  );
}

interface SettingsContentProps {
  activeSection?: string;
  registerUnsavedChangesCallback?: (key: string, callback: () => boolean) => void;
  preloadedData?: {
    generalSettings?: any;
  };
}

export function SettingsContent({ 
  activeSection = "general", 
  registerUnsavedChangesCallback, 
  preloadedData 
}: SettingsContentProps) {
  // Memoize section to tab mapping to prevent unnecessary recalculations  
  const sectionTabValue = useMemo(() => {
    return activeSection === "security" ? "security" : 
           activeSection === "debug" ? "debug" :
           activeSection === "reset" ? "reset" : "general";
  }, [activeSection]);
  
  // Current selected tab - use memoized value
  const [currentTab, setCurrentTab] = useState(sectionTabValue);
  
  // Shared state for general settings - cache loaded settings
  const [generalSettings, setGeneralSettings] = useState<any>(preloadedData?.generalSettings || null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  
  // Track if each tab has been visited to avoid unnecessary loading animations
  const [tabsVisited, setTabsVisited] = useState<Record<string, boolean>>({
    general: currentTab === "general",
    security: currentTab === "security",
    debug: currentTab === "debug",
    reset: currentTab === "reset",
  });
  
  // Track which tabs have unsaved changes
  const [tabsWithChanges, setTabsWithChanges] = useState<Record<string, boolean>>({
    general: false,
    security: false,
    debug: false,
    reset: false,
  });

  // Dialog state management
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
  const pendingNavigationRef = useRef<{ destination: string } | null>(null);
  
  // Callback function to update the unsaved changes state for a specific tab
  const handleUnsavedChangesChange = useCallback((tabName: string, hasChanges: boolean) => {
    setTabsWithChanges(prev => {
      // Only update if the value is actually changing to avoid unnecessary rerenders
      if (prev[tabName] === hasChanges) return prev;
      return {
        ...prev,
        [tabName]: hasChanges
      };
    });
  }, []);
  
  // Handle tab change with custom dialog
  const attemptTabChange = useCallback((newTab: string) => {
    if (tabsWithChanges[currentTab]) {
      pendingNavigationRef.current = { destination: newTab };
      setUnsavedChangesDialogOpen(true);
    } else {
      completeTabChange(newTab);
    }
  }, [currentTab, tabsWithChanges]);

  // Complete the tab change after confirmation
  const completeTabChange = useCallback((newTab: string) => {
    setCurrentTab(newTab);
    // Mark this tab as visited
    setTabsVisited(prev => ({
      ...prev,
      [newTab]: true
    }));
  }, []);

  // Dialog handlers
  const handleDialogClose = useCallback(() => {
    setUnsavedChangesDialogOpen(false);
    pendingNavigationRef.current = null;
  }, []);

  const handleDialogConfirm = useCallback(() => {
    if (pendingNavigationRef.current) {
      // Clear the unsaved changes for the current tab before navigating
      handleUnsavedChangesChange(currentTab, false);
      
      completeTabChange(pendingNavigationRef.current.destination);
      pendingNavigationRef.current = null;
    }
    setUnsavedChangesDialogOpen(false);
  }, [completeTabChange, currentTab, handleUnsavedChangesChange]);
  
  // Update current tab when activeSection changes
  useEffect(() => {
    if (currentTab !== sectionTabValue) {
      // Check if there are unsaved changes before switching tabs
      if (tabsWithChanges[currentTab]) {
        pendingNavigationRef.current = { destination: sectionTabValue };
        setUnsavedChangesDialogOpen(true);
      } else {
        completeTabChange(sectionTabValue);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTabValue]); // Removed currentTab and tabsWithChanges from dependencies
  
  // Fetch general settings only when needed (lazy loading)
  useEffect(() => {
    // If preloaded data is available, skip fetching
    if (preloadedData?.generalSettings || generalSettings !== null) return;
    
    // Only fetch settings when the general tab is active and we don't have settings yet
    if (currentTab !== "general") return;
    
    async function fetchGeneralSettings() {
      setSettingsLoading(true);
      try {
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setGeneralSettings(data);
        setSettingsError(null);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setSettingsError("Failed to load settings. Please refresh the page.");
      } finally {
        setSettingsLoading(false);
      }
    }
    
    fetchGeneralSettings();
  }, [currentTab, generalSettings, preloadedData]);
  
  // Memoized function to check if any tab has unsaved changes
  const hasAnyUnsavedChanges = useMemo(() => {
    return Object.values(tabsWithChanges).some(Boolean);
  }, [tabsWithChanges]);

  // Setup beforeunload event to prompt user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedChanges) {
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
  }, [hasAnyUnsavedChanges]);

  // Modify page title to indicate unsaved changes
  useEffect(() => {
    const originalTitle = document.title.replace(/^\* /, ''); // Remove existing asterisk if present
    
    if (hasAnyUnsavedChanges) {
      document.title = "* " + originalTitle;
    } else {
      document.title = originalTitle;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [hasAnyUnsavedChanges]);

  // Add "leave confirmation" dialog for navigation links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Skip if no unsaved changes
      if (!hasAnyUnsavedChanges) {
        return;
      }
      
      const target = e.target as HTMLElement;
      const isNavigationLink = 
        target.tagName === 'A' || 
        target.closest('a') || 
        target.classList.contains('sidebar-item') || 
        target.closest('.sidebar-item');
      
      if (isNavigationLink) {
        e.preventDefault();
        e.stopPropagation();
        
        // Store the href for later use
        const linkElement = target.tagName === 'A' ? target : target.closest('a');
        if (linkElement instanceof HTMLAnchorElement) {
          const url = linkElement.href;
          pendingNavigationRef.current = { destination: url };
          
          // Show custom dialog
          setUnsavedChangesDialogOpen(true);
        }
      }
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasAnyUnsavedChanges]);

  // Register the hasAnyUnsavedChanges function with parent component
  useEffect(() => {
    if (registerUnsavedChangesCallback) {
      // Create a proper callback function that returns the current state of hasAnyUnsavedChanges
      const checkForUnsavedChanges = () => {
        // Add an explicit check to prevent false positives
        const hasChanges = hasAnyUnsavedChanges;
        console.log('[Settings] Checking for unsaved changes:', hasChanges);
        return hasChanges;
      };
      
      // Register the callback
      registerUnsavedChangesCallback('settings', checkForUnsavedChanges);
      
      // Return cleanup function to unregister when component unmounts
      return () => {
        if (registerUnsavedChangesCallback) {
          // Use an empty function that always returns false to clear the callback
          registerUnsavedChangesCallback('settings', () => false);
        }
      };
    }
  }, [registerUnsavedChangesCallback, hasAnyUnsavedChanges]);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="max-w-2xl mx-auto">
          <Tabs value={currentTab} onValueChange={attemptTabChange}>
            <SettingsTabs 
              currentTab={currentTab} 
              onTabChange={attemptTabChange} 
              tabsWithChanges={tabsWithChanges}
            />
            
            <TabsContent value="general">
              <p className="mb-4 text-sm text-muted-foreground">Configure global settings</p>
              <GeneralSettings 
                initialSettings={generalSettings || preloadedData?.generalSettings || null}
                isLoading={!preloadedData?.generalSettings && settingsLoading && tabsVisited.general}
                error={settingsError}
                onSettingsUpdate={(newSettings) => {
                  setGeneralSettings(newSettings);
                  // Clear unsaved changes indicator for this tab after successful save
                  handleUnsavedChangesChange("general", false);
                }}
                onUnsavedChangesChange={(hasChanges) => handleUnsavedChangesChange("general", hasChanges)}
              />
            </TabsContent>
            
            <TabsContent value="security">
              <p className="mb-4 text-sm text-muted-foreground">Manage admin password and authentication</p>
              <SecuritySettings />
            </TabsContent>
            
            <TabsContent value="debug">
              <p className="mb-4 text-sm text-muted-foreground">Access system diagnostic tools</p>
              <DebugSettings />
            </TabsContent>
            
            <TabsContent value="reset">
              <p className="mb-4 text-sm text-muted-foreground">Reset OpenUptimes to its initial state</p>
              <ResetSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Custom unsaved changes dialog */}
      <UnsavedChangesDialog 
        open={unsavedChangesDialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
      />
    </>
  );
} 