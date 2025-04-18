"use client";

import { useState, useEffect } from "react";
import { AboutContent } from "@/app/components/admin/AboutContent";

interface AdminAboutProps {
  setActiveTab?: (tab: string) => void;
}

export function AdminAbout({ setActiveTab }: AdminAboutProps) {
  const [aboutSection, setAboutSection] = useState("about");
  const [initialized, setInitialized] = useState(false);
  
  // Extract section from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
      setAboutSection(section);
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
      if (section && section !== aboutSection) {
        setAboutSection(section);
      }
    }
  }, [initialized, aboutSection]);
  
  return (
    <AboutContent activeSection={aboutSection} />
  );
} 