"use client";

import { Home, Settings, Server, LogOut, ChevronRight, History, Globe, ExternalLink, Activity, Bug } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  isLoggingOut: boolean;
  preloadedLogoUrl?: string;
}

// NavButton component
const NavButton = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  disabled = false
}: { 
  icon: React.ElementType; 
  label: string; 
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant={isActive ? "secondary" : "ghost"}
    className={`
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

export function SidebarNav({ activeTab, setActiveTab, handleLogout, isLoggingOut, preloadedLogoUrl }: SidebarNavProps) {
  const [logoUrl, setLogoUrl] = useState(preloadedLogoUrl || "");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  
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
      };
      img.src = logoUrl;
    }
  }, [logoUrl]);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowDebug(true);
    }
  };

  // Helper function to handle navigation with sections
  const handleNavigation = (tab: string, section?: string) => {
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
      className="flex h-full flex-col bg-sidebar/90 backdrop-blur-md border-r border-sidebar-border/80"
    >
      <div className="flex h-16 items-center justify-center px-5 border-b border-sidebar-border/80 relative">
        <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sidebar-primary/20 to-transparent"></div>
        {logoUrl && imageLoaded ? (
          <div 
            className="flex items-center justify-center h-full py-2 w-full cursor-pointer"
            onClick={handleLogoClick}
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="max-h-full max-w-[140px] object-contain"
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
            <h2 className="text-lg font-semibold bg-gradient-to-r from-primary via-sidebar-primary to-primary bg-clip-text text-transparent tracking-tight">
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
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Server} 
              label="Services" 
              isActive={activeTab === "services"}
              onClick={() => handleNavigation("services")} 
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={Globe}
              label="Status Page" 
              isActive={activeTab === "statuspage"}
              onClick={() => handleNavigation("statuspage")} 
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <NavButton 
              icon={History} 
              label="History" 
              isActive={activeTab === "history"}
              onClick={() => handleNavigation("history")} 
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
            />
          </motion.div>
        </motion.div>
      </div>
      
      <div className="mt-auto border-t border-sidebar-border/80 p-4 space-y-3 bg-sidebar/95 relative">
        <div className="absolute left-0 top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sidebar-primary/20 to-transparent"></div>
        
        <Link href="/" target="_blank" rel="noopener noreferrer" className="w-full block">
          <Button 
            variant="outline"
            className="w-full justify-start bg-primary/5 hover:bg-primary/10 border-primary/10 hover:border-primary/20 transition-all duration-200 group rounded-md"
          >
            <div className="flex items-center w-full">
              <div className="flex items-center justify-center w-5 h-5 mr-2">
                <Globe className="h-[1.05rem] w-[1.05rem] text-primary transition-transform duration-300 ease-out" />
              </div>
              <span className="flex-1 text-left text-sm tracking-wide">Status Page</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 ease-out" />
            </div>
          </Button>
        </Link>
        
        <Button 
          variant="outline"
          className="w-full justify-start bg-destructive/5 hover:bg-destructive/10 border-destructive/10 hover:border-destructive/20 transition-all duration-200 group rounded-md"
          onClick={handleLogout}
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
    </motion.div>
  );
} 