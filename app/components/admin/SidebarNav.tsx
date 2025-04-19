"use client";

import { Home, Settings, Server, LogOut, ChevronRight, History, Globe, ExternalLink, Activity, Bug, Moon, Sun, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  isLoggingOut: boolean;
  preloadedLogoUrl?: string;
  hasUnsavedChanges?: () => boolean;
  clearUnsavedChangesCallback?: (key?: string) => void;
}

// NavButton component
const NavButton = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  disabled = false,
  tab
}: { 
  icon: React.ElementType; 
  label: string; 
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tab?: string;
}) => (
  <Button
    variant={isActive ? "secondary" : "ghost"}
    className={`
      sidebar-nav-button
      justify-start w-full text-left mb-1.5 
      transition-all duration-200 ease-out
      ${isActive 
        ? "pl-4 font-medium text-foreground"
        : "pl-3 text-muted-foreground hover:text-foreground"
      }
      group relative overflow-hidden rounded-md
      hover:bg-primary/5 focus-visible:ring-1 focus-visible:ring-primary/20
      active:scale-[0.99]
      ${disabled ? 'opacity-50' : ''}
    `}
    onClick={onClick}
    disabled={disabled}
    data-tab={tab}
  >
    <div className="flex items-center w-full py-0.5">
      <div className={`
        flex items-center justify-center w-5 h-5 mr-3 
        transition-all duration-200 ease-out
        ${isActive 
          ? "text-primary" 
          : "text-muted-foreground/70 group-hover:text-foreground/90"}
      `}>
        <Icon className="h-[1.05rem] w-[1.05rem]" />
      </div>
      
      <span className="transition-all duration-200 tracking-wide text-sm">
        {label}
      </span>
      
      {isActive && (
        <ChevronRight className="h-4 w-4 ml-auto opacity-70" />
      )}
    </div>
    
    {isActive && (
      <div className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
    )}
  </Button>
);

