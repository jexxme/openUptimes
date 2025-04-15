"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Settings, Shield, Trash2, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

// Import settings section components
import { GeneralSettings } from "./settings/GeneralSettings";
import { SecuritySettings } from "./settings/SecuritySettings";
import { DebugSettings } from "./settings/DebugSettings";
import { ResetSettings } from "./settings/ResetSettings";

interface SettingsContentProps {
  activeSection?: string;
}

export function SettingsContent({ activeSection = "general" }: SettingsContentProps) {
  // Memoize section to tab mapping to prevent unnecessary recalculations  
  const sectionTabValue = useMemo(() => {
    return activeSection === "security" ? "security" : 
           activeSection === "debug" ? "debug" :
           activeSection === "reset" ? "reset" : "general";
  }, [activeSection]);
  
  // Current selected tab - use memoized value
  const [currentTab, setCurrentTab] = useState(sectionTabValue);
  
  // Shared state for general settings - cache loaded settings
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  
  // Track if each tab has been visited to avoid unnecessary loading animations
  const [tabsVisited, setTabsVisited] = useState<Record<string, boolean>>({
    general: currentTab === "general",
    security: currentTab === "security",
    debug: currentTab === "debug",
    reset: currentTab === "reset",
  });
  
  // Update current tab when activeSection changes
  useEffect(() => {
    setCurrentTab(sectionTabValue);
    // Mark this tab as visited
    setTabsVisited(prev => ({
      ...prev,
      [sectionTabValue]: true
    }));
  }, [sectionTabValue]);
  
  // Handle tab change with tab visit tracking
  const handleTabChange = useCallback((newTab: string) => {
    setCurrentTab(newTab);
    // Mark this tab as visited
    setTabsVisited(prev => ({
      ...prev,
      [newTab]: true
    }));
  }, []);
  
  // Fetch general settings only when needed (lazy loading)
  useEffect(() => {
    // Only fetch settings when the general tab is active and we don't have settings yet
    if (currentTab !== "general" || generalSettings !== null) return;
    
    async function fetchGeneralSettings() {
      setSettingsLoading(true);
      try {
        const response = await fetch('/api/settings/general');
        
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
  }, [currentTab, generalSettings]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="max-w-2xl mx-auto">
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span>Debug</span>
            </TabsTrigger>
            <TabsTrigger value="reset" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Reset</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <p className="mb-4 text-sm text-muted-foreground">Configure global settings</p>
            <GeneralSettings 
              initialSettings={generalSettings}
              isLoading={settingsLoading && tabsVisited.general}
              error={settingsError}
              onSettingsUpdate={(newSettings) => setGeneralSettings(newSettings)}
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
  );
} 