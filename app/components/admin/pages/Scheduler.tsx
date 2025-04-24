"use client";

import { useState, useEffect } from "react";
import { Github, Clock, Calendar } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { GitHubActionsPage } from "./GitHubActions";
import { CronJobPage } from "./CronJobs";
import { ApplicationTabs } from "@/components/ui/application-tabs";

interface SchedulerPageProps {
  setActiveTab?: (tab: string) => void;
  registerUnsavedChangesCallback?: (key: string, callback: () => boolean) => void;
  preloadedData?: {
    githubSettings?: {
      githubAction?: any;
      apiKey?: string;
    };
  };
}

export function SchedulerPage({
  setActiveTab,
  registerUnsavedChangesCallback,
  preloadedData
}: SchedulerPageProps) {
  const [currentTab, setCurrentTab] = useState("github");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Load tab from URL query params if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section');
      
      if (section && ['github', 'cron'].includes(section)) {
        setCurrentTab(section);
      }
    }
  }, []);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    
    // Update URL with the new section
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', value);
      window.history.pushState({}, '', url.toString());
    }
  };
  
  // Register unsaved changes tracker that works with all sub-tabs
  const hasUnsavedChanges = () => {
    return unsavedChanges;
  };
  
  // Register with parent
  useEffect(() => {
    if (registerUnsavedChangesCallback) {
      registerUnsavedChangesCallback('scheduler', hasUnsavedChanges);
    }
  }, [registerUnsavedChangesCallback, unsavedChanges]);
  
  // Set up child callback for tracking changes in child components
  const handleChildChanges = (hasChanges: boolean) => {
    setUnsavedChanges(hasChanges);
  };
  
  // Register child callback
  const childRegisterCallback = (key: string, callback: () => boolean) => {
    // This is just a reference to pass down to child components
    return callback;
  };
  
  // Listen for changes in child components
  useEffect(() => {
    // Dictionary to store all callback references
    const callbacksToCheck: Record<string, () => boolean> = {};
    
    // Create a wrapper function for child components to register their callbacks
    const registerChildCallback = (key: string, callback: () => boolean) => {
      callbacksToCheck[key] = callback;
      return callback;
    };
    
    // Redefine the childRegisterCallback to use this local callback registry
    // This avoids the ESLint warning about useEffect inside callback
    (childRegisterCallback as any).current = registerChildCallback;
    
    // Check for changes periodically
    const interval = setInterval(() => {
      // Check all registered callbacks
      let anyChanges = false;
      
      for (const key in callbacksToCheck) {
        if (callbacksToCheck[key] && callbacksToCheck[key]()) {
          anyChanges = true;
          break;
        }
      }
      
      setUnsavedChanges(anyChanges);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Define tabs for the ApplicationTabs component
  const tabs = [
    {
      value: "github",
      label: "GitHub Actions",
      icon: <Github className="h-4 w-4" />,
      hasChanges: currentTab === "github" && unsavedChanges
    },
    {
      value: "cron",
      label: "Cron Jobs",
      icon: <Calendar className="h-4 w-4" />,
      hasChanges: currentTab === "cron" && unsavedChanges
    }
  ];
  
  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <ApplicationTabs 
          tabs={tabs}
          value={currentTab}
          onValueChange={handleTabChange}
        />
        
        <TabsContent value="github" className="space-y-4">
          <GitHubActionsPage
            setActiveTab={setActiveTab}
            registerUnsavedChangesCallback={childRegisterCallback}
            preloadedData={preloadedData}
          />
        </TabsContent>
        
        <TabsContent value="cron" className="space-y-4">
          <CronJobPage
            setActiveTab={setActiveTab}
            registerUnsavedChangesCallback={childRegisterCallback}
            preloadedData={preloadedData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 