export function SidebarNav({ activeTab, setActiveTab, handleLogout, isLoggingOut, preloadedLogoUrl, hasUnsavedChanges = () => false, clearUnsavedChangesCallback }: SidebarNavProps) {
  const [logoUrl, setLogoUrl] = useState(preloadedLogoUrl || "");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [invertLogo, setInvertLogo] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPreference = localStorage.getItem("openuptimes-logo-invert");
      return savedPreference !== null ? savedPreference === "true" : true;
    }
    return true; // Default to true
  });
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  // Unsaved changes dialog state
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
  const pendingNavigationRef = useRef<{ tab: string, section?: string } | null>(null);
  
  // Add a flag to track if we just handled a dialog confirmation
  const [recentlyNavigated, setRecentlyNavigated] = useState(false);
  
  // Add a ref to track if we're currently processing a dialog action
  const processingDialogActionRef = useRef(false);
  
  // Detect development environment
  useEffect(() => {
    // Check if we're in development mode
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);
  
  // Load logo if not preloaded
  useEffect(() => {
    async function loadLogo() {
      if (!logoUrl) {
        try {
          const response = await fetch('/api/settings/appearance');
          if (response.ok) {
            const data = await response.json();
            if (data.logoUrl) {
              setLogoUrl(data.logoUrl);
            }
          }
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }
    }
    
    loadLogo();
  }, [logoUrl]);
  
  // Handle image loading
  useEffect(() => {
    if (logoUrl) {
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        
        // Only attempt to analyze SVGs
        if (logoUrl.endsWith('.svg')) {
          analyzeSvgDarkness(logoUrl);
        }
      };
      img.src = logoUrl;
    }
  }, [logoUrl]);

  // Analyze SVG to determine if it's dark-dominant
  const analyzeSvgDarkness = async (svgUrl: string) => {
    try {
      const response = await fetch(svgUrl);
      if (response.ok) {
        const svgText = await response.text();
        
        // Simple heuristic: check for dark colors in fill/stroke attributes
        const darkColorPattern = /(fill|stroke)="(#0|#1|#2|#3|black|rgb\(0,|rgb\(1[0-9]|rgb\(2[0-5]|rgba\(0,|rgba\(1[0-9]|rgba\(2[0-5])/g;
        const lightColorPattern = /(fill|stroke)="(#[d-f]|#[D-F]|white|rgb\(2[2-5][0-9]|rgb\(25[0-5]|rgba\(2[2-5][0-9]|rgba\(25[0-5])/g;
        
        const darkMatches = (svgText.match(darkColorPattern) || []).length;
        const lightMatches = (svgText.match(lightColorPattern) || []).length;
        
        // If there are significantly more dark colors than light colors, set invertLogo to true
        if (darkMatches > lightMatches * 1.5) {
          setInvertLogo(true);
          localStorage.setItem("openuptimes-logo-invert", "true");
        }
      }
    } catch (error) {
      console.error('Error analyzing SVG:', error);
    }
  };

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowDebug(true);
    }
  };

  const handleLogoContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDarkMode) {
      const newInvertValue = !invertLogo;
      setInvertLogo(newInvertValue);
      localStorage.setItem("openuptimes-logo-invert", newInvertValue.toString());
    }
  };

  // Dialog handlers
  const handleDialogClose = () => {
    setUnsavedChangesDialogOpen(false);
    pendingNavigationRef.current = null;
    // Reset the processing flag after a short delay
    setTimeout(() => {
      processingDialogActionRef.current = false;
    }, 100);
  };

  const handleDialogConfirm = () => {
    if (pendingNavigationRef.current) {
      const { tab, section } = pendingNavigationRef.current;
      
      // Clear any registered callbacks to prevent further checks
      if (clearUnsavedChangesCallback) {
        // Clear all callbacks at once by not providing a key
        clearUnsavedChangesCallback();
      }
      
      // Set the flag to prevent showing the dialog again immediately
      setRecentlyNavigated(true);
      
      completeNavigation(tab, section);
      pendingNavigationRef.current = null;
    }
    setUnsavedChangesDialogOpen(false);
    
    // Reset the processing flag after a short delay
    setTimeout(() => {
      processingDialogActionRef.current = false;
    }, 100);
  };

  // Add useEffect to reset dialog state when activeTab changes
  useEffect(() => {
    // Reset dialog state when tab changes
    setUnsavedChangesDialogOpen(false);
    pendingNavigationRef.current = null;
    processingDialogActionRef.current = false;
    setRecentlyNavigated(false);
  }, [activeTab]);

  // Update the completeNavigation function with try/catch for better error handling
  const completeNavigation = (tab: string, section?: string) => {
    try {
      // Special case for logout
      if (tab === "logout") {
        handleLogout();
        return;
      }

      setActiveTab(tab);
      
      // Update URL with the new tab and optional section
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        
        if (section) {
          url.searchParams.set('section', section);
        } else {
          url.searchParams.delete('section');
        }
        
        window.history.pushState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error during navigation:', error);
      // Reset all dialog state in case of error
      setUnsavedChangesDialogOpen(false);
      pendingNavigationRef.current = null;
      processingDialogActionRef.current = false;
      setRecentlyNavigated(false);
    }
  };

  // Helper function to handle navigation with sections
  const handleNavigation = (tab: string, section?: string) => {
    // If we're already processing a dialog action, don't show another dialog
    if (processingDialogActionRef.current) {
      return;
    }
    
    // If we just navigated, don't show the dialog again
    if (recentlyNavigated) {
      setRecentlyNavigated(false);
      completeNavigation(tab, section);
      return;
    }
    
    // Check if there are unsaved changes
    if (hasUnsavedChanges()) {
      pendingNavigationRef.current = { tab, section };
      processingDialogActionRef.current = true;
      setUnsavedChangesDialogOpen(true);
    } else {
      completeNavigation(tab, section);
    }
  };

  // Subtle fade in animation for sections
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.03
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex h-full w-full flex-col bg-sidebar/90 backdrop-blur-md border-r border-sidebar-border/80"
    >
      <div className="flex h-16 items-center justify-center px-5 border-b border-sidebar-border/80 relative">
        <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sidebar-primary/20 to-transparent"></div>
        {logoUrl && imageLoaded ? (
          <div 
            className="flex items-center justify-center h-full py-2 w-full cursor-pointer relative group"
            onClick={handleLogoClick}
            onContextMenu={handleLogoContextMenu}
            title={isDarkMode ? "Right-click to toggle logo inversion" : ""}
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              className={`max-h-full max-w-[140px] object-contain transition-opacity duration-150 ${
                isDarkMode && invertLogo ? "logo-dark-mode" : ""
              }`}
            />
          </div>
        ) : (
          <div 
            className="flex items-center cursor-pointer"
            onClick={handleLogoClick}
          >
            <img 
              src="/default-favicon.svg" 
              alt="OpenUptimes" 
              className="w-5 h-5 mr-2"
            />
            <h2 className={`text-lg font-semibold tracking-tight ${
              isDarkMode 
                ? "text-foreground" 
                : "bg-gradient-to-r from-primary via-sidebar-primary to-primary bg-clip-text text-transparent"
            }`}>
              OpenUptimes
            </h2>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto py-5 px-4 scrollbar-thin scrollbar-thumb-sidebar-border/50 scrollbar-track-transparent hover:scrollbar-thumb-sidebar-border/70">
        <motion.div 
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1"
        >
          <motion.div 
            variants={itemVariants}
            className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3 ml-3 flex items-center"
          >
            <span className="pr-2 opacity-80">Dashboard</span>
            <div className="flex-grow h-px bg-sidebar-border/30"></div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Home} 
              label="Overview" 
              isActive={activeTab === "dashboard"} 
              onClick={() => handleNavigation("dashboard")}
              tab="dashboard"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Server} 
              label="Services" 
              isActive={activeTab === "services"}
              onClick={() => handleNavigation("services")} 
              tab="services"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Globe}
              label="Status Page" 
              isActive={activeTab === "statuspage"}
              onClick={() => handleNavigation("statuspage")} 
              tab="statuspage"
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={History} 
              label="History" 
              isActive={activeTab === "history"}
              onClick={() => handleNavigation("history")} 
              tab="history"
            />
          </motion.div>
        </motion.div>
        
        <motion.div 
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="mt-8 space-y-1"
        >
          <motion.div 
            variants={itemVariants}
            className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3 ml-3 flex items-center"
          >
            <span className="pr-2 opacity-80">Admin</span>
            <div className="flex-grow h-px bg-sidebar-border/30"></div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Settings} 
              label="Settings" 
              isActive={activeTab === "settings"} 
              onClick={() => handleNavigation("settings")}
              tab="settings"
            />
          </motion.div>
        </motion.div>
      </div>
      
      <div className="mt-auto border-t border-sidebar-border/80 p-4 space-y-3 bg-sidebar/95 relative">
        <div className="absolute left-0 top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sidebar-primary/20 to-transparent"></div>
        
        <motion.div 
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-between items-center mb-3"
        >
          <div className="flex items-center space-x-2">
            <Switch
              checked={isDarkMode}
              onCheckedChange={toggleTheme}
              className={isDarkMode ? "data-[state=checked]:bg-sidebar-primary/70" : ""}
              aria-label="Toggle dark mode"
            />
            <span className="text-sm text-muted-foreground">
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-sidebar-primary/80" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground/70" />
              )}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-muted-foreground hover:text-foreground group sidebar-nav-button"
            onClick={() => handleNavigation("about")}
            data-tab="about"
          >
            <Info className="h-3.5 w-3.5 mr-1.5 group-hover:text-primary transition-colors" />
            <span className="text-sm">About</span>
          </Button>
        </motion.div>
        
        <Link 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-full block"
          onClick={(e) => {
            // No need to check for unsaved changes for external links
            // that open in a new tab
          }}
        >
          <Button 
            variant="outline"
            className="w-full justify-start bg-primary/5 hover:bg-primary/10 border-primary/10 hover:border-primary/20 transition-all duration-200 group rounded-md sidebar-nav-button"
          >
            <div className="flex items-center w-full">
              <div className="flex items-center justify-center w-5 h-5 mr-2">
                <Globe className="h-[1.05rem] w-[1.05rem] text-primary transition-transform duration-300 ease-out" />
              </div>
              <span className="flex-1 text-left text-sm tracking-wide">Public Status Page</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 ease-out" />
            </div>
          </Button>
        </Link>
        
        <Button 
          variant="outline"
          className="w-full justify-start bg-destructive/5 hover:bg-destructive/10 border-destructive/10 hover:border-destructive/20 transition-all duration-200 group rounded-md sidebar-nav-button"
          onClick={() => {
            if (hasUnsavedChanges()) {
              // Create a specific dialog for logout
              pendingNavigationRef.current = { tab: "logout" };
              setUnsavedChangesDialogOpen(true);
            } else {
              handleLogout();
            }
          }}
          disabled={isLoggingOut}
        >
          <div className="flex items-center w-full">
            <div className="flex items-center justify-center w-5 h-5 mr-2">
              <LogOut className="h-[1.05rem] w-[1.05rem] text-destructive transition-transform duration-200 ease-out" />
            </div>
            <span className="text-sm tracking-wide">{isLoggingOut ? (
              <span className="inline-flex items-center">
                <span>Logging out</span>
                <span className="ml-1 opacity-70">...</span>
              </span>
            ) : "Logout"}</span>
          </div>
        </Button>
      </div>
      
      {/* Conditionally render unsaved changes dialog */}
      {unsavedChangesDialogOpen && !processingDialogActionRef.current && (
        <Dialog 
          key={`dialog-${Date.now()}`} // Ensure a new instance on each render
          open={unsavedChangesDialogOpen} 
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleDialogClose();
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to leave?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDialogConfirm}>
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
} 