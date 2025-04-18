"use client";

import { ApplicationTabs } from "@/app/components/ui/application-tabs";
import { Globe, Layout, Palette, Sliders } from "lucide-react";

interface StatusPageTabsProps {
  currentTab: string;
  hasGeneralTabChanges: boolean;
  hasServicesTabChanges: boolean;
  hasAppearanceTabChanges: boolean;
  hasAdvancedTabChanges: boolean;
  onTabChange?: (value: string) => void;
  variant?: "default" | "outline";
}

export function StatusPageTabs({
  currentTab,
  hasGeneralTabChanges,
  hasServicesTabChanges,
  hasAppearanceTabChanges,
  hasAdvancedTabChanges,
  onTabChange,
  variant = "default"
}: StatusPageTabsProps) {
  // This will be called when a tab is clicked
  const handleTabChange = (value: string) => {
    console.log("StatusPageTabs: Tab clicked", value, "current tab:", currentTab);
    console.log("onTabChange function exists:", !!onTabChange);
    if (onTabChange) {
      console.log("Calling onTabChange with value:", value);
      onTabChange(value);
    }
  };

  const tabs = [
    {
      value: "general",
      icon: <Globe className="h-4 w-4" />,
      label: "General",
      hasChanges: hasGeneralTabChanges
    },
    {
      value: "services",
      icon: <Layout className="h-4 w-4" />,
      label: "Services",
      hasChanges: hasServicesTabChanges
    },
    {
      value: "appearance",
      icon: <Palette className="h-4 w-4" />,
      label: "Appearance",
      hasChanges: hasAppearanceTabChanges
    },
    {
      value: "advanced",
      icon: <Sliders className="h-4 w-4" />,
      label: "Advanced",
      hasChanges: hasAdvancedTabChanges
    }
  ];

  return (
    <ApplicationTabs 
      tabs={tabs} 
      value={currentTab} 
      onValueChange={handleTabChange}
      variant={variant}
      spacing="equal"
      className="w-full"
    />
  );
} 