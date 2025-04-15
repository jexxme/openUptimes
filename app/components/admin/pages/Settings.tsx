"use client";

import { useState, useEffect } from "react";
import { SettingsContent } from "@/app/components/admin/SettingsContent";

interface AdminSettingsProps {
  setActiveTab?: (tab: string) => void;
}

export function AdminSettings({ setActiveTab }: AdminSettingsProps) {
  const [settingsSection, setSettingsSection] = useState("general");
  const [initialized, setInitialized] = useState(false);
  
  // Extract section from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
      setSettingsSection(section);
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
      if (section && section !== settingsSection) {
        setSettingsSection(section);
      }
    }
  }, [initialized, settingsSection]);
  
  return (
    <SettingsContent activeSection={settingsSection} />
  );
} 