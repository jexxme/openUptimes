"use client";

import { Home, Settings, Server, LogOut, ChevronRight, History, Globe } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";

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
      justify-start w-full text-left mb-1 
      transition-all duration-200 ease-in-out 
      ${isActive ? "pl-4 font-medium" : "pl-3"}
      group relative overflow-hidden
    `}
    onClick={onClick}
    disabled={disabled}
  >
    <div className="flex items-center w-full">
      <Icon className={`
        h-4 w-4 mr-3 
        transition-all duration-200 ease-in-out
        ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}
      `} />
      <span>{label}</span>
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
  const [isLoading, setIsLoading] = useState(!preloadedLogoUrl);
  const [imageLoaded, setImageLoaded] = useState(!!preloadedLogoUrl);

  // Only fetch logo URL if not provided via props
  useEffect(() => {
    if (preloadedLogoUrl) return;
    
    async function fetchLogoUrl() {
      try {
        const response = await fetch('/api/settings/appearance');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setLogoUrl(data.logoUrl || "");
      } catch (err) {
        console.error("Failed to fetch logo:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLogoUrl();
  }, [preloadedLogoUrl]);

  // Preload the image only if not already preloaded
  useEffect(() => {
    if (preloadedLogoUrl || !logoUrl || imageLoaded) return;
    
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);
    img.src = logoUrl;
  }, [logoUrl, imageLoaded, preloadedLogoUrl]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4 border-b">
        {logoUrl && imageLoaded ? (
          <div className="flex items-center h-full py-2">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="max-h-full max-w-[140px] object-contain"
            />
          </div>
        ) : (
          <h2 className="text-lg font-semibold">OpenUptimes</h2>
        )}
      </div>
      <div className="flex-1 overflow-auto py-4 px-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2 ml-3">Dashboard</div>
          <NavButton 
            icon={Home} 
            label="Overview" 
            isActive={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")}
          />
          <NavButton 
            icon={Server} 
            label="Services" 
            isActive={activeTab === "services"}
            onClick={() => setActiveTab("services")} 
          />
          <NavButton 
            icon={Globe}
            label="Status Page" 
            isActive={activeTab === "statuspage"}
            onClick={() => setActiveTab("statuspage")} 
          />
          <NavButton 
            icon={History} 
            label="History" 
            isActive={activeTab === "history"}
            onClick={() => setActiveTab("history")} 
          />
        </div>
        
        <div className="mt-6 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2 ml-3">Admin</div>
          <NavButton 
            icon={Settings} 
            label="Settings" 
            isActive={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </div>
      <div className="mt-auto border-t p-3 space-y-2">
        <Link href="/" className="w-full block">
          <NavButton 
            icon={Home}
            label="Dashboard"
          />
        </Link>
        <NavButton 
          icon={LogOut}
          label={isLoggingOut ? "Logging out..." : "Logout"}
          onClick={handleLogout}
          disabled={isLoggingOut}
        />
      </div>
    </div>
  );
} 