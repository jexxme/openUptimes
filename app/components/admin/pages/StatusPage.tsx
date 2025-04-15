"use client";

import { useState, useEffect } from "react";
import { StatusPageContent } from "@/app/components/admin/StatusPageContent";

interface AdminStatusPageProps {
  preloadedStatusPageData?: any;
  preloadedAppearanceData?: any;
}

export function AdminStatusPage({
  preloadedStatusPageData,
  preloadedAppearanceData
}: AdminStatusPageProps) {
  const [statusPageSection, setStatusPageSection] = useState("general");
  const [initialized, setInitialized] = useState(false);
  
  // Store the preloaded data in state to prevent it from being lost on re-renders
  const [cachedStatusPageData] = useState(preloadedStatusPageData);
  const [cachedAppearanceData] = useState(preloadedAppearanceData);
  
  // Extract section from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
      setStatusPageSection(section);
    }
    
    // Mark as initialized after first render
    setInitialized(true);
  }, []);
  
  // Handle direct section navigation via URL
  useEffect(() => {
    if (initialized) {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section');
      
      // Only update if the section has changed from the URL
      if (section && section !== statusPageSection) {
        setStatusPageSection(section);
      }
    }
  }, [initialized, statusPageSection]);
  
  return (
    <StatusPageContent 
      activeSection={statusPageSection}
      preloadedStatusPageData={cachedStatusPageData}
      preloadedAppearanceData={cachedAppearanceData}
    />
  );
}